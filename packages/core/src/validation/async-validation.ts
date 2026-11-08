import type { RuntimeAsyncValidation } from '../definitions/async-validation-options'
import type { ErrorInput, ValidateResult } from '../errors/form-error'
import type { FormRuntime } from '../form/form-runtime'
import type { FormState } from '../state/form-state'
import type { Scope } from './scopes'

import { ASYNC_TRIGGER } from '../definitions/async-validation-options'
import { definitionAt } from '../definitions/definition-at'
import { sharedOptionsOf } from '../definitions/runtime-options'
import { isSyncErrorSource, toErrorInputs } from '../errors/form-error'
import { emitCheckEnd, emitCheckFail, emitNodeEvent, FORM_EVENT } from '../form/form-events'
import { commitState } from '../form/form-runtime'
import { deepEqual } from '../paths/equality'
import { isWithinPath } from '../paths/path'
import { withCheckErrors, withFailedCheck, withoutPendingChecks, withPendingCheck } from '../state/check-transitions'
import { hasPathWithin } from '../state/collections'
import { CHECK_STATUS } from '../state/form-state'
import { buildOutput } from './output'
import { activeErrors } from './visibility'

const RUN_STATUS = {
  idle: 'idle',
  stale: 'stale',
  scheduled: 'scheduled',
  running: 'running',
  blocked: 'blocked',
} as const

type RunStatus = (typeof RUN_STATUS)[keyof typeof RUN_STATUS]

export interface CheckEntry {
  status: RunStatus
  output: unknown
  deps: unknown
  timer: ReturnType<typeof setTimeout> | undefined
  controller: AbortController | undefined
  running: Promise<void> | undefined
}

export function reconcileChecks(runtime: FormRuntime, state: FormState, scopes: ReadonlyArray<Scope>): FormState {
  let next = pruneChecks(runtime, state, scopes)
  for (const scope of scopes) {
    const options = sharedOptionsOf(scope.definition).validateAsync
    if (options != undefined) {
      next = reconcileCheck({ runtime, state: next, scope, options })
    }
  }
  return next
}

export function scheduleBlurChecks(runtime: FormRuntime, state: FormState, nodeId: string): FormState {
  let next = state
  for (const [ownerId, entry] of runtime.checkEntries) {
    const options = checkOptionsAt(runtime, ownerId)
    if (options?.on == ASYNC_TRIGGER.blur && isWithinPath(nodeId, ownerId) && awaitsTrigger(next, ownerId, entry)) {
      scheduleRun({ runtime, ownerId, entry, debounceMs: options.debounceMs })
      next = withPendingCheck(next, ownerId)
    }
  }
  return next
}

export function markSettledChecksStaleWithin(runtime: FormRuntime, nodeId: string): void {
  for (const [ownerId, entry] of runtime.checkEntries) {
    if (entry.status == RUN_STATUS.idle && isWithinPath(ownerId, nodeId)) {
      entry.status = RUN_STATUS.stale
    }
  }
}

export function startChecksWithin(runtime: FormRuntime, nodeId: string): Array<Promise<void>> {
  return [...runtime.checkEntries]
    .filter(([ownerId]) => isWithinPath(ownerId, nodeId))
    .map(([ownerId, entry]) => {
      if (entry.status == RUN_STATUS.stale || entry.status == RUN_STATUS.scheduled) {
        return startRun(runtime, ownerId, entry)
      }
      return entry.running
    })
    .filter(running => running != undefined)
}

export function disposeChecks(runtime: FormRuntime): void {
  for (const entry of runtime.checkEntries.values()) {
    if (entry.status == RUN_STATUS.scheduled || entry.status == RUN_STATUS.running) {
      entry.status = RUN_STATUS.stale
    }
    cancelEntry(entry)
  }
  commitState(runtime, withoutPendingChecks(runtime.state))
}

export function forgetChecksWithin(runtime: FormRuntime, nodeId: string): void {
  for (const [ownerId, entry] of runtime.checkEntries) {
    if (isWithinPath(ownerId, nodeId)) {
      cancelEntry(entry)
      runtime.checkEntries.delete(ownerId)
    }
  }
}

interface CheckReconciliation {
  readonly runtime: FormRuntime
  readonly state: FormState
  readonly scope: Scope
  readonly options: RuntimeAsyncValidation
}

function reconcileCheck({ runtime, state, scope, options }: CheckReconciliation): FormState {
  const ownerId = scope.nodeId
  const existing = runtime.checkEntries.get(ownerId)
  const entry = existing ?? createEntry()
  runtime.checkEntries.set(ownerId, entry)
  if (!isSyncSettledAndValid(state, ownerId)) {
    if (entry.status == RUN_STATUS.blocked) {
      return state
    }
    abortCheck(runtime, ownerId, entry)
    entry.status = RUN_STATUS.blocked
    return withCheckErrors(state, { ownerId, inputs: [] })
  }
  const output = buildOutput({ definition: runtime.definition, entries: runtime.syncEntries, state, nodeId: ownerId })
  const holdsOutput = existing != undefined && entry.status != RUN_STATUS.blocked
  if (holdsOutput && deepEqual(output, entry.output) && Object.is(scope.deps, entry.deps)) {
    return state
  }
  abortCheck(runtime, ownerId, entry)
  entry.output = output
  entry.deps = scope.deps
  const cleared = withCheckErrors(state, { ownerId, inputs: [] })
  if (existing == undefined || options.on != ASYNC_TRIGGER.change) {
    entry.status = RUN_STATUS.stale
    return cleared
  }
  scheduleRun({ runtime, ownerId, entry, debounceMs: options.debounceMs })
  return withPendingCheck(cleared, ownerId)
}

