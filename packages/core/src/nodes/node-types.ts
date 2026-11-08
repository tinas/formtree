import type { DraftOf, OutputOf } from '../definitions/definition'
import type { DEFINITION_KIND } from '../definitions/definition-kind'
import type { ClearOn } from '../errors/stored-error'
import type { ErrorInput, ErrorSource, FormError, ValidateResult } from '../errors/form-error'
import type { ValidateOptions } from '../validation/validation-pass'
import type { NodeKind } from './node-kind'
import type { IsArrayShape, IsGroupShape, ItemShapeOf, PathInput, ShapeAtPath } from './path-types'

/**
 * How a submit ended.
 *
 * @category Submitting
 */
export const SUBMIT_OUTCOME = {
  /** The subtree was valid and the handler returned no errors. */
  success: 'success',
  /** The subtree has errors; the handler did not run. */
  invalid: 'invalid',
  /** A check in the subtree failed; the handler did not run. */
  unchecked: 'unchecked',
  /** The handler returned errors. */
  rejected: 'rejected',
  /** The node was already submitting, or it is in an inactive branch; the handler did not run. */
  skipped: 'skipped',
} as const

/** @category Submitting */
export type SubmitOutcome = (typeof SUBMIT_OUTCOME)[keyof typeof SUBMIT_OUTCOME]

/**
 * Focus the node's error summary, the element with its `summaryId`, after a failed submit.
 *
 * @category Submitting
 */
export const FOCUS_SUMMARY = 'summary'

/**
 * Where focus goes after a failed submit: the first element shown on the page with an error or a check that threw,
 * in document order (`true`), the error summary (`'summary'`) or nowhere (`false`).
 *
 * @category Submitting
 */
export type FocusErrorOption = boolean | typeof FOCUS_SUMMARY

/**
 * How an element receives focus, for example with smooth scrolling.
 *
 * @category Submitting
 */
export type FocusElementOption = (element: HTMLElement) => void

/**
 * A check whose `run` threw.
 *
 * @category Validation
 */
export interface FailedCheck {
  /** Dotted path from the root of the form. */
  readonly path: string
  /** What `run` threw. */
  readonly error: unknown
}

/**
 * A snapshot of a node. It keeps its reference until something about the node changes.
 *
 * @category Nodes
 */
export interface NodeState<Value> {
  /** The draft value. */
  readonly value: Value
  /** The value `dirty` and `reset` compare against. */
  readonly initialValue: Value | undefined
  /** The errors visible now. Which errors are visible depends on the display mode. */
  readonly errors: ReadonlyArray<FormError>
  /** True when the subtree has no error, visible or not, and no check that threw. */
  readonly valid: boolean
  /** True when a value in the subtree differs from its initial value. */
  readonly dirty: boolean
  /** True when a node in the subtree has lost focus or an array in it has been edited. */
  readonly touched: boolean
  /** True while an asynchronous check in the subtree is pending. */
  readonly validating: boolean
  /** Checks in the subtree whose `run` threw. */
  readonly failedChecks: ReadonlyArray<FailedCheck>
  /** True while a submit of this node runs. */
  readonly submitting: boolean
  readonly submitCount: number
  /** False when an `activeWhen` of the node or an ancestor turns it off. */
  readonly active: boolean
}

/**
 * The result of `validate()`.
 *
 * @category Nodes
 */
export type ValidationResult<Output> =
  | { readonly valid: true; readonly value: Output }
  | {
      readonly valid: false
      readonly errors: ReadonlyArray<FormError>
      readonly failedChecks: ReadonlyArray<FailedCheck>
    }

/**
 * Receives the output of the submitted node. Errors it returns are stored as server errors, relative to that node.
 *
 * @category Submitting
 */
export type SubmitHandler<Output> = (output: Output) => ValidateResult | void | Promise<ValidateResult | void>

/**
 * Options of `handleSubmit`.
 *
 * @category Submitting
 */
