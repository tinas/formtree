/**
 * Whether a value is an object whose prototype is `Object` or `null`. Paths walk only such objects and arrays, and
 * compare them by their contents. Any other object, such as a `File` or a class instance, is a value of its own.
 *
 * @category Utilities
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value != 'object' || value == null) {
    return false
  }
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype == Object.prototype || prototype == null
}

export function ownValue<Value>(record: Readonly<Record<string, Value>>, key: string): Value | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined
}

export function toGroupRecord(value: unknown): Record<string, unknown> {
  if (isPlainObject(value)) {
    return value
  }
  return typeof value == 'object' && value != null && !Array.isArray(value) ? { ...value } : {}
}

export function getIn(tree: unknown, segments: ReadonlyArray<string>): unknown {
  let current = tree
  for (const segment of segments) {
    if (Array.isArray(current)) {
      current = current[Number(segment)]
    } else if (isPlainObject(current)) {
      current = ownValue(current, segment)
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

export function writeIn(tree: unknown, segments: ReadonlyArray<string>, value: unknown): unknown {
  if (segments.length == 0) {
    return value
  }
  const [segment, ...rest] = segments
  if (Array.isArray(tree)) {
    const index = Number(segment)
    return isIndexOf(tree, index) ? tree.with(index, writeIn(tree[index], rest, value)) : tree
  }
  const container = isPlainObject(tree) ? tree : {}
  if (rest.length == 0 && Object.is(value, undefined)) {
    return withoutKey(container, segment)
  }
  return {
    ...container,
    [segment]: writeIn(ownValue(container, segment), rest, value),
  }
}

function withoutKey(record: Readonly<Record<string, unknown>>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([entryKey]) => entryKey != key))
}

function isIndexOf(items: ReadonlyArray<unknown>, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < items.length
}
