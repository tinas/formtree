import type { ValidateResult } from '../errors/form-error'
import type { ReValidateMode, ValidationMode } from '../modes/display-mode'
import type { InferSchemaInput, InferSchemaOutput, StandardSchemaV1 } from '../standard-schema/standard-schema'
import type { DraftObject, EmptyObject, Simplify } from '../types'
import type { AsyncValidationOptions } from './async-validation-options'
import type { SchemaOption } from './define-field'
import type {
  ChildDefinitions,
  DepsOf,
  DraftOf,
  GroupDefinition,
  InputOf,
  NoDeps,
  OutputOf,
  RequiresDeps,
} from './definition'
import type { GroupRuntimeOptions, RuntimeSchemaSource } from './runtime-options'

import { toRuntimeAsyncValidation } from './async-validation-options'
import { DEFINITION_KIND } from './definition-kind'

/**
 * What the callbacks of a group receive: its draft value and its dependencies.
 *
 * @category Definitions
 */
export interface ValueContext<Value, Deps> {
  readonly value: Value
  readonly deps: Deps
}

type OwnInput<Schema> = Schema extends StandardSchemaV1 ? InferSchemaInput<Schema> : EmptyObject

type OwnOutput<Schema> = Schema extends StandardSchemaV1 ? InferSchemaOutput<Schema> : EmptyObject

export type OwnDraft<Schema> = DraftObject<OwnInput<Schema>>

type FieldKeys<Children> = {
  [Key in keyof Children]: Children[Key] extends { readonly kind: typeof DEFINITION_KIND.field } ? Key : never
}[keyof Children]

export type GroupDraft<Schema, Children> = Simplify<
  OwnDraft<Schema> & {
    -readonly [Key in Exclude<keyof Children, FieldKeys<Children>>]: DraftOf<Children[Key]>
  } & {
    -readonly [Key in FieldKeys<Children>]?: DraftOf<Children[Key]>
  }
>

export type GroupInput<Schema, Children> = Simplify<
  OwnInput<Schema> & { -readonly [Key in keyof Children]: InputOf<Children[Key]> }
>

export type GroupOutput<Schema, Children, ActiveKeys extends PropertyKey> = Simplify<
  OwnOutput<Schema> & {
    -readonly [Key in Exclude<keyof Children, ActiveKeys>]: OutputOf<Children[Key]>
  } & {
    -readonly [Key in Extract<keyof Children, ActiveKeys>]?: OutputOf<Children[Key]>
  }
>

export type ActiveWhenOptions<Schema, ActiveKeys extends PropertyKey, Deps> = {
  readonly [Key in ActiveKeys]: (context: ValueContext<OwnDraft<Schema>, Deps>) => boolean
}

export type ChildDepsOptions<Schema, Children, Deps> = {
  readonly [Key in keyof Children as RequiresDeps<Children[Key]> extends true ? Key : never]: (
    context: ValueContext<OwnDraft<Schema>, Deps>,
  ) => DepsOf<Children[Key]>
}

type ChildDepsRequirement<Schema, Children, Deps> = [keyof ChildDepsOptions<Schema, Children, Deps>] extends [never]
  ? {
      /** Dependencies for each child that needs them, from the group's own draft and dependencies. */
      readonly childDeps?: ChildDepsOptions<Schema, Children, Deps>
    }
  : {
      /** Dependencies for each child that needs them, from the group's own draft and dependencies. Required here. */
      readonly childDeps: ChildDepsOptions<Schema, Children, Deps>
    }

type DisjointKeysRequirement<Schema, Children> = [Extract<keyof OwnInput<Schema>, keyof Children>] extends [never]
  ? unknown
  : {
      readonly '~error': `"${Extract<keyof OwnInput<Schema>, keyof Children> & string}" is declared in both schema and children`
    }

/**
 * Options of {@link defineGroup} and {@link defineGroupWithDeps}. When `schema` is a function of the dependencies,
 * write it before the callbacks, or they see none of its keys.
 *
 * @category Definitions
 */
