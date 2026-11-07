import type { AnyArrayDefinition, AnyFieldDefinition, AnyGroupDefinition } from '../definitions/definition'
import type { DefinitionHandlers, RuntimeSchemaSource } from '../definitions/runtime-options'
import type { ErrorInput } from '../errors/form-error'
import type { StoredError } from '../errors/stored-error'
import type { SchemaRun } from '../standard-schema/run-schema'
import type { StandardSchemaV1 } from '../standard-schema/standard-schema'
import type { FormState } from '../state/form-state'
import type { ArrayKeys } from '../state/node-id'
import type { Scope } from './scopes'

import { arrayOptionsOf, fieldOptionsOf, groupOptionsOf, matchDefinition } from '../definitions/runtime-options'
import { ERROR_SOURCE, toErrorInputs } from '../errors/form-error'
import { CLEAR_ON } from '../errors/stored-error'
import { isWithinPath } from '../paths/path'
import { runSchema } from '../standard-schema/run-schema'
import { isStandardSchema } from '../standard-schema/standard-schema'
import { withAdded, withDeleted } from '../state/collections'
import { replaceOwnedErrors, toStoredErrors } from '../state/error-transitions'

export const SCHEMA_STATUS = {
  valid: 'valid',
  invalid: 'invalid',
  pending: 'pending',
} as const

export type SchemaStatus = (typeof SCHEMA_STATUS)[keyof typeof SCHEMA_STATUS]

export interface SyncEntry {
  readonly value: unknown
  readonly deps: unknown
  readonly schema: StandardSchemaV1 | undefined
  readonly status: SchemaStatus
  readonly output: unknown
  readonly token: number
  readonly stale: boolean
}

export interface PendingSchemaRun {
  readonly nodeId: string
  readonly token: number
  readonly run: Promise<SchemaRun>
}

export interface SyncValidationInput {
  readonly entries: Map<string, SyncEntry>
  readonly state: FormState
  readonly scopes: ReadonlyArray<Scope>
}

export interface SyncValidationResult {
  readonly state: FormState
  readonly pending: ReadonlyArray<PendingSchemaRun>
}

interface ScopeValidationInput {
  readonly scope: Scope
  readonly previous: SyncEntry | undefined
}

interface ScopeValidation {
  readonly schema: StandardSchemaV1 | undefined
  readonly run: SchemaRun | Promise<SchemaRun>
  readonly validateErrors: ReadonlyArray<ErrorInput>
}

const SCOPE_VALIDATORS: DefinitionHandlers<ScopeValidationInput, ScopeValidation> = {
  field: validateFieldScope,
  group: validateGroupScope,
  array: validateArrayScope,
}

const PASSING_RUN: SchemaRun = { valid: true, output: {} }

export function applySyncValidation({ entries, state, scopes }: SyncValidationInput): SyncValidationResult {
  const pending: Array<PendingSchemaRun> = []
  let next = state
  for (const scope of scopes) {
    const previous = entries.get(scope.nodeId)
    const isUnchanged =
      previous != undefined &&
      !previous.stale &&
      Object.is(previous.value, scope.value) &&
      Object.is(previous.deps, scope.deps)
    if (!isUnchanged) {
      const validation = matchDefinition(scope.definition, SCOPE_VALIDATORS, { scope, previous })
      const token = (previous?.token ?? 0) + 1
      next = applyScopeValidation({ state: next, scope, validation })
      entries.set(scope.nodeId, toSyncEntry({ scope, validation, token }))
      if (validation.run instanceof Promise) {
        pending.push({ nodeId: scope.nodeId, token, run: validation.run })
      }
    }
  }
  return { state: next, pending }
}

export function markSyncEntriesStaleFor(entries: Map<string, SyncEntry>, nodeId: string): void {
  for (const [entryId, entry] of entries) {
    if (isWithinPath(entryId, nodeId) || isWithinPath(nodeId, entryId)) {
      entries.set(entryId, { ...entry, stale: true })
    }
  }
}

export interface SchemaSettlement {
  readonly entries: Map<string, SyncEntry>
  readonly state: FormState
  readonly pending: PendingSchemaRun
  readonly run: SchemaRun
}

