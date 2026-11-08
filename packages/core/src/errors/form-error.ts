import type { EmptyObject } from '../types'

/**
 * Who produced an error. Each producer changes only its own errors.
 *
 * @category Errors
 */
export const ERROR_SOURCE = {
  /** A field's or group's `schema`. */
  schema: 'schema',
  /** A group's or array's `validate` rule. */
  validate: 'validate',
  /** A `validateAsync` check. */
  async: 'async',
  /** `setErrors`, unless it names another source. */
  server: 'server',
} as const

/**
 * One of {@link ERROR_SOURCE}, or a source of your own passed to `setErrors`.
 *
 * @category Errors
 */
export type ErrorSource = (typeof ERROR_SOURCE)[keyof typeof ERROR_SOURCE] | (string & EmptyObject)

/** @category Errors */
export type ErrorParams = Readonly<Record<string, unknown>>

/**
 * An error as the form reports it.
 *
 * @category Errors
 */
export interface FormError {
  /** Dotted path from the root of the form. */
  readonly path: string
  /** For a schema error, the message the schema reports; a readable text or a translation key. */
  readonly code: string
  /** For a schema error, the rest of the schema issue. */
  readonly params?: ErrorParams
  readonly source: ErrorSource
}

/**
 * Turns an error into the text shown to the user, for example by translating its code with its params.
 *
 * @category Errors
 */
export type FormatErrorOption = (error: FormError) => string

export function formatErrorCode(error: FormError): string {
  return error.code
}

/**
 * An error as rules, checks and submit handlers return it.
 *
 * @category Errors
 */
export interface ErrorInput {
  /** Relative to the node that produced or received the error; omitted for the node itself. */
  readonly path?: string
  readonly code: string
  readonly params?: ErrorParams
}

/**
 * What a rule or check returns: one error, a list of errors, or `undefined` when valid.
 *
 * @category Errors
 */
export type ValidateResult = ErrorInput | ReadonlyArray<ErrorInput> | undefined

export function toErrorInputs(result: ValidateResult | void): ReadonlyArray<ErrorInput> {
  if (result == undefined) {
    return []
  }
  return isErrorInputList(result) ? result : [result]
}

export function isInternalErrorSource(source: ErrorSource): boolean {
  return source == ERROR_SOURCE.schema || source == ERROR_SOURCE.validate || source == ERROR_SOURCE.async
}

export function isSyncErrorSource(source: ErrorSource): boolean {
  return source == ERROR_SOURCE.schema || source == ERROR_SOURCE.validate
}

function isErrorInputList(result: ErrorInput | ReadonlyArray<ErrorInput>): result is ReadonlyArray<ErrorInput> {
  return Array.isArray(result)
}