export interface DefineGroupBaseOptions<Schema, Children, ActiveKeys extends PropertyKey, Deps> {
  /** The group's own keys, as a Standard Schema or a function of the dependencies. A key is here or in `children`. */
  readonly schema?: SchemaOption<Schema, Deps>
  /**
   * The group's children: keys with a definition of their own, each with its own schema, rules and output. The keys
   * of `schema` are nodes too, but not children; they take their rules from the group.
   */
  readonly children?: Children
  /**
   * When each listed child takes part, decided from the group's own draft. An inactive child is not validated and
   * stays out of the output, and its value is kept.
   */
  readonly activeWhen?: ActiveWhenOptions<Schema, ActiveKeys, Deps>
  /** A rule across the group's values, children included. Error paths are relative to the group. */
  readonly validate?: (context: ValueContext<GroupDraft<Schema, Children>, Deps>) => ValidateResult
  /** A check against something outside the form, run on the group's output. */
  readonly validateAsync?: AsyncValidationOptions<GroupOutput<Schema, Children, ActiveKeys>, Deps>
  /** When errors become visible inside this group. Overrides the form's `mode`. */
  readonly mode?: ValidationMode
  /** When visible errors update inside this group. Overrides the form's `reValidateMode`. */
  readonly reValidateMode?: ReValidateMode
}

/**
 * {@link DefineGroupBaseOptions}, plus `childDeps` when a child needs dependencies, and a type error when a key is in
 * both `schema` and `children`.
 *
 * @category Definitions
 */
export type DefineGroupOptions<Schema, Children, ActiveKeys extends PropertyKey, Deps> = DefineGroupBaseOptions<
  Schema,
  Children,
  ActiveKeys,
  Deps
> &
  ChildDepsRequirement<Schema, Children, Deps> &
  DisjointKeysRequirement<Schema, Children>

export type GroupDefinitionOf<Schema, Children, ActiveKeys extends PropertyKey, Deps> = GroupDefinition<
  GroupInput<Schema, Children>,
  GroupOutput<Schema, Children, ActiveKeys>,
  Deps,
  GroupDraft<Schema, Children>,
  Children
>

/**
 * The function {@link defineGroupWithDeps} returns: it takes the options once the dependency type is fixed.
 *
 * @category Definitions
 */
export interface DefineGroupWithDeps<Deps> {
  <
    Schema extends StandardSchemaV1 | undefined = undefined,
    Children extends ChildDefinitions = EmptyObject,
    ActiveKeys extends keyof Children = never,
  >(
    options: DefineGroupOptions<Schema, Children, ActiveKeys, Deps>,
  ): GroupDefinitionOf<Schema, NoInfer<Children>, NoInfer<ActiveKeys>, Deps>
}

/**
 * Defines a group: its own keys in `schema`, nested definitions in `children`, and the rules that relate them. A
 * declared group always exists in the draft as an object.
 *
 * @category Definitions
 */
export function defineGroup<
  Schema extends StandardSchemaV1 | undefined = undefined,
  Children extends ChildDefinitions = EmptyObject,
  ActiveKeys extends keyof Children = never,
>(
  options: DefineGroupOptions<Schema, Children, ActiveKeys, NoDeps>,
): GroupDefinitionOf<Schema, NoInfer<Children>, NoInfer<ActiveKeys>, NoDeps> {
  return createGroupDefinition(options)
}

/**
 * Defines a group that reads dependencies: values from outside the form that its rules need. The dependency type goes
 * in the first call and the options in the second: `defineGroupWithDeps<{ countries: Array<string> }>()({ ... })`.
 *
 * @category Definitions
 */
export function defineGroupWithDeps<Deps>(): DefineGroupWithDeps<Deps> {
  return createGroupDefinition
}

function createGroupDefinition<Schema, Children extends ChildDefinitions, ActiveKeys extends keyof Children, Deps>(
  options: DefineGroupBaseOptions<Schema, Children, ActiveKeys, Deps> & {
    readonly childDeps?: ChildDepsOptions<Schema, Children, Deps>
  },
): GroupDefinitionOf<Schema, Children, ActiveKeys, Deps> {
  const runtimeOptions: GroupRuntimeOptions = {
    schema: options.schema as RuntimeSchemaSource | undefined,
    activeWhen: (options.activeWhen ?? {}) as GroupRuntimeOptions['activeWhen'],
    childDeps: (options.childDeps ?? {}) as GroupRuntimeOptions['childDeps'],
    validate: options.validate as GroupRuntimeOptions['validate'],
    validateAsync: toRuntimeAsyncValidation(options.validateAsync),
    mode: options.mode,
    reValidateMode: options.reValidateMode,
  }
  return {
    kind: DEFINITION_KIND.group,
    children: options.children ?? ({} as Children),
    '~options': runtimeOptions,
  }
}
