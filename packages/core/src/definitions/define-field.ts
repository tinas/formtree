import type { ReValidateMode, ValidationMode } from '../modes/display-mode'
import type { InferSchemaInput, InferSchemaOutput, StandardSchemaV1 } from '../standard-schema/standard-schema'
import type { AsyncValidationOptions } from './async-validation-options'
import type { FieldDefinition, NoDeps } from './definition'
import type { FieldRuntimeOptions, RuntimeSchemaSource } from './runtime-options'

import { toRuntimeAsyncValidation } from './async-validation-options'
import { DEFINITION_KIND } from './definition-kind'

/**
 * What a schema function receives when a definition builds its schema from its dependencies.
 *
 * @category Definitions
 */
export interface SchemaContext<Deps> {
  readonly deps: Deps
}

export type SchemaOption<Schema, Deps> = Schema | ((context: SchemaContext<Deps>) => Schema)

/**
 * Options of {@link defineField} and {@link defineFieldWithDeps}.
 *
 * @category Definitions
 */
export interface DefineFieldOptions<Schema extends StandardSchemaV1, Deps> {
  /** A Standard Schema, or a function that builds one from the dependencies; rebuilt only when they change. */
  readonly schema: SchemaOption<Schema, Deps>
  /** A check against something outside the form, such as a server. */
  readonly validateAsync?: AsyncValidationOptions<InferSchemaOutput<Schema>, Deps>
  /** When errors become visible for this field. Overrides the form's `mode`. */
  readonly mode?: ValidationMode
  /** When visible errors update for this field. Overrides the form's `reValidateMode`. */
  readonly reValidateMode?: ReValidateMode
}

export type FieldDefinitionOf<Schema extends StandardSchemaV1, Deps> = FieldDefinition<
  InferSchemaInput<Schema>,
  InferSchemaOutput<Schema>,
  Deps
>

/**
 * The function {@link defineFieldWithDeps} returns: it takes the options once the dependency type is fixed.
 *
 * @category Definitions
 */
export interface DefineFieldWithDeps<Deps> {
  <Schema extends StandardSchemaV1>(options: DefineFieldOptions<Schema, Deps>): FieldDefinitionOf<Schema, Deps>
}

/**
 * Defines a field: one value with its own schema. It holds `undefined` while empty, and the schema decides whether
 * empty is an error.
 *
 * @category Definitions
 */
export function defineField<Schema extends StandardSchemaV1>(
  options: DefineFieldOptions<Schema, NoDeps>,
): FieldDefinitionOf<Schema, NoDeps> {
  return createFieldDefinition(options)
}

/**
 * Defines a field that reads dependencies: values from outside the form that its rules need. The dependency type
 * goes in the first call and the options in the second, so the rest is still inferred:
 * `defineFieldWithDeps<{ cartId: string }>()({ schema, validateAsync })`.
 *
 * @category Definitions
 */
export function defineFieldWithDeps<Deps>(): DefineFieldWithDeps<Deps> {
  return createFieldDefinition
}

function createFieldDefinition<Schema extends StandardSchemaV1, Deps>(
  options: DefineFieldOptions<Schema, Deps>,
): FieldDefinitionOf<Schema, Deps> {
  const runtimeOptions: FieldRuntimeOptions = {
    schema: options.schema as RuntimeSchemaSource,
    validateAsync: toRuntimeAsyncValidation(options.validateAsync),
    mode: options.mode,
    reValidateMode: options.reValidateMode,
  }
  return {
    kind: DEFINITION_KIND.field,
    '~options': runtimeOptions,
  }
}
