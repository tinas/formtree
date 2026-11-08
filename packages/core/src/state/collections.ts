import { isWithinPath, pathAndAncestors } from '../paths/path'

const pathsAndAncestorsBySet = new WeakMap<ReadonlySet<string>, ReadonlySet<string>>()

export function withAdded<Item>(set: ReadonlySet<Item>, item: Item): ReadonlySet<Item> {
  return set.has(item) ? set : new Set([...set, item])
}

export function withDeleted<Item>(set: ReadonlySet<Item>, item: Item): ReadonlySet<Item> {
  if (!set.has(item)) {
    return set
  }
  const next = new Set(set)
  next.delete(item)
  return next
}

export function hasPathWithin(set: ReadonlySet<string>, ancestor: string): boolean {
  return set.size > 0 && pathsAndAncestorsOf(set).has(ancestor)
}

function pathsAndAncestorsOf(paths: ReadonlySet<string>): ReadonlySet<string> {
  const cached = pathsAndAncestorsBySet.get(paths)
  if (cached != undefined) {
    return cached
  }
  const closure = new Set(Array.from(paths, pathAndAncestors).flat())
  pathsAndAncestorsBySet.set(paths, closure)
  return closure
}

export function withoutPathsWithin(set: ReadonlySet<string>, ancestor: string): ReadonlySet<string> {
  return new Set([...set].filter(path => !isWithinPath(path, ancestor)))
}

export function mapWith<Value>(map: ReadonlyMap<string, Value>, key: string, value: Value): ReadonlyMap<string, Value> {
  return new Map([...map, [key, value]])
}

export function mapWithout<Value>(map: ReadonlyMap<string, Value>, key: string): ReadonlyMap<string, Value> {
  if (!map.has(key)) {
    return map
  }
  const next = new Map(map)
  next.delete(key)
  return next
}

export function mapWithoutPathsWithin<Value>(
  map: ReadonlyMap<string, Value>,
  ancestor: string,
): ReadonlyMap<string, Value> {
  return new Map([...map].filter(([path]) => !isWithinPath(path, ancestor)))
}