export interface SubmitOptions extends ValidateOptions {
  /**
   * Called with the errors, in the order `listErrors` lists them, when the subtree has errors. Focus moves once the
   * promise it returns settles, so it can open what hides a field, such as a dialog.
   */
  readonly onInvalid?: (errors: ReadonlyArray<FormError>) => void | Promise<void>
  /** Overrides the form's option for this submit. */
  readonly shouldFocusError?: FocusErrorOption
  /** Overrides the form's option for this submit. */
  readonly focusElement?: FocusElementOption
}

/**
 * Options of `reset`.
 *
 * @category Nodes
 */
export interface ResetOptions<Value> {
  /** A draft to use as the new initial value of the subtree, for example after a save. */
  readonly value?: Value
  readonly keepTouched?: boolean
  /** Keep server and asynchronous errors. */
  readonly keepErrors?: boolean
}

/**
 * Options of `setErrors`.
 *
 * @category Errors
 */
export interface SetErrorsOptions {
  /** @defaultValue `'server'` */
  readonly source?: ErrorSource
  /** @defaultValue `'change'` */
  readonly clearOn?: ClearOn
}

/**
 * Options of `clearErrors`.
 *
 * @category Errors
 */
export interface ClearErrorsOptions {
  /** Clear only errors of this source. Without it, every external error is cleared. */
  readonly source?: ErrorSource
}

/**
 * Options of `listErrors`.
 *
 * @category Errors
 */
export interface ListErrorsOptions {
  /** Include the errors of descendants. */
  readonly deep?: boolean
  /** Include errors the display mode hides. */
  readonly includeHidden?: boolean
}

const LIST_ERRORS_KEY_PARTS: Record<keyof ListErrorsOptions, (options: ListErrorsOptions) => boolean> = {
  deep: options => options.deep == true,
  includeHidden: options => options.includeHidden == true,
}

/**
 * A key that `listErrors` options with the same meaning share, for a cache kept per options.
 *
 * @internal
 */
export function listErrorsKey(options: ListErrorsOptions = {}): string {
  return Object.values(LIST_ERRORS_KEY_PARTS)
    .map(part => part(options))
    .join()
}

/**
 * An error listed by `listErrors`.
 *
 * @category Errors
 */
export interface ListedError extends FormError {
  /** DOM id of the element the error belongs to, for links in an error summary. */
  readonly targetId: string
}

/**
 * Attributes for a field's input element. `null` means the attribute should be removed.
 *
 * @category Nodes
 */
export interface FieldAttributes {
  readonly id: string
  readonly name: string
  readonly 'aria-invalid': 'true' | 'false'
  readonly 'aria-describedby': string | null
}

export interface NodeBase<Value, Output> {
  readonly kind: NodeKind
  /** DOM id: the form id and the node's path. */
  readonly id: string
  /** Dotted path from the root. Array items appear by their current index. */
  readonly path: string
  readonly state: NodeState<Value>
  /**
   * The node's first visible error as text, from the form's `formatError`; `undefined` while none is visible. It is
   * not cached, so a message translated in `formatError` follows the current language where it is read.
   */
  readonly errorMessage: string | undefined
  /**
   * Calls the listener once after a change to this node's `state` or path, or once per `batch`. Returns a function
   * that unsubscribes.
   */
  readonly subscribe: (listener: () => void) => () => void
  /** Writes a draft value. `undefined` empties a field. */
  readonly setValue: (value: Value) => void
  /** Marks the node as touched and starts checks that run on blur. */
  readonly blur: () => void
  /**
   * Validates the subtree, waits for pending checks, retries failed ones and returns the result without making errors
   * visible.
   */
  readonly validate: (options?: ValidateOptions) => Promise<ValidationResult<Output>>
  /**
   * Returns a submit function for this node. It skips while a submit runs, validates the subtree and either shows
   * and focuses its errors and the checks that threw, or calls `onValid` with the output.
   */
  readonly handleSubmit: (onValid: SubmitHandler<Output>, options?: SubmitOptions) => () => Promise<SubmitOutcome>
  /** Returns the subtree to its initial value, or makes `options.value` its new initial value. */
  readonly reset: (options?: ResetOptions<Value>) => void
  /** Sets external errors with paths relative to this node. They are visible at once. */
  readonly setErrors: (errors: ReadonlyArray<ErrorInput>, options?: SetErrorsOptions) => void
  /** Removes external errors in this subtree. Schema and rule errors follow their values. */
  readonly clearErrors: (options?: ClearErrorsOptions) => void
  readonly listErrors: (options?: ListErrorsOptions) => ReadonlyArray<ListedError>
  /** Focuses the element with this node's id, through the form's `focusElement`. */
  readonly focus: () => void
}

