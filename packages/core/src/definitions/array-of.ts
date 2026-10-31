import type { ValidateResult } from '../errors/form-error'
import type { StandardSchemaV1 } from '../standard-schema/standard-schema'
import type { FieldDefinitionOf } from './define-field'
import type { ArrayDefinition, DraftOf, ItemSource, NoDeps, ResolveItem } from './definition'
import type { ArrayRuntimeOptions } from './runtime-options'

import { isStandardSchema } from '../standard-schema/standard-schema'
import { defineField } from './define-field'
import { DEFINITION_KIND } from './definition-kind'

/**
 * Options of {@link arrayOf}.
 *
 * @category Definitions
 */
export interface ArrayOfOptions<Item> {
  /** A rule across items. It receives the drafts of all items, and error paths start with the item index. */
  readonly validate?: (rows: Array<DraftOf<ResolveItem<Item>>>) => ValidateResult
}

/**
 * Defines an array whose items are fields of the given Standard Schema.
 *
 * @category Definitions
 */
export function arrayOf<Schema extends StandardSchemaV1>(
  item: Schema,
  options?: ArrayOfOptions<FieldDefinitionOf<Schema, NoDeps>>,
): ArrayDefinition<FieldDefinitionOf<Schema, NoDeps>>
/**
 * Defines an array of a definition, or of `() => definition` for a definition that refers to itself. Items are
 * identified by key, so their errors and touched state move with them.
 */
export function arrayOf<Item extends ItemSource>(item: Item, options?: ArrayOfOptions<Item>): ArrayDefinition<Item>
export function arrayOf(
  item: ItemSource | StandardSchemaV1,
  options: ArrayOfOptions<ItemSource> = {},
): ArrayDefinition<ItemSource> {
  const runtimeOptions: ArrayRuntimeOptions = {
    validate: options.validate as ArrayRuntimeOptions['validate'],
  }
  return {
    kind: DEFINITION_KIND.array,
    item: isStandardSchema(item) ? defineField({ schema: item }) : item,
    '~options': runtimeOptions,
  }
}
