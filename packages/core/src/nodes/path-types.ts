import type { DefinitionTypes, DraftOf, InputOf, NoDeps, ResolveItem } from '../definitions/definition'
import type { DEFINITION_KIND } from '../definitions/definition-kind'
import type { ElementOf, Leaf, Present, PropertyOf } from '../types'
import type { NODE_KIND } from './node-kind'

/**
 * Shape of a node without a definition, for adapters.
 *
 * @internal
 */
export interface LensShape<Draft, Input> {
  readonly kind: typeof NODE_KIND.lens
  readonly '~types'?: DefinitionTypes<Draft, Input, Input, NoDeps>
}

export type NodeView = 'field' | 'group' | 'array'

interface GroupLike<Children> {
  readonly kind: typeof DEFINITION_KIND.group
  readonly children: Children
}

interface ArrayLike<Item> {
  readonly kind: typeof DEFINITION_KIND.array
  readonly item: Item
}

type IsLeafDraft<Draft> = [Present<Draft>] extends [Leaf] ? true : false

type IsListDraft<Draft> =
  IsLeafDraft<Draft> extends true ? false : Present<Draft> extends ReadonlyArray<unknown> ? true : false

type LensAt<Draft, Input, Key extends string> =
  IsListDraft<Draft> extends true
    ? Key extends `${number}`
      ? LensShape<ElementOf<Present<Draft>>, ElementOf<Present<Input>>>
      : never
    : Key extends keyof Present<Draft>
      ? LensShape<Present<Draft>[Key], PropertyOf<Present<Input>, Key>>
      : never

type LensKeys<Draft> =
  IsLeafDraft<Draft> extends true
    ? never
    : IsListDraft<Draft> extends true
      ? `${number}`
      : keyof Present<Draft> & string

export type ShapeAt<Shape, Key extends string> =
  Shape extends GroupLike<infer Children>
    ? Key extends keyof Children
      ? Children[Key]
      : LensAt<DraftOf<Shape>, InputOf<Shape>, Key>
    : Shape extends ArrayLike<infer Item>
      ? Key extends `${number}`
        ? ResolveItem<Item>
        : never
      : LensAt<DraftOf<Shape>, InputOf<Shape>, Key>

export type NavigableKeys<Shape> =
  Shape extends GroupLike<infer Children>
    ? (keyof Children | keyof Present<DraftOf<Shape>>) & string
    : Shape extends ArrayLike<unknown>
      ? `${number}`
      : LensKeys<DraftOf<Shape>>

export type IsGroupShape<Shape> =
  Shape extends GroupLike<unknown>
    ? true
    : Shape extends ArrayLike<unknown>
      ? false
      : IsLeafDraft<DraftOf<Shape>> extends true
        ? false
        : IsListDraft<DraftOf<Shape>> extends true
          ? false
          : true

export type IsArrayShape<Shape> =
  Shape extends ArrayLike<unknown> ? true : Shape extends GroupLike<unknown> ? false : IsListDraft<DraftOf<Shape>>

type FitsView<Shape, View extends NodeView> = View extends 'group'
  ? IsGroupShape<Shape>
  : View extends 'array'
    ? IsArrayShape<Shape>
    : true

type ViewKeys<Shape, View extends NodeView> = {
  [Key in NavigableKeys<Shape>]: FitsView<ShapeAt<Shape, Key>, View> extends true ? Key : never
}[NavigableKeys<Shape>]

export type PathInput<Shape, Path extends string, View extends NodeView> = Path extends `${infer Head}.${infer Rest}`
  ? Head extends NavigableKeys<Shape>
    ? `${Head}.${PathInput<ShapeAt<Shape, Head>, Rest, View>}`
    : NavigableKeys<Shape>
  : Path extends ViewKeys<Shape, View>
    ? Path
    : ViewKeys<Shape, View>

export type ShapeAtPath<Shape, Path extends string> = Path extends `${infer Head}.${infer Rest}`
  ? ShapeAtPath<ShapeAt<Shape, Head>, Rest>
  : ShapeAt<Shape, Path>

export type ItemShapeOf<Shape> = ShapeAt<Shape, `${number}`>
