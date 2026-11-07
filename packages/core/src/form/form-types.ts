import type { Definition, DepsOf, DraftOf, NoDeps } from '../definitions/definition'
import type { FormatErrorOption, FormError } from '../errors/form-error'
import type { ReValidateMode, ValidationMode } from '../modes/display-mode'
import type { FocusElementOption, FocusErrorOption, NodeOf } from '../nodes/node-types'
import type { DeepPartial } from '../types'

/**
 * Options of {@link createForm} that an app usually sets once for all of its forms. The adapters take them as app
 * defaults.
 *
 * @category Form
 */
export interface FormDefaults {
  /** When errors become visible. Definitions can override it. @defaultValue `'onTouched'` */
  readonly mode?: ValidationMode
  /**
   * When errors update after a node that contains them is submitted. Until then, `mode` decides. Definitions can
   * override it.
   *
   * @defaultValue `'onChange'`
   */
  readonly reValidateMode?: ReValidateMode
  /** Where focus goes after a failed submit. @defaultValue `true` */
  readonly shouldFocusError?: FocusErrorOption
  /** How an element is focused, for error focus and `node.focus()`. @defaultValue `element => element.focus()` */
  readonly focusElement?: FocusElementOption
  /** Turns an error into text, for `errorMessage` and error summaries. @defaultValue `error => error.code` */
  readonly formatError?: FormatErrorOption
}

/**
 * Options of {@link createForm}.
 *
 * @category Form
 */
export interface CreateFormOptions<FormDefinition> extends FormDefaults {
  /** Prefix of every DOM id in the form, as in `checkout:contact.email`. @defaultValue `formtree-<counter>` */
  readonly id?: string
  /** The starting draft. It may be partial; anything left out starts empty. */
  readonly initialValue?: DeepPartial<DraftOf<FormDefinition>>
}

/**
 * Options of {@link createForm} for a definition that needs dependencies.
 *
 * @category Form
 */
export interface CreateFormOptionsWithDeps<FormDefinition> extends CreateFormOptions<FormDefinition> {
  /** The root's dependencies. Replace them later with `setDeps`. */
  readonly deps: DepsOf<FormDefinition>
}

/**
 * The options argument of {@link createForm}: optional without dependencies, required with them.
 *
 * @category Form
 */
export type CreateFormArguments<FormDefinition extends Definition> = [DepsOf<FormDefinition>] extends [NoDeps]
  ? [options?: CreateFormOptions<FormDefinition>]
  : [options: CreateFormOptionsWithDeps<FormDefinition>]

/**
 * What the root node of a form has besides the node API.
 *
 * @category Form
 */
export interface FormControls<Deps> {
  /** Calls the listener once after every change, or once per `batch`. Returns a function that unsubscribes. */
  readonly subscribe: (listener: () => void) => () => void
  /**
   * Replaces the root's dependencies; `childDeps` are recomputed and affected schemas rebuilt. Dependencies equal
   * key by key to the current ones change nothing.
   */
  readonly setDeps: (deps: Deps) => void
  /** Applies the writes made inside `update` with a single notification. */
  readonly batch: (update: () => void) => void
  /** Cancels pending asynchronous checks. The form stays usable. */
  readonly dispose: () => void
  /** Turns an error into text with the form's `formatError`, for example in an error summary. */
  readonly formatError: (error: FormError) => string
}

/**
 * A form: the root node of the definition, with {@link FormControls}.
 *
 * @category Form
 */
export type Form<FormDefinition> = NodeOf<FormDefinition> & FormControls<DepsOf<FormDefinition>>
