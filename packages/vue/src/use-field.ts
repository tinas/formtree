import type { FieldNode, NodeState } from '@formtree/core'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { AnyGroupNode } from './node-context'

import { computed, toValue } from 'vue'

import { injectFormNode } from './node-context'

/**
 * Attributes for `v-bind` on an input: the field's attributes with `undefined` for absent ones, and a blur handler.
 *
 * @category Field Bindings
 */
export interface FieldBindingAttributes {
  readonly id: string
  readonly name: string
  readonly 'aria-invalid': 'true' | 'false'
  readonly 'aria-describedby': string | undefined
  readonly onBlur: () => void
}

/**
 * What {@link useField} returns.
 *
 * @category Field Bindings
 */
export interface FieldView<Value, Output = Value> {
  readonly node: FieldNode<Value, Output>
  readonly state: NodeState<Value>
  readonly id: string
  readonly errorId: string
  readonly descriptionId: string
  /** For `v-bind` on the input. */
  readonly attrs: FieldBindingAttributes
  /** For `v-model`: reads the draft value and writes it with `setValue`. */
  model: Value
}

type FieldSource = string | FieldNode<unknown, unknown>

/**
 * Binds a field node to an input, typed by the node.
 *
 * @category Field Bindings
 */
export function useField<Value, Output>(source: MaybeRefOrGetter<FieldNode<Value, Output>>): FieldView<Value, Output>
/**
 * Binds the field at `name`, relative to the nearest provided node, to an input. The name may be a ref or a getter.
 */
export function useField<Value>(name: MaybeRefOrGetter<string>): FieldView<Value | undefined, unknown>
export function useField(source: MaybeRefOrGetter<FieldSource>): FieldView<unknown, unknown> {
  const base = typeof toValue(source) == 'string' ? injectFormNode() : undefined
  const node = computed(() => resolveFieldNode(base, toValue(source)))
  return createFieldView(node)
}

function resolveFieldNode(base: AnyGroupNode | undefined, source: FieldSource): FieldNode<unknown, unknown> {
  if (typeof source != 'string') {
    return source
  }
  if (base == undefined) {
    throw new Error('[formtree] useField(name) needs a provided node. Call provideFormNode() in an ancestor component.')
  }
  return base.field(source)
}

function createFieldView(node: ComputedRef<FieldNode<unknown, unknown>>): FieldView<unknown, unknown> {
  return {
    get node() {
      return node.value
    },
    get state() {
      return node.value.state
    },
    get id() {
      return node.value.id
    },
    get errorId() {
      return node.value.errorId
    },
    get descriptionId() {
      return node.value.descriptionId
    },
    get attrs() {
      const attributes = node.value.getAttributes()
      return {
        ...attributes,
        'aria-describedby': attributes['aria-describedby'] ?? undefined,
        onBlur: node.value.blur,
      }
    },
    get model() {
      return node.value.state.value
    },
    set model(value) {
      node.value.setValue(value)
    },
  }
}
