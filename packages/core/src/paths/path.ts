const SEGMENT_SEPARATOR = '.'

export function splitPath(path: string): Array<string> {
  return path == '' ? [] : path.split(SEGMENT_SEPARATOR)
}

export function joinSegments(segments: ReadonlyArray<string>): string {
  return segments.join(SEGMENT_SEPARATOR)
}

export function joinPath(base: string, relative: string): string {
  if (base == '') {
    return relative
  }
  if (relative == '') {
    return base
  }
  return `${base}${SEGMENT_SEPARATOR}${relative}`
}

export function isWithinPath(path: string, ancestor: string): boolean {
  return ancestor == '' || path == ancestor || path.startsWith(`${ancestor}${SEGMENT_SEPARATOR}`)
}

export function isRelatedPath(first: string, second: string): boolean {
  return isWithinPath(first, second) || isWithinPath(second, first)
}

export function parentPath(path: string): string {
  const separatorIndex = path.lastIndexOf(SEGMENT_SEPARATOR)
  return separatorIndex == -1 ? '' : path.slice(0, separatorIndex)
}

export function lastSegment(path: string): string {
  return path.slice(path.lastIndexOf(SEGMENT_SEPARATOR) + 1)
}

export function pathAndAncestors(path: string): Array<string> {
  const segments = splitPath(path)
  return [
    '',
    ...segments.map((_segment, index) => {
      return joinSegments(segments.slice(0, index + 1))
    }),
  ]
}

export function comparePaths(first: string, second: string): number {
  const firstSegments = splitPath(first)
  const secondSegments = splitPath(second)
  const sharedLength = Math.min(firstSegments.length, secondSegments.length)
  for (let index = 0; index < sharedLength; index += 1) {
    const order = compareSegments(firstSegments[index], secondSegments[index])
    if (order != 0) {
      return order
    }
  }
  return firstSegments.length - secondSegments.length
}

function compareSegments(first: string, second: string): number {
  const bothNumeric = isIndexSegment(first) && isIndexSegment(second)
  return bothNumeric ? Number(first) - Number(second) : first.localeCompare(second)
}

export function isIndexSegment(segment: string): boolean {
  return /^\d+$/.test(segment)
}
