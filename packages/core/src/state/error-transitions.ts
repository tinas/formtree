import type { ErrorInput, ErrorSource } from '../errors/form-error'
import type { ClearOn, StoredError } from '../errors/stored-error'
import type { FormState } from './form-state'
import type { ArrayKeys } from './node-id'

import { isInternalErrorSource } from '../errors/form-error'
import { CLEAR_ON } from '../errors/stored-error'
import { isRelatedPath, isWithinPath } from '../paths/path'
import { toNodeId } from './node-id'

export interface StoredErrorsInput {
  readonly inputs: ReadonlyArray<ErrorInput>
  readonly ownerId: string
  readonly source: ErrorSource
  readonly clearOn: ClearOn
  readonly arrayKeys: ArrayKeys
}

export function toStoredErrors({ inputs, ownerId, source, clearOn, arrayKeys }: StoredErrorsInput): Array<StoredError> {
  return inputs.map(input => {
    return {
      targetId: toNodeId(arrayKeys, ownerId, input.path ?? '') ?? ownerId,
      ownerId,
      source,
      code: input.code,
      params: input.params,
      clearOn,
    }
  })
}

export interface OwnedErrorsReplacement {
  readonly ownerId: string
  readonly source: ErrorSource
  readonly errors: ReadonlyArray<StoredError>
}

export function replaceOwnedErrors(
  errors: ReadonlyArray<StoredError>,
  { ownerId, source, errors: replacement }: OwnedErrorsReplacement,
): ReadonlyArray<StoredError> {
  const kept = errors.filter(error => error.ownerId != ownerId || error.source != source)
  return replacement.length == 0 && kept.length == errors.length ? errors : [...kept, ...replacement]
}

export interface ExternalErrorsInput {
  readonly nodeId: string
  readonly inputs: ReadonlyArray<ErrorInput>
  readonly source: ErrorSource
  readonly clearOn: ClearOn
}

export function setExternalErrors(
  state: FormState,
  { nodeId, inputs, source, clearOn }: ExternalErrorsInput,
): FormState {
  const errors = toStoredErrors({ inputs, ownerId: nodeId, source, clearOn, arrayKeys: state.arrayKeys })
  return {
    ...state,
    errors: replaceOwnedErrors(state.errors, { ownerId: nodeId, source, errors }),
  }
}

export interface ClearExternalErrorsInput {
  readonly nodeId: string
  readonly source?: ErrorSource
}

export function clearExternalErrors(state: FormState, { nodeId, source }: ClearExternalErrorsInput): FormState {
  return {
    ...state,
    errors: state.errors.filter(error => {
      const isExternal = !isInternalErrorSource(error.source)
      const matchesSource = source == undefined || error.source == source
      return !(isExternal && matchesSource && isWithinPath(error.targetId, nodeId))
    }),
  }
}

export function clearErrorsOnValueChange(
  errors: ReadonlyArray<StoredError>,
  nodeId: string,
): ReadonlyArray<StoredError> {
  return errors.filter(error => !(error.clearOn == CLEAR_ON.change && isRelatedPath(error.targetId, nodeId)))
}

export function clearErrorsOnStructureChange(
  errors: ReadonlyArray<StoredError>,
  arrayId: string,
): ReadonlyArray<StoredError> {
  return errors.filter(error => !(error.clearOn == CLEAR_ON.change && isWithinPath(arrayId, error.targetId)))
}

export function clearErrorsOnSubmit(errors: ReadonlyArray<StoredError>, nodeId: string): ReadonlyArray<StoredError> {
  return errors.filter(error => !(error.clearOn == CLEAR_ON.submit && isWithinPath(error.targetId, nodeId)))
}
