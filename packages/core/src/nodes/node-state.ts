import type { FormError } from '../errors/form-error'
import type { StoredError } from '../errors/stored-error'
import type { FormRuntime } from '../form/form-runtime'
import type { CheckState, FormState } from '../state/form-state'
import type { VisibilityContext } from '../validation/visibility'
import type { FailedCheck, NodeState } from './node-types'

import { deepEqual, shallowEqual } from '../paths/equality'
import { isWithinPath, splitPath } from '../paths/path'
import { getIn } from '../paths/value-tree'
import { hasPathWithin } from '../state/collections'
import { CHECK_STATUS } from '../state/form-state'
import { toPath } from '../state/node-id'
import { valueAt } from '../validation/output'
import { activeErrors, isActiveNode, visibleErrorsAt } from '../validation/visibility'

export function errorMessageOf(runtime: FormRuntime, nodeId: string): string | undefined {
  const [error] = readNodeState(runtime, nodeId).errors
  return error == undefined ? undefined : runtime.options.formatError(error)
}

export function readNodeState(runtime: FormRuntime, nodeId: string): NodeState<unknown> {
  const cached = runtime.nodeStates.get(nodeId)
  if (cached?.version == runtime.version) {
    return cached.state
  }
  const computed = computeNodeState(runtime, nodeId, cached?.state)
  const state = cached != undefined && shallowEqual(cached.state, computed) ? cached.state : computed
  runtime.nodeStates.set(nodeId, { version: runtime.version, state })
  return state
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

function computeNodeState(
  runtime: FormRuntime,
  nodeId: string,
  previous: NodeState<unknown> | undefined,
): NodeState<unknown> {
  const state = runtime.state
  const value = valueAt(state, nodeId)
  const initialValue = initialValueAt(state, nodeId)
  const errors = visibleErrorsAt(visibilityContextOf(runtime), nodeId).map(error => toFormError(state, error))
  const failedChecks = keepIfSame(previous?.failedChecks, failedChecksWithin(state, nodeId))
  return {
    value,
    initialValue,
    errors: keepIfSame(previous?.errors, errors),
    valid: failedChecks.length == 0 && !activeErrors(state).some(error => isWithinPath(error.targetId, nodeId)),
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

function checksWithin(state: FormState, nodeId: string): Array<[string, CheckState]> {
  return [...state.checks].filter(([ownerId]) => isWithinPath(ownerId, nodeId))
}

function keepIfSame<Item extends object>(
  previous: ReadonlyArray<Item> | undefined,
  next: ReadonlyArray<Item>,
): ReadonlyArray<Item> {
  return previous != undefined && areSameRecords(previous, next) ? previous : next
}

function areSameRecords(previous: ReadonlyArray<object>, next: ReadonlyArray<object>): boolean {
  return previous.length == next.length && previous.every((record, index) => shallowEqual(record, next[index]))
}
