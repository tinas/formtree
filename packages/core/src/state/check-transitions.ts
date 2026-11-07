import type { ErrorInput } from '../errors/form-error'
import type { CheckState, FormState } from './form-state'

import { ERROR_SOURCE } from '../errors/form-error'
import { CLEAR_ON } from '../errors/stored-error'
import { mapWith, mapWithout, mapWithoutPathsWithin } from './collections'
import { replaceOwnedErrors, toStoredErrors } from './error-transitions'
import { CHECK_STATUS } from './form-state'

const PENDING_CHECK: CheckState = { status: CHECK_STATUS.pending }

export interface CheckErrorsUpdate {
  readonly ownerId: string
  readonly inputs: ReadonlyArray<ErrorInput>
}

export interface CheckFailure {
  readonly ownerId: string
  readonly error: unknown
}

export function withPendingCheck(state: FormState, ownerId: string): FormState {
  return { ...state, checks: mapWith(state.checks, ownerId, PENDING_CHECK) }
}

export function withCheckErrors(state: FormState, { ownerId, inputs }: CheckErrorsUpdate): FormState {
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
    checks: mapWithout(state.checks, ownerId),
  }
}

export function withFailedCheck(state: FormState, { ownerId, error }: CheckFailure): FormState {
  const settled = withCheckErrors(state, { ownerId, inputs: [] })
  return { ...settled, checks: mapWith(settled.checks, ownerId, { status: CHECK_STATUS.failed, error }) }
}

export function withoutChecksWithin(state: FormState, nodeId: string): FormState {
  return { ...state, checks: mapWithoutPathsWithin(state.checks, nodeId) }
}

export function withoutPendingChecks(state: FormState): FormState {
  return { ...state, checks: new Map([...state.checks].filter(([, check]) => check.status != CHECK_STATUS.pending)) }
}
