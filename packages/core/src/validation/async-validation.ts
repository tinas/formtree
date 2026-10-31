import type { RuntimeAsyncValidation } from '../definitions/async-validation-options'
import type { ErrorInput } from '../errors/form-error'
import type { FormRuntime } from '../form/form-runtime'
import type { FormState } from '../state/form-state'
import type { Scope } from './scopes'

import { ASYNC_TRIGGER } from '../definitions/async-validation-options'
import { definitionAt } from '../definitions/definition-at'
import { sharedOptionsOf } from '../definitions/runtime-options'
import { ERROR_SOURCE, isSyncErrorSource, toErrorInputs } from '../errors/form-error'
import { CLEAR_ON } from '../errors/stored-error'
import { commitState } from '../form/form-runtime'
import { stableKey } from '../paths/equality'
import { isWithinPath } from '../paths/path'
import { hasPathWithin, withAdded, withDeleted } from '../state/collections'
import { replaceOwnedErrors, toStoredErrors } from '../state/error-transitions'
import { buildOutput } from './output'
import { activeErrors } from './visibility'

/**
 * The code of the error that replaces an asynchronous check that threw.
 *
 * @category Validation
 */
export const ASYNC_FAILED_CODE = 'formtree.async_failed'

const ASYNC_STATUS = {
  idle: 'idle',
  stale: 'stale',
  scheduled: 'scheduled',
  running: 'running',
  blocked: 'blocked',
} as const

type AsyncStatus = (typeof ASYNC_STATUS)[keyof typeof ASYNC_STATUS]

export interface AsyncEntry {
  status: AsyncStatus
  output: unknown
  outputKey: string | undefined
  deps: unknown
  token: number
  timer: ReturnType<typeof setTimeout> | undefined
  controller: AbortController | undefined
  running: Promise<void> | undefined
  readonly cache: Map<string, ReadonlyArray<ErrorInput>>
}

export function reconcileAsyncScopes(runtime: FormRuntime, state: FormState, scopes: ReadonlyArray<Scope>): FormState {
  let next = pruneAsyncEntries(runtime, state, scopes)
  for (const scope of scopes) {
    const options = sharedOptionsOf(scope.definition).validateAsync
    if (options != undefined) {
      next = reconcileAsyncScope({ runtime, state: next, scope, options })
    }
  }
  return next
}

export function scheduleBlurValidation(runtime: FormRuntime, state: FormState, nodeId: string): FormState {
  let next = state
  for (const [ownerId, entry] of runtime.asyncEntries) {
    const options = asyncOptionsAt(runtime, ownerId)
    if (entry.status == ASYNC_STATUS.stale && options?.on == ASYNC_TRIGGER.blur && isWithinPath(nodeId, ownerId)) {
      scheduleRun({ runtime, ownerId, entry, debounceMs: options.debounceMs })
      next = { ...next, validating: withAdded(next.validating, ownerId) }
    }
  }
  return next
}

export function startAsyncWithin(runtime: FormRuntime, nodeId: string): Array<Promise<void>> {
  return [...runtime.asyncEntries]
    .filter(([ownerId]) => isWithinPath(ownerId, nodeId))
    .map(([ownerId, entry]) => {
      if (entry.status == ASYNC_STATUS.stale || entry.status == ASYNC_STATUS.scheduled) {
        return startRun(runtime, ownerId, entry)
      }
      return entry.running
    })
    .filter(running => running != undefined)
}

export function disposeAsyncEntries(runtime: FormRuntime): void {
  for (const entry of runtime.asyncEntries.values()) {
    if (entry.status == ASYNC_STATUS.scheduled || entry.status == ASYNC_STATUS.running) {
      entry.status = ASYNC_STATUS.stale
    }
    cancelEntry(entry)
  }
  commitState(runtime, { ...runtime.state, validating: new Set() })
}

export function forgetAsyncEntriesWithin(runtime: FormRuntime, nodeId: string): void {
  for (const [ownerId, entry] of runtime.asyncEntries) {
    if (isWithinPath(ownerId, nodeId)) {
      cancelEntry(entry)
      runtime.asyncEntries.delete(ownerId)
    }
  }
}

interface AsyncScopeReconciliation {
  readonly runtime: FormRuntime
  readonly state: FormState
  readonly scope: Scope
  readonly options: RuntimeAsyncValidation
}

function reconcileAsyncScope({ runtime, state, scope, options }: AsyncScopeReconciliation): FormState {
  const existing = runtime.asyncEntries.get(scope.nodeId)
  const entry = existing ?? createEntry()
  runtime.asyncEntries.set(scope.nodeId, entry)
  if (!isSyncSettledAndValid(state, scope.nodeId)) {
    if (entry.status == ASYNC_STATUS.blocked) {
      return state
    }
    cancelEntry(entry)
    entry.status = ASYNC_STATUS.blocked
    entry.outputKey = undefined
    return withAsyncErrors({ state, ownerId: scope.nodeId, inputs: [], isValidating: false })
  }
  const output = buildOutput({
    definition: runtime.definition,
    entries: runtime.syncEntries,
    state,
    nodeId: scope.nodeId,
  })
  const outputKey = stableKey(output)
  if (outputKey == entry.outputKey && Object.is(scope.deps, entry.deps)) {
    return state
  }
  cancelEntry(entry)
  if (!Object.is(scope.deps, entry.deps)) {
    entry.cache.clear()
  }
  entry.output = output
  entry.outputKey = outputKey
  entry.deps = scope.deps
  const cached = entry.cache.get(outputKey)
  if (cached != undefined) {
    entry.status = ASYNC_STATUS.idle
    return withAsyncErrors({ state, ownerId: scope.nodeId, inputs: cached, isValidating: false })
  }
  if (existing == undefined || options.on != ASYNC_TRIGGER.change) {
    entry.status = ASYNC_STATUS.stale
    return withAsyncErrors({ state, ownerId: scope.nodeId, inputs: [], isValidating: false })
  }
  scheduleRun({ runtime, ownerId: scope.nodeId, entry, debounceMs: options.debounceMs })
  return withAsyncErrors({ state, ownerId: scope.nodeId, inputs: [], isValidating: true })
}

