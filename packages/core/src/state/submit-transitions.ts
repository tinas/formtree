import type { FormState } from './form-state'

import { mapWith, withAdded, withDeleted } from './collections'
import { clearErrorsOnSubmit } from './error-transitions'

export function beginSubmit(state: FormState, nodeId: string): FormState {
  return {
    ...state,
    submitting: withAdded(state.submitting, nodeId),
    submitCounts: mapWith(state.submitCounts, nodeId, (state.submitCounts.get(nodeId) ?? 0) + 1),
    errors: clearErrorsOnSubmit(state.errors, nodeId),
  }
}

export function endSubmit(state: FormState, nodeId: string): FormState {
  return {
    ...state,
    submitting: withDeleted(state.submitting, nodeId),
  }
}
