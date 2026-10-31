import type { Definition } from '../definitions/definition'
import type { FormState } from './form-state'

import { isSyncErrorSource } from '../errors/form-error'
import { isWithinPath, lastSegment, parentPath, splitPath } from '../paths/path'
import { getIn, setIn } from '../paths/value-tree'
import { assignArrayKeys, copyArrayKeysWithin } from './array-keys'
import { mapWith, mapWithoutPathsWithin, withoutPathsWithin } from './collections'
import { dropDetachedState } from './detached-state'
import { itemKeyOf, toPath } from './node-id'
import { materializeAt } from './structure'

export interface ResetRequest {
  readonly hasValue: boolean
  readonly value?: unknown
  readonly keepTouched?: boolean
  readonly keepErrors?: boolean
}

export interface NodeReset {
  readonly state: FormState
  readonly definition: Definition
  readonly nodeId: string
  readonly request: ResetRequest
}

export function resetNode({ state, definition, nodeId, request }: NodeReset): FormState {
  const path = toPath(state.arrayKeys, nodeId)
  if (path == undefined) {
    return state
  }
  const reset = request.hasValue
    ? rebaseline({ state, definition, nodeId, path, value: request.value })
    : restoreBaseline({ state, definition, nodeId, path })
  return dropDetachedState(clearInteractions({ state: reset, nodeId, request }))
}

interface PositionedReset {
  readonly state: FormState
  readonly definition: Definition
  readonly nodeId: string
  readonly path: string
}

function restoreBaseline({ state, definition, nodeId, path }: PositionedReset): FormState {
  const baselinePath = toPath(state.initialArrayKeys, nodeId)
  if (baselinePath == undefined) {
    const emptyValue = materializeAt(definition, nodeId, undefined)
    return {
      ...state,
      ...assignArrayKeys(state, nodeId, emptyValue),
      value: setIn(state.value, splitPath(path), emptyValue),
    }
  }
  return {
    ...state,
    value: setIn(state.value, splitPath(path), getIn(state.initialValue, splitPath(baselinePath))),
    arrayKeys: copyArrayKeysWithin(state.initialArrayKeys, state.arrayKeys, nodeId),
  }
}

interface RebaselineInput extends PositionedReset {
  readonly value: unknown
}

function rebaseline({ state, definition, nodeId, path, value }: RebaselineInput): FormState {
  const nodeValue = materializeAt(definition, nodeId, value)
  const written: FormState = {
    ...state,
    ...assignArrayKeys(state, nodeId, nodeValue),
    value: setIn(state.value, splitPath(path), nodeValue),
  }
  const positioned = withBaselinePosition(written, nodeId)
  const baselinePath = toPath(positioned.initialArrayKeys, nodeId)
  if (baselinePath == undefined) {
    return written
  }
  return {
    ...positioned,
    initialValue: setIn(positioned.initialValue, splitPath(baselinePath), nodeValue),
    initialArrayKeys: copyArrayKeysWithin(positioned.arrayKeys, positioned.initialArrayKeys, nodeId),
  }
}

function withBaselinePosition(state: FormState, nodeId: string): FormState {
  const itemKey = itemKeyOf(lastSegment(nodeId))
  const arrayId = parentPath(nodeId)
  const arrayPath = toPath(state.initialArrayKeys, arrayId)
  if (toPath(state.initialArrayKeys, nodeId) != undefined || itemKey == undefined || arrayPath == undefined) {
    return state
  }
  const baselineKeys = state.initialArrayKeys.get(arrayId) ?? []
  const baselineItems = getIn(state.initialValue, splitPath(arrayPath))
  const insertIndex = baselineInsertIndex({
    valueKeys: state.arrayKeys.get(arrayId) ?? [],
    baselineKeys,
    itemKey,
  })
  return {
    ...state,
    initialValue: setIn(
      state.initialValue,
      splitPath(arrayPath),
      (Array.isArray(baselineItems) ? baselineItems : []).toSpliced(insertIndex, 0, undefined),
    ),
    initialArrayKeys: mapWith(state.initialArrayKeys, arrayId, baselineKeys.toSpliced(insertIndex, 0, itemKey)),
  }
}

interface BaselineInsertInput {
  readonly valueKeys: ReadonlyArray<string>
  readonly baselineKeys: ReadonlyArray<string>
  readonly itemKey: string
}

function baselineInsertIndex({ valueKeys, baselineKeys, itemKey }: BaselineInsertInput): number {
  const previousKeys = valueKeys.slice(0, valueKeys.indexOf(itemKey)).reverse()
  const previousInBaseline = previousKeys.find(key => baselineKeys.includes(key))
  return previousInBaseline == undefined ? 0 : baselineKeys.indexOf(previousInBaseline) + 1
}

interface InteractionClear {
  readonly state: FormState
  readonly nodeId: string
  readonly request: ResetRequest
}

function clearInteractions({ state, nodeId, request }: InteractionClear): FormState {
  return {
    ...state,
    touched: request.keepTouched ? state.touched : withoutPathsWithin(state.touched, nodeId),
    changed: request.keepTouched ? state.changed : withoutPathsWithin(state.changed, nodeId),
    errors: request.keepErrors
      ? state.errors
      : state.errors.filter(error => isSyncErrorSource(error.source) || !isWithinPath(error.targetId, nodeId)),
    snapshots: mapWithoutPathsWithin(state.snapshots, nodeId),
    submitCounts: mapWithoutPathsWithin(state.submitCounts, nodeId),
  }
}
