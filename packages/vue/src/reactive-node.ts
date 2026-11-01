import type { FormControls, UniversalNode } from '@formtree/core'
import type { ShallowRef } from 'vue'

import { computed, shallowRef } from 'vue'

export interface FormBridge {
  readonly version: ShallowRef<number>
  readonly nodes: WeakMap<UniversalNode, UniversalNode>
}

export type UniversalForm = UniversalNode & FormControls<unknown>

export function createFormBridge(): FormBridge {
  return {
    version: shallowRef(0),
    nodes: new WeakMap(),
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

function trackChanges(bridge: FormBridge): number {
  return bridge.version.value
}

function createReactiveNode(bridge: FormBridge, node: UniversalNode): UniversalNode {
  const state = computed(() => {
    trackChanges(bridge)
    return node.state
  })
  const items = computed(() => {
    trackChanges(bridge)
    return node.items.map(item => reactiveNode(bridge, item))
  })
  return {
    get kind() {
      trackChanges(bridge)
      return node.kind
    },
    get definition() {
      trackChanges(bridge)
      return node.definition
    },
    get id() {
      trackChanges(bridge)
      return node.id
    },
    get path() {
      trackChanges(bridge)
      return node.path
    },
    get key() {
      return node.key
    },
    get index() {
      trackChanges(bridge)
      return node.index
    },
    get state() {
      return state.value
    },
    get errorMessage() {
      trackChanges(bridge)
      return node.errorMessage
    },
    get errorId() {
      trackChanges(bridge)
      return node.errorId
    },
    get descriptionId() {
      trackChanges(bridge)
      return node.descriptionId
    },
    get summaryId() {
      trackChanges(bridge)
      return node.summaryId
    },
    get items() {
      return items.value
    },
    subscribe: node.subscribe,
    observe: node.observe,
    setValue: node.setValue,
    blur: node.blur,
    validate: node.validate,
    handleSubmit: node.handleSubmit,
    reset: node.reset,
    setErrors: node.setErrors,
    clearErrors: node.clearErrors,
    listErrors: options => {
      trackChanges(bridge)
      return node.listErrors(options)
    },
    focus: node.focus,
    getAttributes: () => {
      trackChanges(bridge)
      return node.getAttributes()
    },
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