export function settleSchemaRun({ entries, state, pending, run }: SchemaSettlement): FormState {
  const entry = entries.get(pending.nodeId)
  if (entry == undefined || entry.token != pending.token) {
    return state
  }
  entries.set(pending.nodeId, {
    ...entry,
    status: run.valid ? SCHEMA_STATUS.valid : SCHEMA_STATUS.invalid,
    output: run.valid ? run.output : undefined,
  })
  return {
    ...state,
    errors: replaceOwnedErrors(state.errors, {
      ownerId: pending.nodeId,
      source: ERROR_SOURCE.schema,
      errors: schemaErrors({ run, ownerId: pending.nodeId, arrayKeys: state.arrayKeys }),
    }),
    pendingSchemas: withDeleted(state.pendingSchemas, pending.nodeId),
  }
}

interface ScopeValidationApplication {
  readonly state: FormState
  readonly scope: Scope
  readonly validation: ScopeValidation
}

function applyScopeValidation({ state, scope, validation }: ScopeValidationApplication): FormState {
  const ownerId = scope.nodeId
  const isPending = validation.run instanceof Promise
  const withSchemaErrors = replaceOwnedErrors(state.errors, {
    ownerId,
    source: ERROR_SOURCE.schema,
    errors:
      validation.run instanceof Promise
        ? []
        : schemaErrors({ run: validation.run, ownerId, arrayKeys: state.arrayKeys }),
  })
  return {
    ...state,
    errors: replaceOwnedErrors(withSchemaErrors, {
      ownerId,
      source: ERROR_SOURCE.validate,
      errors: toStoredErrors({
        inputs: validation.validateErrors,
        ownerId,
        source: ERROR_SOURCE.validate,
        clearOn: CLEAR_ON.never,
        arrayKeys: state.arrayKeys,
      }),
    }),
    pendingSchemas: isPending ? withAdded(state.pendingSchemas, ownerId) : withDeleted(state.pendingSchemas, ownerId),
  }
}

interface SchemaErrorsInput {
  readonly run: SchemaRun
  readonly ownerId: string
  readonly arrayKeys: ArrayKeys
}

function schemaErrors({ run, ownerId, arrayKeys }: SchemaErrorsInput): Array<StoredError> {
  if (run.valid) {
    return []
  }
  return toStoredErrors({
    inputs: run.errors,
    ownerId,
    source: ERROR_SOURCE.schema,
    clearOn: CLEAR_ON.never,
    arrayKeys,
  })
}

interface SyncEntryInput {
  readonly scope: Scope
  readonly validation: ScopeValidation
  readonly token: number
}

function toSyncEntry({ scope, validation, token }: SyncEntryInput): SyncEntry {
  const run = validation.run
  return {
    value: scope.value,
    deps: scope.deps,
    schema: validation.schema,
    status: run instanceof Promise ? SCHEMA_STATUS.pending : run.valid ? SCHEMA_STATUS.valid : SCHEMA_STATUS.invalid,
    output: run instanceof Promise || !run.valid ? undefined : run.output,
    token,
    stale: false,
  }
}

function validateFieldScope(
  definition: AnyFieldDefinition,
  { scope, previous }: ScopeValidationInput,
): ScopeValidation {
  const schema = resolveSchema({ source: fieldOptionsOf(definition).schema, scope, previous })
  return {
    schema,
    run: runSchema(schema, scope.value),
    validateErrors: [],
  }
}

function validateGroupScope(
  definition: AnyGroupDefinition,
  { scope, previous }: ScopeValidationInput,
): ScopeValidation {
  const options = groupOptionsOf(definition)
  const schema = options.schema == undefined ? undefined : resolveSchema({ source: options.schema, scope, previous })
  return {
    schema,
    run: schema == undefined ? PASSING_RUN : runSchema(schema, scope.value),
    validateErrors: toErrorInputs(options.validate?.({ value: scope.value, deps: scope.deps })),
  }
}

function validateArrayScope(definition: AnyArrayDefinition, { scope }: ScopeValidationInput): ScopeValidation {
  const rows = Array.isArray(scope.value) ? scope.value : []
  return {
    schema: undefined,
    run: PASSING_RUN,
    validateErrors: toErrorInputs(arrayOptionsOf(definition).validate?.(rows)),
  }
}

interface SchemaResolution {
  readonly source: RuntimeSchemaSource
  readonly scope: Scope
  readonly previous: SyncEntry | undefined
}

function resolveSchema({ source, scope, previous }: SchemaResolution): StandardSchemaV1 {
  if (isStandardSchema(source)) {
    return source
  }
  if (previous?.schema != undefined && Object.is(previous.deps, scope.deps)) {
    return previous.schema
  }
  return source({ deps: scope.deps })
}
