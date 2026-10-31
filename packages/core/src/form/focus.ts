import type { FocusElementOption } from '../nodes/node-types'

const DOCUMENT_POSITION_FOLLOWING = 4

export function focusNatively(element: HTMLElement): void {
  element.focus()
}

export function focusElementById(id: string, focusElement: FocusElementOption): void {
  if (typeof document == 'undefined') {
    return
  }
  const element = document.getElementById(id)
  if (element != null) {
    focusElement(element)
  }
}

export function focusFirstInDocumentOrder(ids: ReadonlyArray<string>, focusElement: FocusElementOption): void {
  if (typeof document == 'undefined') {
    return
  }
  const [first] = ids
    .map(id => document.getElementById(id))
    .filter(element => element != null)
    .sort(compareDocumentOrder)
  if (first != undefined) {
    focusElement(first)
  }
}

function compareDocumentOrder(first: HTMLElement, second: HTMLElement): number {
  if (first == second) {
    return 0
  }
  return first.compareDocumentPosition(second) & DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}
