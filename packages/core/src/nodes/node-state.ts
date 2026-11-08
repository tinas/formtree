import type { FormError } from '../errors/form-error'
import type { StoredError } from '../errors/stored-error'
import type { FormRuntime } from '../form/form-runtime'
import type { CheckState, FormState } from '../state/form-state'
import type { VisibilityContext } from '../validation/visibility'
import type { FailedCheck, FieldAttributes, NodeState } from './node-types'

import { inDefinitionOrder } from '../form/error-order'
import { deepEqual, shallowEqual } from '../paths/equality'
import { isWithinPath, splitPath } from '../paths/path'
import { getIn } from '../paths/value-tree'
import { hasPathWithin } from '../state/collections'
import { CHECK_STATUS } from '../state/form-state'
import { toPath } from '../state/node-id'
import { valueAt } from '../validation/output'
import { activeErrors, isActiveNode, visibleErrorsAt } from '../validation/visibility'
import { domIdOf, errorIdOf, pathOf } from './node-identity'

export function errorMessageOf(runtime: FormRuntime, state: NodeState<unknown>): string | undefined {
  const [error] = state.errors
  return error == undefined ? undefined : runtime.options.formatError(error)
}

export function visibilityContextOf(runtime: FormRuntime): VisibilityContext {
  return {
    definition: runtime.definition,
    defaults: runtime.options,
    state: runtime.state,
  }
}

export function toFormError(state: FormState, error: StoredError): FormError {
  return {
    path: toPath(state.arrayKeys, error.targetId) ?? '',
    code: error.code,
    params: error.params,
    source: error.source,
  }
}

export function failedChecksWithin(state: FormState, nodeId: string): Array<FailedCheck> {
  return checksWithin(state, nodeId).flatMap(([ownerId, check]) =>
    check.status == CHECK_STATUS.failed ? [{ path: toPath(state.arrayKeys, ownerId) ?? '', error: check.error }] : [],
  )
}

export function failedCheckIdsWithin(state: FormState, nodeId: string): Array<string> {
  return checksWithin(state, nodeId)
    .filter(([, check]) => check.status == CHECK_STATUS.failed)
    .map(([ownerId]) => ownerId)
}

export function initialValueAt(state: FormState, nodeId: string): unknown {
  const baselinePath = toPath(state.initialArrayKeys, nodeId)
  return baselinePath == undefined ? undefined : getIn(state.initialValue, splitPath(baselinePath))
}

export interface NodeStateInput {
  readonly runtime: FormRuntime
  readonly nodeId: string
  readonly previous: NodeState<unknown> | undefined
  readonly required: boolean
}

export function computeNodeState({ runtime, nodeId, previous, required }: NodeStateInput): NodeState<unknown> {
  const state = runtime.state
  const value = valueAt(state, nodeId)
  const initialValue = initialValueAt(state, nodeId)
  const errors = inDefinitionOrder(runtime, visibleErrorsAt(visibilityContextOf(runtime), nodeId)).map(error =>
    toFormError(state, error),
  )
  const failedChecks = keepIfSame(previous?.failedChecks, failedChecksWithin(state, nodeId))
  return {
    value,
    initialValue,
    errors: keepIfSame(previous?.errors, errors),
    valid: failedChecks.length == 0 && !activeErrors(state).some(error => isWithinPath(error.targetId, nodeId)),
    required,
    dirty: !deepEqual(value, initialValue),
    touched: hasPathWithin(state.touched, nodeId),
    validating:
      checksWithin(state, nodeId).some(([, check]) => check.status == CHECK_STATUS.pending) ||
      hasPathWithin(state.pendingSchemas, nodeId),
    failedChecks,
    submitting: state.submitting.has(nodeId),
    submitCount: state.submitCounts.get(nodeId) ?? 0,
    active: isActiveNode(state, nodeId),
  }
}

export function computeNodeAttributes(
  runtime: FormRuntime,
  nodeId: string,
  state: NodeState<unknown>,
): FieldAttributes {
  const hasErrors = state.errors.length > 0
  return {
    id: domIdOf(runtime, nodeId),
    name: pathOf(runtime, nodeId),
    'aria-invalid': hasErrors ? 'true' : 'false',
    'aria-describedby': hasErrors ? errorIdOf(runtime, nodeId) : null,
    'aria-required': state.required ? 'true' : null,
  }
}

function checksWithin(state: FormState, nodeId: string): Array<[string, CheckState]> {
  return [...state.checks].filter(([ownerId]) => isWithinPath(ownerId, nodeId))
}

export function keepIfSame<Item extends object>(
  previous: ReadonlyArray<Item> | undefined,
  next: ReadonlyArray<Item>,
): ReadonlyArray<Item> {
  return previous != undefined && areSameRecords(previous, next) ? previous : next
}

function areSameRecords(previous: ReadonlyArray<object>, next: ReadonlyArray<object>): boolean {
  return previous.length == next.length && previous.every((record, index) => shallowEqual(record, next[index]))
}
