import type { ErrorInput } from '../errors/form-error'
import type { StoredError } from '../errors/stored-error'
import type { ClearErrorsOptions, ListedError, ListErrorsOptions, SetErrorsOptions } from '../nodes/node-types'
import type { FormRuntime } from './form-runtime'

import { ERROR_SOURCE } from '../errors/form-error'
import { CLEAR_ON } from '../errors/stored-error'
import { domIdOf } from '../nodes/node-identity'
import { toFormError, visibilityContextOf } from '../nodes/node-state'
import { comparePaths, isWithinPath } from '../paths/path'
import { clearExternalErrors, setExternalErrors } from '../state/error-transitions'
import { activeErrors, visibleErrorsAt } from '../validation/visibility'
import { emitNodeEvent, FORM_EVENT } from './form-events'
import { commitState } from './form-runtime'

export interface NodeErrorsUpdate {
  readonly runtime: FormRuntime
  readonly nodeId: string
  readonly errors: ReadonlyArray<ErrorInput>
  readonly options?: SetErrorsOptions
}

export function setNodeErrors({ runtime, nodeId, errors, options = {} }: NodeErrorsUpdate): void {
  commitState(
    runtime,
    setExternalErrors(runtime.state, {
      nodeId,
      inputs: errors,
      source: options.source ?? ERROR_SOURCE.server,
      clearOn: options.clearOn ?? CLEAR_ON.change,
    }),
  )
  emitNodeEvent(runtime, FORM_EVENT.errors, nodeId)
}

export function clearNodeErrors(runtime: FormRuntime, nodeId: string, options: ClearErrorsOptions = {}): void {
  commitState(runtime, clearExternalErrors(runtime.state, { nodeId, source: options.source }))
  emitNodeEvent(runtime, FORM_EVENT.errors, nodeId)
}

export function listNodeErrors(
  runtime: FormRuntime,
  nodeId: string,
  options: ListErrorsOptions = {},
): Array<ListedError> {
  return errorsWithin(runtime, nodeId, options)
    .map(error => {
      return {
        ...toFormError(runtime.state, error),
        targetId: domIdOf(runtime, error.targetId),
      }
    })
    .sort((first, second) => comparePaths(first.path, second.path))
}

export function activeErrorsWithin(runtime: FormRuntime, nodeId: string): ReadonlyArray<StoredError> {
  return activeErrors(runtime.state).filter(error => isWithinPath(error.targetId, nodeId))
}

function errorsWithin(runtime: FormRuntime, nodeId: string, options: ListErrorsOptions): ReadonlyArray<StoredError> {
  const targetErrors = activeErrors(runtime.state).filter(error => {
    return options.deep ? isWithinPath(error.targetId, nodeId) : error.targetId == nodeId
  })
  if (options.includeHidden) {
    return targetErrors
  }
  const targetIds = new Set(targetErrors.map(error => error.targetId))
  const context = visibilityContextOf(runtime)
  return [...targetIds].flatMap(targetId => visibleErrorsAt(context, targetId))
}