function createEntry(): AsyncEntry {
  return {
    status: ASYNC_STATUS.stale,
    output: undefined,
    outputKey: undefined,
    deps: undefined,
    token: 0,
    timer: undefined,
    controller: undefined,
    running: undefined,
    cache: new Map(),
  }
}

function isSyncSettledAndValid(state: FormState, nodeId: string): boolean {
  const hasSyncErrors = activeErrors(state).some(error => {
    return isSyncErrorSource(error.source) && isWithinPath(error.targetId, nodeId)
  })
  return !hasSyncErrors && !hasPathWithin(state.pendingSchemas, nodeId)
}

function pruneAsyncEntries(runtime: FormRuntime, state: FormState, scopes: ReadonlyArray<Scope>): FormState {
  const activeIds = new Set(scopes.map(scope => scope.nodeId))
  let next = state
  for (const [ownerId, entry] of runtime.asyncEntries) {
    if (!activeIds.has(ownerId)) {
      cancelEntry(entry)
      runtime.asyncEntries.delete(ownerId)
      next = withAsyncErrors({ state: next, ownerId, inputs: [], isValidating: false })
    }
  }
  return next
}

interface ScheduledRun {
  readonly runtime: FormRuntime
  readonly ownerId: string
  readonly entry: AsyncEntry
  readonly debounceMs: number
}

function scheduleRun({ runtime, ownerId, entry, debounceMs }: ScheduledRun): void {
  clearTimeout(entry.timer)
  entry.status = ASYNC_STATUS.scheduled
  entry.timer = setTimeout(() => {
    void startRun(runtime, ownerId, entry)
  }, debounceMs)
}

function startRun(runtime: FormRuntime, ownerId: string, entry: AsyncEntry): Promise<void> {
  const options = asyncOptionsAt(runtime, ownerId)
  cancelEntry(entry)
  if (options == undefined) {
    return Promise.resolve()
  }
  const controller = new AbortController()
  const token = entry.token
  entry.controller = controller
  entry.status = ASYNC_STATUS.running
  commitState(runtime, { ...runtime.state, validating: withAdded(runtime.state.validating, ownerId) })
  entry.running = executeRun({ options, output: entry.output, deps: entry.deps, signal: controller.signal }).then(
    inputs => {
      settleRun({ runtime, ownerId, entry, token, inputs })
    },
  )
  return entry.running
}

interface RunExecution {
  readonly options: RuntimeAsyncValidation
  readonly output: unknown
  readonly deps: unknown
  readonly signal: AbortSignal
}

async function executeRun({ options, output, deps, signal }: RunExecution): Promise<ReadonlyArray<ErrorInput>> {
  try {
    return toErrorInputs(await options.run(output, { signal, deps }))
  } catch (error) {
    return [{ code: ASYNC_FAILED_CODE, params: { error } }]
  }
}

interface RunSettlement {
  readonly runtime: FormRuntime
  readonly ownerId: string
  readonly entry: AsyncEntry
  readonly token: number
  readonly inputs: ReadonlyArray<ErrorInput>
}

function settleRun({ runtime, ownerId, entry, token, inputs }: RunSettlement): void {
  if (runtime.asyncEntries.get(ownerId) != entry || entry.token != token) {
    return
  }
  if (entry.outputKey != undefined) {
    entry.cache.set(entry.outputKey, inputs)
  }
  entry.status = ASYNC_STATUS.idle
  entry.controller = undefined
  entry.running = undefined
  commitState(runtime, withAsyncErrors({ state: runtime.state, ownerId, inputs, isValidating: false }))
}

function cancelEntry(entry: AsyncEntry): void {
  clearTimeout(entry.timer)
  entry.controller?.abort()
  entry.timer = undefined
  entry.controller = undefined
  entry.running = undefined
  entry.token += 1
}

interface AsyncErrorsUpdate {
  readonly state: FormState
  readonly ownerId: string
  readonly inputs: ReadonlyArray<ErrorInput>
  readonly isValidating: boolean
}

function withAsyncErrors({ state, ownerId, inputs, isValidating }: AsyncErrorsUpdate): FormState {
  return {
    ...state,
    errors: replaceOwnedErrors(state.errors, {
      ownerId,
      source: ERROR_SOURCE.async,
      errors: toStoredErrors({
        inputs,
        ownerId,
        source: ERROR_SOURCE.async,
        clearOn: CLEAR_ON.never,
        arrayKeys: state.arrayKeys,
      }),
    }),
    validating: isValidating ? withAdded(state.validating, ownerId) : withDeleted(state.validating, ownerId),
  }
}

function asyncOptionsAt(runtime: FormRuntime, ownerId: string): RuntimeAsyncValidation | undefined {
  const definition = definitionAt(runtime.definition, ownerId)
  return definition == undefined ? undefined : sharedOptionsOf(definition).validateAsync
}
