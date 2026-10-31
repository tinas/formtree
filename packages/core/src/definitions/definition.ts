import type { DraftObject, DraftValue, EmptyObject } from '../types'
import type { DEFINITION_KIND } from './definition-kind'

/**
 * The dependency type of a definition that needs none.
 *
 * @category Definitions
 */
export type NoDeps = undefined

export interface DefinitionTypes<Draft, Input, Output, Deps> {
  readonly draft: Draft
  readonly input: Input
  readonly output: Output
  readonly deps: Deps
}

/**
 * A field definition, made with {@link defineField} or {@link defineFieldWithDeps}.
 *
 * @category Definitions
 */
export interface FieldDefinition<
  Input = unknown,
  Output = Input,
  Deps = NoDeps,
  Draft = DraftValue<Input> | undefined,
> {
  readonly kind: typeof DEFINITION_KIND.field
  /** @internal */
  readonly '~options': unknown
  /** @internal */
  readonly '~types'?: DefinitionTypes<Draft, Input, Output, Deps>
}

/**
 * A group definition, made with {@link defineGroup} or {@link defineGroupWithDeps}. A definition that refers to itself
 * is annotated with it: `GroupDefinition<Input, Output, Deps>`.
 *
 * @category Definitions
 */
export interface GroupDefinition<
  Input = unknown,
  Output = Input,
  Deps = NoDeps,
  Draft = DraftObject<Input>,
  Children = EmptyObject,
> {
  readonly kind: typeof DEFINITION_KIND.group
  readonly children: Children
  /** @internal */
  readonly '~options': unknown
  /** @internal */
  readonly '~types'?: DefinitionTypes<Draft, Input, Output, Deps>
}

/**
 * An array definition, made with {@link arrayOf}.
 *
 * @category Definitions
 */
export interface ArrayDefinition<Item = ItemSource> {
  readonly kind: typeof DEFINITION_KIND.array
  readonly item: Item
  /** @internal */
  readonly '~options': unknown
  /** @internal */
  readonly '~types'?: DefinitionTypes<
    Array<DraftOf<ResolveItem<Item>>>,
    Array<InputOf<ResolveItem<Item>>>,
    Array<OutputOf<ResolveItem<Item>>>,
    DepsOf<ResolveItem<Item>>
  >
}

/**
 * Any field, group or array definition.
 *
 * @category Definitions
 */
export type Definition = AnyFieldDefinition | AnyGroupDefinition | AnyArrayDefinition

export type AnyFieldDefinition = FieldDefinition<unknown, unknown, unknown, unknown>

export type AnyGroupDefinition = GroupDefinition<unknown, unknown, unknown, unknown, ChildDefinitions>

export interface AnyArrayDefinition {
  readonly kind: typeof DEFINITION_KIND.array
  readonly item: ItemSource
  readonly '~options': unknown
  readonly '~types'?: DefinitionTypes<unknown, unknown, unknown, unknown>
}

export type ChildDefinitions = Readonly<Record<string, Definition>>

export type ItemSource = Definition | (() => Definition)

export type ResolveItem<Item> = Item extends () => infer Resolved ? Resolved : Item

/**
 * The value a form holds for a definition while it is edited: declared groups and arrays always exist, and every
 * value is `undefined` while empty.
 *
 * @category Types
 */
export type DraftOf<Shape> = Shape extends { readonly '~types'?: { readonly draft: infer Draft } } ? Draft : unknown

/**
 * The value a definition's schemas accept.
 *
 * @category Types
 */
export type InputOf<Shape> = Shape extends { readonly '~types'?: { readonly input: infer Input } } ? Input : unknown

/**
 * The value a submit handler receives for a definition, after schema transforms. Children with `activeWhen` are
 * optional.
 *
 * @category Types
 */
export type OutputOf<Shape> = Shape extends { readonly '~types'?: { readonly output: infer Output } } ? Output : unknown

/**
 * The dependencies a definition needs, {@link NoDeps} when it needs none.
 *
 * @category Types
 */
export type DepsOf<Shape> = Shape extends { readonly '~types'?: { readonly deps: infer Deps } } ? Deps : unknown

export type RequiresDeps<Shape> = [DepsOf<Shape>] extends [NoDeps] ? false : true

export function resolveItemDefinition(definition: AnyArrayDefinition): Definition {
  return typeof definition.item == 'function' ? definition.item() : definition.item
}
