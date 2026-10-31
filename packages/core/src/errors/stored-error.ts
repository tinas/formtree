import type { ErrorParams, ErrorSource } from './form-error'

/**
 * When an external error set with `setErrors` is cleared.
 *
 * @category Errors
 */
export const CLEAR_ON = {
  /** When the value at its path changes. */
  change: 'change',
  /** When a node that contains it is submitted. */
  submit: 'submit',
  /** Only by `clearErrors` or `reset`. */
  never: 'never',
} as const

/** @category Errors */
export type ClearOn = (typeof CLEAR_ON)[keyof typeof CLEAR_ON]

export interface StoredError {
  readonly targetId: string
  readonly ownerId: string
  readonly source: ErrorSource
  readonly code: string
  readonly params?: ErrorParams
  readonly clearOn: ClearOn
}

export function errorIdentity(error: StoredError): string {
  return `${error.ownerId}|${error.source}|${error.code}`
}
