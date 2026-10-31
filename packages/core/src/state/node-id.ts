import { isIndexSegment, joinPath, joinSegments, lastSegment, splitPath } from '../paths/path'

export type ArrayKeys = ReadonlyMap<string, ReadonlyArray<string>>

const ITEM_SEGMENT_PATTERN = /^\[(.+)\]$/

export function itemSegment(key: string): string {
  return `[${key}]`
}

export function itemKeyOf(segment: string): string | undefined {
  return ITEM_SEGMENT_PATTERN.exec(segment)?.[1]
}

export function itemKeyOfNode(nodeId: string): string | undefined {
  return itemKeyOf(lastSegment(nodeId))
}

export function toNodeId(arrayKeys: ArrayKeys, base: string, relativePath: string): string | undefined {
  let nodeId = base
  for (const segment of splitPath(relativePath)) {
    const keys = arrayKeys.get(nodeId)
    if (keys == undefined) {
      nodeId = joinPath(nodeId, segment)
    } else {
      const key = isIndexSegment(segment) ? keys[Number(segment)] : undefined
      if (key == undefined) {
        return undefined
      }
      nodeId = joinPath(nodeId, itemSegment(key))
    }
  }
  return nodeId
}

export function toPath(arrayKeys: ArrayKeys, nodeId: string): string | undefined {
  const pathSegments: Array<string> = []
  let parentId = ''
  for (const segment of splitPath(nodeId)) {
    const key = itemKeyOf(segment)
    if (key == undefined) {
      pathSegments.push(segment)
    } else {
      const index = arrayKeys.get(parentId)?.indexOf(key) ?? -1
      if (index == -1) {
        return undefined
      }
      pathSegments.push(String(index))
    }
    parentId = joinPath(parentId, segment)
  }
  return joinSegments(pathSegments)
}

export function isAttached(arrayKeys: ArrayKeys, nodeId: string): boolean {
  return toPath(arrayKeys, nodeId) != undefined
}
