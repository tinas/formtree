import type { Definition } from '../definitions/definition'
import type { FormatErrorOption } from '../errors/form-error'
import type { DisplayModes } from '../modes/display-mode'
import type { UniversalNode } from '../nodes/node'
import type { FocusElementOption, FocusErrorOption } from '../nodes/node-types'
import type { FormState } from '../state/form-state'
import type { CheckEntry } from '../validation/async-validation'
import type { SyncEntry } from '../validation/sync-validation'
import type { FormEventObserver } from './form-events'

export interface FormRuntimeOptions extends DisplayModes {
  readonly shouldFocusError: FocusErrorOption
  readonly focusElement: FocusElementOption
  readonly formatError: FormatErrorOption
}

export interface FormRuntime {
  readonly formId: string
  readonly definition: Definition
  readonly options: FormRuntimeOptions
  state: FormState
  version: number
  batchDepth: number
  hasPendingNotification: boolean
  scopeDeps: ReadonlyMap<string, unknown>
  readonly listeners: Set<() => void>
  readonly observers: Set<FormEventObserver>
  readonly nodes: Map<string, UniversalNode>
  readonly syncEntries: Map<string, SyncEntry>
  readonly checkEntries: Map<string, CheckEntry>
  readonly pendingSchemaRuns: Map<string, Promise<void>>
}

export function commitState(runtime: FormRuntime, state: FormState): void {
  if (state == runtime.state) {
    return
  }
  runtime.state = state
  runtime.version += 1
  if (runtime.batchDepth > 0) {
    runtime.hasPendingNotification = true
    return
  }
  notifyListeners(runtime)
}

export function subscribeToRuntime(runtime: FormRuntime, listener: () => void): () => void {
  runtime.listeners.add(listener)
  return () => {
    runtime.listeners.delete(listener)
  }
}

export function runBatch(runtime: FormRuntime, update: () => void): void {
  runtime.batchDepth += 1
  try {
    update()
  } finally {
    runtime.batchDepth -= 1
    if (runtime.batchDepth == 0 && runtime.hasPendingNotification) {
      runtime.hasPendingNotification = false
      notifyListeners(runtime)
    }
  }
}

function notifyListeners(runtime: FormRuntime): void {
  for (const listener of [...runtime.listeners]) {
    listener()
  }
}
