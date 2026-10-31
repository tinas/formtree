import { isPlainObject } from './value-tree'

export function deepEqual(first: unknown, second: unknown): boolean {
  if (Object.is(first, second)) {
    return true
  }
  if (first instanceof Date || second instanceof Date) {
    return first instanceof Date && second instanceof Date && first.getTime() == second.getTime()
  }
  if (Array.isArray(first) || Array.isArray(second)) {
    return Array.isArray(first) && Array.isArray(second) && arraysEqual(first, second)
  }
  if (isPlainObject(first) && isPlainObject(second)) {
    return objectsEqual(first, second)
  }
  return false
}

export function shallowEqual(first: unknown, second: unknown): boolean {
  if (Object.is(first, second)) {
    return true
  }
  if (!isPlainObject(first) || !isPlainObject(second)) {
    return false
  }
  const keys = new Set([...Object.keys(first), ...Object.keys(second)])
  return [...keys].every(key => Object.is(first[key], second[key]))
}

export function stableKey(value: unknown): string {
  return JSON.stringify(value, sortObjectKeys) ?? 'undefined'
}

function arraysEqual(first: ReadonlyArray<unknown>, second: ReadonlyArray<unknown>): boolean {
  return first.length == second.length && first.every((item, index) => deepEqual(item, second[index]))
}

function objectsEqual(first: Record<string, unknown>, second: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(first), ...Object.keys(second)])
  return [...keys].every(key => deepEqual(first[key], second[key]))
}

function sortObjectKeys(_key: string, value: unknown): unknown {
  if (!isPlainObject(value)) {
    return value
  }
  return Object.fromEntries(Object.entries(value).sort(([first], [second]) => first.localeCompare(second)))
}
