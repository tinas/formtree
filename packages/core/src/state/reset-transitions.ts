import type { Definition } from '../definitions/definition'
import type { KeyState } from './array-keys'
import type { FormState } from './form-state'

import { isSyncErrorSource } from '../errors/form-error'
import { deepEqual } from '../paths/equality'
import { isWithinPath, joinPath, lastSegment, parentPath, splitPath } from '../paths/path'
import { getIn, isPlainObject, ownValue, setIn } from '../paths/value-tree'
import { assignArrayKeys, copyArrayKeysWithin, reuseArrayKeysByIndex } from './array-keys'
import { mapWith, mapWithoutPathsWithin, withoutPathsWithin } from './collections'
import { dropDetachedState } from './detached-state'
import { itemKeyOf, toPath } from './node-id'
import { materializeAt } from './structure'

export interface ResetRequest {
  readonly hasValue: boolean
  readonly value?: unknown
  readonly keepDirtyValues?: boolean
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
  const reset = resetValue({ state, definition, nodeId, path, request })
  return dropDetachedState(clearInteractions({ state: reset, nodeId, request }))
}

interface PositionedReset {
  readonly state: FormState
  readonly definition: Definition
  readonly nodeId: string
  readonly path: string
}

interface ValueReset extends PositionedReset {
  readonly request: ResetRequest
}

function resetValue({ request, ...reset }: ValueReset): FormState {
  if (!request.hasValue) {
    return request.keepDirtyValues ? reset.state : restoreBaseline(reset)
  }
  const rebaselineInput = { ...reset, value: request.value }
  return request.keepDirtyValues ? rebaselineKeepingEdits(rebaselineInput) : rebaseline(rebaselineInput)
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

function rebaselineKeepingEdits({ state, definition, nodeId, path, value }: RebaselineInput): FormState {
  const nodeValue = materializeAt(definition, nodeId, value)
  const positioned = withBaselinePosition(state, nodeId)
  const baselinePath = toPath(positioned.initialArrayKeys, nodeId)
  const segments = splitPath(path)
  const keptParts = keptDraftParts({
    draft: getIn(state.value, segments),
    baseline: baselinePath == undefined ? undefined : getIn(positioned.initialValue, splitPath(baselinePath)),
    value: nodeValue,
    nodeId,
    segments: [],
  })
  const baselineKeys = baselineKeysOf({ state: positioned, nodeId, value: nodeValue, keptParts })
  const written: FormState = {
    ...positioned,
    value: setIn(
      state.value,
      segments,
      keptParts.reduce((tree, part) => setIn(tree, part.segments, part.draft), nodeValue),
    ),
    arrayKeys: keptParts.reduce(
      (arrayKeys, part) => copyArrayKeysWithin(state.arrayKeys, arrayKeys, part.nodeId),
      copyArrayKeysWithin(baselineKeys.arrayKeys, state.arrayKeys, nodeId),
    ),
    nextItemKey: baselineKeys.nextItemKey,
  }
  if (baselinePath == undefined) {
    return written
  }
  return {
    ...written,
    initialValue: setIn(positioned.initialValue, splitPath(baselinePath), nodeValue),
    initialArrayKeys: baselineKeys.arrayKeys,
  }
}

interface DraftComparison {
  readonly draft: unknown
  readonly baseline: unknown
  readonly value: unknown
  readonly nodeId: string
  readonly segments: ReadonlyArray<string>
}

interface KeptPart {
  readonly nodeId: string
  readonly segments: ReadonlyArray<string>
  readonly draft: unknown
  readonly matchesValue: boolean
}

function keptDraftParts({ draft, baseline, value, nodeId, segments }: DraftComparison): Array<KeptPart> {
  if (deepEqual(draft, value)) {
    return [{ nodeId, segments, draft, matchesValue: true }]
  }
  if (deepEqual(draft, baseline)) {
    return []
  }
  if (!isPlainObject(draft) || !isPlainObject(value)) {
    return [{ nodeId, segments, draft, matchesValue: false }]
  }
  const baselineRecord = isPlainObject(baseline) ? baseline : {}
  const keys = new Set([...Object.keys(draft), ...Object.keys(value)])
  return [...keys].flatMap(key =>
    keptDraftParts({
      draft: ownValue(draft, key),
      baseline: ownValue(baselineRecord, key),
      value: ownValue(value, key),
      nodeId: joinPath(nodeId, key),
      segments: [...segments, key],
    }),
  )
}

interface BaselineKeysInput {
  readonly state: FormState
  readonly nodeId: string
  readonly value: unknown
  readonly keptParts: ReadonlyArray<KeptPart>
}

function baselineKeysOf({ state, nodeId, value, keptParts }: BaselineKeysInput): KeyState {
  const reused = reuseArrayKeysByIndex(
    { arrayKeys: state.initialArrayKeys, nextItemKey: state.nextItemKey },
    nodeId,
    value,
  )
  return {
    ...reused,
    arrayKeys: keptParts
      .filter(part => part.matchesValue)
      .reduce((arrayKeys, part) => copyArrayKeysWithin(state.arrayKeys, arrayKeys, part.nodeId), reused.arrayKeys),
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
