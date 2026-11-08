import type { ValidateResult } from '../errors/form-error'

/**
 * When an asynchronous check starts.
 *
 * @category Validation
 */
export const ASYNC_TRIGGER = {
  /** After each change. */
  change: 'change',
  /** After the field loses focus. */
  blur: 'blur',
  /** When a node that contains it is submitted or validated with `validate()`. */
  submit: 'submit',
} as const

/** @category Validation */
export type AsyncTrigger = (typeof ASYNC_TRIGGER)[keyof typeof ASYNC_TRIGGER]

const DEFAULT_DEBOUNCE_MS = 300

/**
 * What an asynchronous check receives besides the value.
 *
 * @category Validation
 */
export interface AsyncValidationContext<Deps> {
  /** Aborted when the value changes again or the form is disposed. */
  readonly signal: AbortSignal
  readonly deps: Deps
}

/**
 * A check against something outside the form, such as a server. It runs only while the schema passes, receives the
 * output and runs again at every `validate()` and submit, which wait for its answer.
 *
 * @category Validation
 */
export interface AsyncValidationOptions<Output, Deps> {
  /** @defaultValue `'change'` */
  readonly on?: AsyncTrigger
  /** How long to wait after the trigger, in milliseconds. @defaultValue `300` */
  readonly debounceMs?: number
  /** Returns an error, a list of errors or `undefined`. If it throws, the check fails. */
  run(output: Output, context: AsyncValidationContext<Deps>): ValidateResult | Promise<ValidateResult>
}

export interface RuntimeAsyncValidation {
  readonly on: AsyncTrigger
  readonly debounceMs: number
  run(output: unknown, context: AsyncValidationContext<unknown>): ValidateResult | Promise<ValidateResult>
}

export function toRuntimeAsyncValidation<Output, Deps>(
  options: AsyncValidationOptions<Output, Deps> | undefined,
): RuntimeAsyncValidation | undefined {
  if (options == undefined) {
    return undefined
  }
  return {
    on: options.on ?? ASYNC_TRIGGER.change,
    debounceMs: options.debounceMs ?? DEFAULT_DEBOUNCE_MS,
    run: (output, context) => options.run(output as Output, context as AsyncValidationContext<Deps>),
  }
}