/**
 * A node that holds one value.
 *
 * @category Nodes
 */
export interface FieldNode<Value, Output = Value> extends NodeBase<Value, Output> {
  /** Id for the error message element. `aria-describedby` points at it while an error is visible. */
  readonly errorId: string
  /** Id for a description element. */
  readonly descriptionId: string
  readonly attributes: FieldAttributes
}

/**
 * A node of a group. Paths given to `field`, `group` and `array` are relative and checked one segment at a time.
 *
 * @category Nodes
 */
export interface GroupNode<Shape> extends NodeBase<DraftOf<Shape>, OutputOf<Shape>> {
  /** Id for an error summary element, focused by a submit with `shouldFocusError: 'summary'`. */
  readonly summaryId: string
  /** The node at a path, as one value. */
  readonly field: <Path extends string>(
    path: PathInput<Shape, Path, 'field'>,
  ) => FieldNode<DraftOf<ShapeAtPath<Shape, Path>>, OutputOf<ShapeAtPath<Shape, Path>>>
  /** The node at a path, as a group. */
  readonly group: <Path extends string>(path: PathInput<Shape, Path, 'group'>) => GroupNode<ShapeAtPath<Shape, Path>>
  /** The node at a path, as an array with items and operations. */
  readonly array: <Path extends string>(path: PathInput<Shape, Path, 'array'>) => ArrayNode<ShapeAtPath<Shape, Path>>
}

/**
 * What an array item adds to its node.
 *
 * @category Nodes
 */
export interface ArrayItem {
  /** Identity of the item for as long as it exists; the key for list rendering. */
  readonly key: string
  /** Current position of the item. */
  readonly index: number
}

/**
 * A node of an array. Errors, touched state and checks belong to items by key, so they move with them.
 *
 * @category Nodes
 */
export interface ArrayNode<Shape> extends NodeBase<DraftOf<Shape>, OutputOf<Shape>> {
  /** Id for an error summary element, focused by a submit with `shouldFocusError: 'summary'`. */
  readonly summaryId: string
  readonly items: ReadonlyArray<NodeOf<ItemShapeOf<Shape>> & ArrayItem>
  readonly push: (value: DraftOf<ItemShapeOf<Shape>>) => void
  readonly insert: (index: number, value: DraftOf<ItemShapeOf<Shape>>) => void
  readonly remove: (index: number) => void
  readonly move: (from: number, to: number) => void
  readonly swap: (first: number, second: number) => void
  readonly replace: (values: ReadonlyArray<DraftOf<ItemShapeOf<Shape>>>) => void
}

/**
 * The node type of a definition: a field, group or array node.
 *
 * @category Types
 */
export type NodeOf<Shape> = Shape extends { readonly kind: typeof DEFINITION_KIND.field }
  ? FieldNode<DraftOf<Shape>, OutputOf<Shape>>
  : IsGroupShape<Shape> extends true
    ? GroupNode<Shape>
    : IsArrayShape<Shape> extends true
      ? ArrayNode<Shape>
      : FieldNode<DraftOf<Shape>, OutputOf<Shape>>
