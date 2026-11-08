import { isPlainObject, ownValue } from './value-tree'

type MemberEquality = (first: unknown, second: unknown) => boolean

export function deepEqual(first: unknown, second: unknown): boolean {
  return isEqualBy(first, second, deepEqual)
}

/**
 * Whether two values are equal one level deep. Arrays are compared item by item and plain objects by their own keys,
 * each member by reference. A `Date` is compared by its time, and any other object by reference.
 *
 * @category Utilities
 */
export function shallowEqual(first: unknown, second: unknown): boolean {
  return isEqualBy(first, second, Object.is)
}

function isEqualBy(first: unknown, second: unknown, isSameMember: MemberEquality): boolean {
  if (Object.is(first, second)) {
    return true
  }
  if (first instanceof Date && second instanceof Date) {
    return first.getTime() == second.getTime()
  }
  if (Array.isArray(first) && Array.isArray(second)) {
    return first.length == second.length && first.every((item, index) => isSameMember(item, second[index]))
  }
  if (isPlainObject(first) && isPlainObject(second)) {
    const keys = new Set([...Object.keys(first), ...Object.keys(second)])
    return [...keys].every(key => isSameMember(ownValue(first, key), ownValue(second, key)))
  }
  return false
}
