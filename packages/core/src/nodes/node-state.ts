import type { FormError } from '../errors/form-error'
import type { StoredError } from '../errors/stored-error'
import type { FormRuntime } from '../form/form-runtime'
import type { FormState } from '../state/form-state'
import type { VisibilityContext } from '../validation/visibility'
import type { NodeState } from './node-types'

import { deepEqual } from '../paths/equality'
import { isWithinPath, splitPath } from '../paths/path'
import { getIn } from '../paths/value-tree'
import { hasPathWithin } from '../state/collections'
import { toPath } from '../state/node-id'
import { valueAt } from '../validation/output'
import { activeErrors, isActiveNode, visibleErrorsAt } from '../validation/visibility'

export function readNodeState(runtime: FormRuntime, nodeId: string): NodeState<unknown> {
  const cached = runtime.nodeStates.get(nodeId)
  if (cached?.version == runtime.version) {
    return cached.state
  }
  const computed = computeNodeState(runtime, nodeId)
  const state = cached != undefined && isSameNodeState(cached.state, computed) ? cached.state : computed
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

export function initialValueAt(state: FormState, nodeId: string): unknown {
  const baselinePath = toPath(state.initialArrayKeys, nodeId)
  return baselinePath == undefined ? undefined : getIn(state.initialValue, splitPath(baselinePath))
}

function computeNodeState(runtime: FormRuntime, nodeId: string): NodeState<unknown> {
  const state = runtime.state
  const value = valueAt(state, nodeId)
  const initialValue = initialValueAt(state, nodeId)
  return {
    value,
    initialValue,
    errors: visibleErrorsAt(visibilityContextOf(runtime), nodeId).map(error => toFormError(state, error)),
    valid: !activeErrors(state).some(error => isWithinPath(error.targetId, nodeId)),
    dirty: !deepEqual(value, initialValue),
    touched: hasPathWithin(state.touched, nodeId),
    validating: hasPathWithin(state.validating, nodeId) || hasPathWithin(state.pendingSchemas, nodeId),
    submitting: state.submitting.has(nodeId),
    submitCount: state.submitCounts.get(nodeId) ?? 0,
    active: isActiveNode(state, nodeId),
  }
}

function isSameNodeState(previous: NodeState<unknown>, next: NodeState<unknown>): boolean {
  return (
    Object.is(previous.value, next.value) &&
    Object.is(previous.initialValue, next.initialValue) &&
    areSameErrors(previous.errors, next.errors) &&
    previous.valid == next.valid &&
    previous.dirty == next.dirty &&
    previous.touched == next.touched &&
    previous.validating == next.validating &&
    previous.submitting == next.submitting &&
    previous.submitCount == next.submitCount &&
    previous.active == next.active
  )
}

function areSameErrors(previous: ReadonlyArray<FormError>, next: ReadonlyArray<FormError>): boolean {
  return (
    previous.length == next.length &&
    previous.every((error, index) => {
      const other = next[index]
      return (
        error.path == other.path &&
        error.code == other.code &&
        error.source == other.source &&
        Object.is(error.params, other.params)
      )
    })
  )
}
