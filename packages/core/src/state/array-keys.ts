import type { ArrayKeys } from './node-id'

import { isWithinPath, joinPath } from '../paths/path'
import { isPlainObject } from '../paths/value-tree'
import { mapWithoutPathsWithin } from './collections'
import { itemSegment } from './node-id'

export interface KeyState {
  readonly arrayKeys: ArrayKeys
  readonly nextItemKey: number
}

export interface KeyCounter {
  next: number
}

interface KeyCollection {
  readonly arrayKeys: Map<string, ReadonlyArray<string>>
  readonly counter: KeyCounter
}

export function assignArrayKeys(keyState: KeyState, nodeId: string, value: unknown): KeyState {
  const collection: KeyCollection = {
    arrayKeys: new Map(mapWithoutPathsWithin(keyState.arrayKeys, nodeId)),
    counter: { next: keyState.nextItemKey },
  }
  collectArrayKeys(collection, nodeId, value)
  return {
    arrayKeys: collection.arrayKeys,
    nextItemKey: collection.counter.next,
  }
}

export function nextItemKey(counter: KeyCounter): string {
  const key = `k${counter.next}`
  counter.next += 1
  return key
}

export function copyArrayKeysWithin(source: ArrayKeys, target: ArrayKeys, nodeId: string): ArrayKeys {
  const copied = [...source].filter(([arrayId]) => isWithinPath(arrayId, nodeId))
  return new Map([...mapWithoutPathsWithin(target, nodeId), ...copied])
}

function collectArrayKeys(collection: KeyCollection, nodeId: string, value: unknown): void {
  if (Array.isArray(value)) {
    const keys = value.map(() => nextItemKey(collection.counter))
    collection.arrayKeys.set(nodeId, keys)
    value.forEach((item, index) => {
      collectArrayKeys(collection, joinPath(nodeId, itemSegment(keys[index])), item)
    })
    return
  }
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectArrayKeys(collection, joinPath(nodeId, key), child)
    }
  }
}
