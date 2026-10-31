import type { Definition } from '../definitions/definition'
import type { KeyCounter, KeyState } from './array-keys'
import type { FormState } from './form-state'

import { itemDefinitionAt } from '../definitions/definition-at'
import { joinPath, splitPath } from '../paths/path'
import { getIn, setIn } from '../paths/value-tree'
import { assignArrayKeys, nextItemKey } from './array-keys'
import { mapWith, withAdded } from './collections'
import { dropDetachedState } from './detached-state'
import { clearErrorsOnStructureChange } from './error-transitions'
import { itemSegment, toPath } from './node-id'
import { materializeStructure } from './structure'

export const ARRAY_EDIT = {
  push: 'push',
  insert: 'insert',
  remove: 'remove',
  move: 'move',
  swap: 'swap',
  replace: 'replace',
} as const

interface PushEdit {
  readonly type: typeof ARRAY_EDIT.push
  readonly value: unknown
}

interface InsertEdit {
  readonly type: typeof ARRAY_EDIT.insert
  readonly index: number
  readonly value: unknown
}

interface RemoveEdit {
  readonly type: typeof ARRAY_EDIT.remove
  readonly index: number
}

interface MoveEdit {
  readonly type: typeof ARRAY_EDIT.move
  readonly from: number
  readonly to: number
}

interface SwapEdit {
  readonly type: typeof ARRAY_EDIT.swap
  readonly first: number
  readonly second: number
}

interface ReplaceEdit {
  readonly type: typeof ARRAY_EDIT.replace
  readonly values: ReadonlyArray<unknown>
}

export type ArrayEdit = PushEdit | InsertEdit | RemoveEdit | MoveEdit | SwapEdit | ReplaceEdit

interface KeyedItems {
  readonly items: ReadonlyArray<unknown>
  readonly keys: ReadonlyArray<string>
}

type ArrayEditors = {
  readonly [Type in ArrayEdit['type']]: (
    current: KeyedItems,
    edit: Extract<ArrayEdit, { readonly type: Type }>,
    counter: KeyCounter,
  ) => KeyedItems
}

const ARRAY_EDITORS: ArrayEditors = {
  push: pushItem,
  insert: insertItem,
  remove: removeItem,
  move: moveItem,
  swap: swapItems,
  replace: replaceItems,
}

export interface ArrayEditRequest {
  readonly state: FormState
  readonly definition: Definition
  readonly arrayId: string
  readonly edit: ArrayEdit
}

export function applyArrayEdit({ state, definition, arrayId, edit }: ArrayEditRequest): FormState {
  const path = toPath(state.arrayKeys, arrayId)
  if (path == undefined) {
    return state
  }
  const segments = splitPath(path)
  const currentItems = getIn(state.value, segments)
  const current: KeyedItems = {
    items: Array.isArray(currentItems) ? currentItems : [],
    keys: state.arrayKeys.get(arrayId) ?? [],
  }
  const counter: KeyCounter = { next: state.nextItemKey }
  const edited = ARRAY_EDITORS[edit.type](current, edit as never, counter)
  const itemDefinition = itemDefinitionAt(definition, arrayId)
  const addedKeys = edited.keys.filter(key => !current.keys.includes(key))
  const items = edited.items.map((item, index) => {
    const isAdded = addedKeys.includes(edited.keys[index])
    return isAdded && itemDefinition != undefined ? materializeStructure(itemDefinition, item) : item
  })
  const keyState = addedKeys.reduce<KeyState>(
    (keys, key) => {
      return assignArrayKeys(keys, joinPath(arrayId, itemSegment(key)), items[edited.keys.indexOf(key)])
    },
    { arrayKeys: mapWith(state.arrayKeys, arrayId, edited.keys), nextItemKey: counter.next },
  )
  return dropDetachedState({
    ...state,
    ...keyState,
    value: setIn(state.value, segments, items),
    touched: withAdded(state.touched, arrayId),
    changed: withAdded(state.changed, arrayId),
    errors: clearErrorsOnStructureChange(state.errors, arrayId),
  })
}

function pushItem(current: KeyedItems, edit: PushEdit, counter: KeyCounter): KeyedItems {
  return {
    items: [...current.items, edit.value],
    keys: [...current.keys, nextItemKey(counter)],
  }
}

function insertItem(current: KeyedItems, edit: InsertEdit, counter: KeyCounter): KeyedItems {
  return {
    items: current.items.toSpliced(edit.index, 0, edit.value),
    keys: current.keys.toSpliced(edit.index, 0, nextItemKey(counter)),
  }
}

function removeItem(current: KeyedItems, edit: RemoveEdit): KeyedItems {
  return {
    items: current.items.toSpliced(edit.index, 1),
    keys: current.keys.toSpliced(edit.index, 1),
  }
}

function moveItem(current: KeyedItems, edit: MoveEdit): KeyedItems {
  if (!isIndexIn(current, edit.from)) {
    return current
  }
  return {
    items: current.items.toSpliced(edit.from, 1).toSpliced(edit.to, 0, current.items[edit.from]),
    keys: current.keys.toSpliced(edit.from, 1).toSpliced(edit.to, 0, current.keys[edit.from]),
  }
}

function swapItems(current: KeyedItems, edit: SwapEdit): KeyedItems {
  if (!isIndexIn(current, edit.first) || !isIndexIn(current, edit.second)) {
    return current
  }
  return {
    items: current.items.with(edit.first, current.items[edit.second]).with(edit.second, current.items[edit.first]),
    keys: current.keys.with(edit.first, current.keys[edit.second]).with(edit.second, current.keys[edit.first]),
  }
}

function replaceItems(_current: KeyedItems, edit: ReplaceEdit, counter: KeyCounter): KeyedItems {
  return {
    items: edit.values,
    keys: edit.values.map(() => nextItemKey(counter)),
  }
}

function isIndexIn(current: KeyedItems, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < current.items.length
}
