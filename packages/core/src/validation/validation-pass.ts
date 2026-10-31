import type { FormRuntime } from '../form/form-runtime'
import type { FormState } from '../state/form-state'
import type { Scope } from './scopes'
import type { PendingSchemaRun } from './sync-validation'

import { isInternalErrorSource } from '../errors/form-error'
import { commitState } from '../form/form-runtime'
import { isWithinPath } from '../paths/path'
import { reconcileAsyncScopes } from './async-validation'
import { collectScopes } from './scopes'
import { applySyncValidation, settleSchemaRun } from './sync-validation'

export function runValidationPass(runtime: FormRuntime, state: FormState): FormState {
  const collection = collectScopes({ definition: runtime.definition, state, previousDeps: runtime.scopeDeps })
  runtime.scopeDeps = collection.deps
  const synced = applySyncValidation({
    entries: runtime.syncEntries,
    state: { ...state, inactive: collection.inactive },
    scopes: collection.scopes,
  })
  watchPendingSchemas(runtime, synced.pending)
  return reconcileAsyncScopes(runtime, pruneRemovedScopes(runtime, synced.state, collection.scopes), collection.scopes)
}

export function commitWithValidation(runtime: FormRuntime, state: FormState): void {
  commitState(runtime, runValidationPass(runtime, state))
}

export function pendingSchemaRunsWithin(runtime: FormRuntime, nodeId: string): Array<Promise<void>> {
  return [...runtime.pendingSchemaRuns].filter(([ownerId]) => isWithinPath(ownerId, nodeId)).map(([, run]) => run)
}

function watchPendingSchemas(runtime: FormRuntime, pending: ReadonlyArray<PendingSchemaRun>): void {
  for (const schemaRun of pending) {
    const settled = schemaRun.run.then(run => {
      if (runtime.pendingSchemaRuns.get(schemaRun.nodeId) == settled) {
        runtime.pendingSchemaRuns.delete(schemaRun.nodeId)
      }
      const state = settleSchemaRun({ entries: runtime.syncEntries, state: runtime.state, pending: schemaRun, run })
      commitWithValidation(runtime, state)
    })
    runtime.pendingSchemaRuns.set(schemaRun.nodeId, settled)
  }
}

function pruneRemovedScopes(runtime: FormRuntime, state: FormState, scopes: ReadonlyArray<Scope>): FormState {
  const activeIds = new Set(scopes.map(scope => scope.nodeId))
  for (const nodeId of runtime.syncEntries.keys()) {
    if (!activeIds.has(nodeId)) {
      runtime.syncEntries.delete(nodeId)
      runtime.pendingSchemaRuns.delete(nodeId)
    }
  }
  return {
    ...state,
    errors: state.errors.filter(error => !isInternalErrorSource(error.source) || activeIds.has(error.ownerId)),
    pendingSchemas: new Set([...state.pendingSchemas].filter(nodeId => activeIds.has(nodeId))),
  }
}
