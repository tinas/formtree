import type { FocusElementOption } from '../nodes/node-types'

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

export function focusFirstOnPage(ids: ReadonlyArray<string>, focusElement: FocusElementOption): void {
  if (typeof document == 'undefined') {
    return
  }
  const [first] = ids
    .map(id => document.getElementById(id))
    .filter((element): element is HTMLElement => element != null && isShown(element))
    .sort(compareDocumentOrder)
  if (first != undefined) {
    focusElement(first)
  }
}

function isShown(element: HTMLElement): boolean {
  return typeof element.checkVisibility != 'function' || element.checkVisibility()
}

function compareDocumentOrder(first: HTMLElement, second: HTMLElement): number {
  if (first == second) {
    return 0
  }
  return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}