function createEntry(): CheckEntry {
  return {
    status: RUN_STATUS.stale,
    output: undefined,
    deps: undefined,
    timer: undefined,
    controller: undefined,
    running: undefined,
  }
}

function isSyncSettledAndValid(state: FormState, nodeId: string): boolean {
  const hasSyncErrors = activeErrors(state).some(error => {
    return isSyncErrorSource(error.source) && isWithinPath(error.targetId, nodeId)
  })
  return !hasSyncErrors && !hasPathWithin(state.pendingSchemas, nodeId)
}

function isFailedCheck(state: FormState, ownerId: string): boolean {
  return state.checks.get(ownerId)?.status == CHECK_STATUS.failed
}

function awaitsTrigger(state: FormState, ownerId: string, entry: CheckEntry): boolean {
  return entry.status == RUN_STATUS.stale || isFailedCheck(state, ownerId)
}

function pruneChecks(runtime: FormRuntime, state: FormState, scopes: ReadonlyArray<Scope>): FormState {
  const activeIds = new Set(scopes.map(scope => scope.nodeId))
  let next = state
  for (const [ownerId, entry] of runtime.checkEntries) {
    if (!activeIds.has(ownerId)) {
      cancelEntry(entry)
      runtime.checkEntries.delete(ownerId)
      next = withCheckErrors(next, { ownerId, inputs: [] })
    }
  }
  return next
}

interface ScheduledRun {
  readonly runtime: FormRuntime
  readonly ownerId: string
  readonly entry: CheckEntry
  readonly debounceMs: number
}

function scheduleRun({ runtime, ownerId, entry, debounceMs }: ScheduledRun): void {
  clearTimeout(entry.timer)
  entry.status = RUN_STATUS.scheduled
  entry.timer = setTimeout(() => {
    void startRun(runtime, ownerId, entry)
  }, debounceMs)
}

function startRun(runtime: FormRuntime, ownerId: string, entry: CheckEntry): Promise<void> {
  const options = checkOptionsAt(runtime, ownerId)
  cancelEntry(entry)
  if (options == undefined) {
    return Promise.resolve()
  }
  const controller = new AbortController()
  entry.controller = controller
  entry.status = RUN_STATUS.running
  commitState(runtime, withPendingCheck(runtime.state, ownerId))
  emitNodeEvent(runtime, FORM_EVENT.checkStart, ownerId)
  const run: CheckRun = { runtime, ownerId, entry, signal: controller.signal }
  entry.running = callRun({ options, entry, signal: controller.signal }).then(
    result => {
      answerCheck(run, toErrorInputs(result))
    },
    (error: unknown) => {
      failCheck(run, error)
    },
  )
  return entry.running
}

interface RunCall {
  readonly options: RuntimeAsyncValidation
  readonly entry: CheckEntry
  readonly signal: AbortSignal
}

async function callRun({ options, entry, signal }: RunCall): Promise<ValidateResult> {
  return options.run(entry.output, { signal, deps: entry.deps })
}

interface CheckRun {
  readonly runtime: FormRuntime
  readonly ownerId: string
  readonly entry: CheckEntry
  readonly signal: AbortSignal
}

function answerCheck(run: CheckRun, inputs: ReadonlyArray<ErrorInput>): void {
  if (run.signal.aborted) {
    return
  }
  const { runtime, ownerId, entry } = run
  finishRun(entry)
  commitState(runtime, withCheckErrors(runtime.state, { ownerId, inputs }))
  emitCheckEnd(runtime, { nodeId: ownerId, errors: inputs })
}

function failCheck(run: CheckRun, error: unknown): void {
  if (run.signal.aborted) {
    return
  }
  const { runtime, ownerId, entry } = run
  finishRun(entry)
  commitState(runtime, withFailedCheck(runtime.state, { ownerId, error }))
  emitCheckFail(runtime, { nodeId: ownerId, error })
}

function finishRun(entry: CheckEntry): void {
  entry.status = RUN_STATUS.idle
  entry.controller = undefined
  entry.running = undefined
}

function abortCheck(runtime: FormRuntime, ownerId: string, entry: CheckEntry): void {
  if (entry.status == RUN_STATUS.running) {
    emitNodeEvent(runtime, FORM_EVENT.checkAbort, ownerId)
  }
  cancelEntry(entry)
}

function cancelEntry(entry: CheckEntry): void {
  clearTimeout(entry.timer)
  entry.controller?.abort()
  entry.timer = undefined
  entry.controller = undefined
  entry.running = undefined
}

function checkOptionsAt(runtime: FormRuntime, ownerId: string): RuntimeAsyncValidation | undefined {
  const definition = definitionAt(runtime.definition, ownerId)
  return definition == undefined ? undefined : sharedOptionsOf(definition).validateAsync
}
