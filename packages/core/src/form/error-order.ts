import type { DefinitionHandlers } from '../definitions/runtime-options'
import type { ErrorSource } from '../errors/form-error'
import type { FormRuntime } from './form-runtime'

import { definitionAt } from '../definitions/definition-at'
import { matchDefinition } from '../definitions/runtime-options'
import { ERROR_SOURCE, isInternalErrorSource } from '../errors/form-error'
import { joinPath, splitPath } from '../paths/path'
import { itemKeyOf } from '../state/node-id'

export interface ErrorOrigin {
  readonly ownerId: string
  readonly targetId: string
  readonly source: ErrorSource
}

interface SegmentPlace {
  readonly segment: string
  readonly itemKeys: ReadonlyArray<string>
}

const INTERNAL_SOURCES: ReadonlyArray<ErrorSource> = [ERROR_SOURCE.schema, ERROR_SOURCE.validate, ERROR_SOURCE.async]

const SEGMENT_RANK: DefinitionHandlers<SegmentPlace, number> = {
  field: () => 0,
  group: (definition, { segment }) => positionIn(Object.keys(definition.children), segment),
  array: (_definition, { segment, itemKeys }) => positionIn(itemKeys, itemKeyOf(segment)),
}

export function inDefinitionOrder<Origin extends ErrorOrigin>(
  runtime: FormRuntime,
  origins: ReadonlyArray<Origin>,
): Array<Origin> {
  const ranks = new Map(origins.map(origin => [origin.ownerId, definitionRanksOf(runtime, origin.ownerId)]))
  const byProducer = origins.toSorted(
    (first, second) =>
      compareRanks(ranks.get(first.ownerId) ?? [], ranks.get(second.ownerId) ?? []) ||
      sourceRank(first.source) - sourceRank(second.source),
  )
  const targetPlaces = new Map<string, number>()
  byProducer.forEach((origin, index) => {
    const target = targetKeyOf(origin)
    targetPlaces.set(target, targetPlaces.get(target) ?? index)
  })
  return byProducer.toSorted(
    (first, second) => (targetPlaces.get(targetKeyOf(first)) ?? 0) - (targetPlaces.get(targetKeyOf(second)) ?? 0),
  )
}

function targetKeyOf(origin: ErrorOrigin): string {
  return `${origin.ownerId} ${origin.targetId}`
}

function definitionRanksOf(runtime: FormRuntime, nodeId: string): Array<number> {
  const ranks: Array<number> = []
  let parentId = ''
  for (const segment of splitPath(nodeId)) {
    const parent = definitionAt(runtime.definition, parentId)
    const itemKeys = runtime.state.arrayKeys.get(parentId) ?? []
    ranks.push(parent == undefined ? 0 : matchDefinition(parent, SEGMENT_RANK, { segment, itemKeys }))
    parentId = joinPath(parentId, segment)
  }
  return ranks
}

function positionIn(items: ReadonlyArray<string>, item: string | undefined): number {
  const index = item == undefined ? -1 : items.indexOf(item)
  return index == -1 ? items.length : index
}

function compareRanks(first: ReadonlyArray<number>, second: ReadonlyArray<number>): number {
  const sharedLength = Math.min(first.length, second.length)
  for (let index = 0; index < sharedLength; index += 1) {
    if (first[index] != second[index]) {
      return first[index] - second[index]
    }
  }
  return first.length - second.length
}

function sourceRank(source: ErrorSource): number {
  return isInternalErrorSource(source) ? INTERNAL_SOURCES.indexOf(source) : INTERNAL_SOURCES.length
}
