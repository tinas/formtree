/**
 * The [Standard Schema](https://standardschema.dev) interface that Zod, Valibot, ArkType and others implement.
 *
 * @category Validation
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaProps<Input, Output>
}

export interface StandardSchemaProps<Input = unknown, Output = Input> {
  readonly version: 1
  readonly vendor: string
  readonly validate: (value: unknown) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>
  readonly types?: StandardSchemaTypes<Input, Output> | undefined
}

export type StandardSchemaResult<Output> = StandardSchemaSuccess<Output> | StandardSchemaFailure

export interface StandardSchemaSuccess<Output> {
  readonly value: Output
  readonly issues?: undefined
}

export interface StandardSchemaFailure {
  readonly issues: ReadonlyArray<StandardSchemaIssue>
}

export interface StandardSchemaIssue {
  readonly message: string
  readonly path?: ReadonlyArray<PropertyKey | StandardSchemaPathSegment> | undefined
}

export interface StandardSchemaPathSegment {
  readonly key: PropertyKey
}

export interface StandardSchemaTypes<Input, Output> {
  readonly input: Input
  readonly output: Output
}

export type InferSchemaInput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['input']

export type InferSchemaOutput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output']

export function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  return (typeof value == 'object' || typeof value == 'function') && value != null && '~standard' in value
}
