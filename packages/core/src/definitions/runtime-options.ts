import type { ValidateResult } from '../errors/form-error'
import type { ReValidateMode, ValidationMode } from '../modes/display-mode'
import type { StandardSchemaV1 } from '../standard-schema/standard-schema'
import type { RuntimeAsyncValidation } from './async-validation-options'
import type { AnyArrayDefinition, AnyFieldDefinition, AnyGroupDefinition, Definition } from './definition'

import { DEFINITION_KIND } from './definition-kind'

export interface RuntimeValueContext {
  readonly value: unknown
  readonly deps: unknown
}

export type RuntimeSchemaSource = StandardSchemaV1 | ((context: { readonly deps: unknown }) => StandardSchemaV1)

export interface FieldRuntimeOptions {
  readonly schema: RuntimeSchemaSource
  readonly validateAsync?: RuntimeAsyncValidation
  readonly mode?: ValidationMode
  readonly reValidateMode?: ReValidateMode
}

export interface GroupRuntimeOptions {
  readonly schema?: RuntimeSchemaSource
  readonly activeWhen: Readonly<Record<string, (context: RuntimeValueContext) => boolean>>
  readonly childDeps: Readonly<Record<string, (context: RuntimeValueContext) => unknown>>
  readonly validate?: (context: RuntimeValueContext) => ValidateResult
  readonly validateAsync?: RuntimeAsyncValidation
  readonly mode?: ValidationMode
  readonly reValidateMode?: ReValidateMode
}

export interface ArrayRuntimeOptions {
  readonly validate?: (rows: ReadonlyArray<unknown>) => ValidateResult
}

export interface DefinitionHandlers<Input, Result> {
  field(definition: AnyFieldDefinition, input: Input): Result
  group(definition: AnyGroupDefinition, input: Input): Result
  array(definition: AnyArrayDefinition, input: Input): Result
}

export function matchDefinition<Input, Result>(
  definition: Definition,
  handlers: DefinitionHandlers<Input, Result>,
  input: Input,
): Result {
  return handlers[definition.kind](definition as never, input)
}

export function fieldOptionsOf(definition: AnyFieldDefinition): FieldRuntimeOptions {
  return definition['~options'] as FieldRuntimeOptions
}

export function groupOptionsOf(definition: AnyGroupDefinition): GroupRuntimeOptions {
  return definition['~options'] as GroupRuntimeOptions
}

export function arrayOptionsOf(definition: AnyArrayDefinition): ArrayRuntimeOptions {
  return definition['~options'] as ArrayRuntimeOptions
}

export interface SharedRuntimeOptions {
  readonly validateAsync?: RuntimeAsyncValidation
  readonly mode?: ValidationMode
  readonly reValidateMode?: ReValidateMode
}

const SHARED_OPTIONS: DefinitionHandlers<undefined, SharedRuntimeOptions> = {
  field: fieldOptionsOf,
  group: groupOptionsOf,
  array: () => ({}),
}

export function sharedOptionsOf(definition: Definition): SharedRuntimeOptions {
  return matchDefinition(definition, SHARED_OPTIONS, undefined)
}

export function isGroupDefinition(definition: Definition): definition is AnyGroupDefinition {
  return definition.kind == DEFINITION_KIND.group
}
