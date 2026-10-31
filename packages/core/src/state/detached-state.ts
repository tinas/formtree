import type { FormState } from './form-state'
import type { ArrayKeys } from './node-id'

import { isAttached } from './node-id'

export function dropDetachedState(state: FormState): FormState {
  return {
    ...state,
    touched: attachedPaths(state.arrayKeys, state.touched),
    changed: attachedPaths(state.arrayKeys, state.changed),
    submitting: attachedPaths(state.arrayKeys, state.submitting),
    errors: state.errors.filter(error => isAttached(state.arrayKeys, error.targetId)),
    snapshots: attachedEntries(state.arrayKeys, state.snapshots),
    submitCounts: attachedEntries(state.arrayKeys, state.submitCounts),
  }
}

function attachedPaths(arrayKeys: ArrayKeys, set: ReadonlySet<string>): ReadonlySet<string> {
  return new Set([...set].filter(nodeId => isAttached(arrayKeys, nodeId)))
}

function attachedEntries<Value>(arrayKeys: ArrayKeys, map: ReadonlyMap<string, Value>): ReadonlyMap<string, Value> {
  return new Map([...map].filter(([nodeId]) => isAttached(arrayKeys, nodeId)))
}
