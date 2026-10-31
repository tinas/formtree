/**
 * When an error first becomes visible. Validation itself runs on every change.
 *
 * @category Validation
 */
export const VALIDATION_MODE = {
  /** When a node that contains it is submitted. */
  onSubmit: 'onSubmit',
  /** When the field loses focus. */
  onBlur: 'onBlur',
  /** On the first change. */
  onChange: 'onChange',
  /** After the field has lost focus once. */
  onTouched: 'onTouched',
  /** At once. */
  all: 'all',
} as const

/** @category Validation */
export type ValidationMode = (typeof VALIDATION_MODE)[keyof typeof VALIDATION_MODE]

/**
 * When a new error shows on a field whose errors have already been visible. A fixed error disappears at once.
 *
 * @category Validation
 */
export const RE_VALIDATE_MODE = {
  /** On each change. */
  onChange: 'onChange',
  /** When the field loses focus. */
  onBlur: 'onBlur',
  /** When a node that contains it is submitted. */
  onSubmit: 'onSubmit',
} as const

/** @category Validation */
export type ReValidateMode = (typeof RE_VALIDATE_MODE)[keyof typeof RE_VALIDATE_MODE]

export interface DisplayModes {
  readonly mode: ValidationMode
  readonly reValidateMode: ReValidateMode
}

export const DEFAULT_DISPLAY_MODES: DisplayModes = {
  mode: VALIDATION_MODE.onTouched,
  reValidateMode: RE_VALIDATE_MODE.onChange,
}
