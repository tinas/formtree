export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value == 'object' && value != null && !Array.isArray(value) && !(value instanceof Date)
}

export function getIn(tree: unknown, segments: ReadonlyArray<string>): unknown {
  let current = tree
  for (const segment of segments) {
    if (Array.isArray(current)) {
      current = current[Number(segment)]
    } else if (isPlainObject(current)) {
      current = current[segment]
    } else {
      return undefined
    }
  }
  return current
}

export function setIn(tree: unknown, segments: ReadonlyArray<string>, value: unknown): unknown {
  if (Object.is(getIn(tree, segments), value)) {
    return tree
  }
  return writeIn(tree, segments, value)
}

function writeIn(tree: unknown, segments: ReadonlyArray<string>, value: unknown): unknown {
  if (segments.length == 0) {
    return value
  }
  const [segment, ...rest] = segments
  if (Array.isArray(tree)) {
    const index = Number(segment)
    return isIndexOf(tree, index) ? tree.with(index, writeIn(tree[index], rest, value)) : tree
  }
  const container = isPlainObject(tree) ? tree : {}
  return {
    ...container,
    [segment]: writeIn(container[segment], rest, value),
  }
}

function isIndexOf(items: ReadonlyArray<unknown>, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < items.length
}
