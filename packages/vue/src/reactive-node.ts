import type { FormControls, ListedError, ListErrorsOptions, UniversalNode } from '@formtree/core'
import type { ComputedRef, ShallowRef } from 'vue'

import { computed, shallowRef } from 'vue'

export interface FormBridge {
  readonly version: ShallowRef<number>
  readonly nodes: WeakMap<UniversalNode, UniversalNode>
  readonly itemLists: WeakMap<ReadonlyArray<UniversalNode>, ReadonlyArray<UniversalNode>>
}

export type UniversalForm = UniversalNode & FormControls<unknown>

export function createFormBridge(): FormBridge {
  return {
    version: shallowRef(0),
    nodes: new WeakMap(),
    itemLists: new WeakMap(),
  }
}

export function announceChange(bridge: FormBridge): void {
  bridge.version.value += 1
}

export function reactiveNode(bridge: FormBridge, node: UniversalNode): UniversalNode {
  const cached = bridge.nodes.get(node)
  if (cached != undefined) {
    return cached
  }
  const created = createReactiveNode(bridge, node)
  bridge.nodes.set(node, created)
  return created
}

export function reactiveForm(bridge: FormBridge, form: UniversalForm): UniversalForm {
  return Object.assign(reactiveNode(bridge, form), {
    subscribe: form.subscribe,
    setDeps: form.setDeps,
    batch: form.batch,
    dispose: form.dispose,
    formatError: form.formatError,
  })
}

function reactiveItems(bridge: FormBridge, items: ReadonlyArray<UniversalNode>): ReadonlyArray<UniversalNode> {
  const cached = bridge.itemLists.get(items)
  if (cached != undefined) {
    return cached
  }
  const created = items.map(item => reactiveNode(bridge, item))
  bridge.itemLists.set(items, created)
  return created
}

function trackChanges(bridge: FormBridge): number {
  return bridge.version.value
}

function computedFromForm<Value>(bridge: FormBridge, read: () => Value): ComputedRef<Value> {
  return computed(() => {
    trackChanges(bridge)
    return read()
  })
}

function computedErrorLists(
  bridge: FormBridge,
  node: UniversalNode,
): (options?: ListErrorsOptions) => ReadonlyArray<ListedError> {
  const lists = new Map<string, ComputedRef<ReadonlyArray<ListedError>>>()
  return options => {
    const key = JSON.stringify(options ?? {})
    const cached = lists.get(key)
    if (cached != undefined) {
      return cached.value
    }
    const list = computedFromForm(bridge, () => node.listErrors(options))
    lists.set(key, list)
    return list.value
  }
}

function createReactiveNode(bridge: FormBridge, node: UniversalNode): UniversalNode {
  const id = computedFromForm(bridge, () => node.id)
  const path = computedFromForm(bridge, () => node.path)
  const index = computedFromForm(bridge, () => node.index)
  const state = computedFromForm(bridge, () => node.state)
  const errorMessage = computedFromForm(bridge, () => node.errorMessage)
  const attributes = computedFromForm(bridge, () => node.attributes)
  const errorId = computedFromForm(bridge, () => node.errorId)
  const descriptionId = computedFromForm(bridge, () => node.descriptionId)
  const summaryId = computedFromForm(bridge, () => node.summaryId)
  const items = computedFromForm(bridge, () => reactiveItems(bridge, node.items))
  const listErrors = computedErrorLists(bridge, node)
  return {
    get kind() {
      return node.kind
    },
    get definition() {
      return node.definition
    },
    get id() {
      return id.value
    },
    get path() {
      return path.value
    },
    get key() {
      return node.key
    },
    get index() {
      return index.value
    },
    get state() {
      return state.value
    },
    get errorMessage() {
      return errorMessage.value
    },
    get attributes() {
      return attributes.value
    },
    get errorId() {
      return errorId.value
    },
    get descriptionId() {
      return descriptionId.value
    },
    get summaryId() {
      return summaryId.value
    },
    get items() {
      return items.value
    },
    get version() {
      return node.version
    },
    subscribe: node.subscribe,
    subscribeToForm: node.subscribeToForm,
    observe: node.observe,
    setValue: node.setValue,
    blur: node.blur,
    validate: node.validate,
    handleSubmit: node.handleSubmit,
    reset: node.reset,
    setErrors: node.setErrors,
    clearErrors: node.clearErrors,
    listErrors,
    focus: node.focus,
    field: path => reactiveNode(bridge, node.field(path)),
    group: path => reactiveNode(bridge, node.group(path)),
    array: path => reactiveNode(bridge, node.array(path)),
    push: node.push,
    insert: node.insert,
    remove: node.remove,
    move: node.move,
    swap: node.swap,
    replace: node.replace,
  }
}
