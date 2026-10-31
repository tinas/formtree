import type { Definition } from '../definitions/definition'
import type { FormState } from './form-state'

import { splitPath } from '../paths/path'
import { getIn, setIn } from '../paths/value-tree'
import { assignArrayKeys } from './array-keys'
import { withAdded } from './collections'
import { dropDetachedState } from './detached-state'
import { clearErrorsOnValueChange } from './error-transitions'
import { toPath } from './node-id'
import { materializeAt } from './structure'

export interface ValueWrite {
  readonly state: FormState
  readonly definition: Definition
  readonly nodeId: string
  readonly value: unknown
}

export function writeValue({ state, definition, nodeId, value }: ValueWrite): FormState {
  const path = toPath(state.arrayKeys, nodeId)
  if (path == undefined) {
    return state
  }
  const segments = splitPath(path)
  const nodeValue = materializeAt(definition, nodeId, value)
  if (Object.is(getIn(state.value, segments), nodeValue)) {
    return state
  }
  return dropDetachedState({
    ...state,
    ...assignArrayKeys(state, nodeId, nodeValue),
    value: setIn(state.value, segments, nodeValue),
    changed: withAdded(state.changed, nodeId),
    errors: clearErrorsOnValueChange(state.errors, nodeId),
  })
}

export function markTouched(state: FormState, nodeId: string): FormState {
  return {
    ...state,
    touched: withAdded(state.touched, nodeId),
  }
}
