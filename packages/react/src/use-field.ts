import type { FieldNode, NodeState, UniversalNode } from '@formtree/core'

import { useNearestNode } from './node-context'
import { useNodeState } from './use-node-state'

/**
 * Attributes to spread on an input: the field's attributes with `undefined` for absent ones, and a blur handler.
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
  /** The field's first visible error as text, from the form's `formatError`, for the element with `errorId`. */
  readonly errorMessage: string | undefined
  readonly id: string
  readonly errorId: string
  readonly descriptionId: string
  /** To spread on the input. */
  readonly attrs: FieldBindingAttributes
  /** The draft value, for the input's `value`. */
  readonly value: Value
  /** Writes a draft value, from the input's `onChange`. */
  readonly setValue: (value: Value) => void
}

type FieldSource = string | FieldNode<unknown, unknown>

/**
 * Binds a field node to an input, typed by the node, and re-renders the component when the field's state changes.
 *
 * @category Field Bindings
 */
export function useField<Value, Output>(node: FieldNode<Value, Output>): FieldView<Value, Output>
/**
 * Binds the field at `name`, relative to the nearest provided node, to an input. The component re-renders only when
 * that field's state changes.
 */
export function useField<Value>(name: string): FieldView<Value | undefined, unknown>
export function useField(source: FieldSource): FieldView<unknown, unknown> {
  const node = resolveFieldNode(useNearestNode(), source)
  const state = useNodeState(node)
  return createFieldView(node, state)
}

function resolveFieldNode(nearest: UniversalNode | undefined, source: FieldSource): FieldNode<unknown, unknown> {
  if (typeof source != 'string') {
    return source
  }
  if (nearest == undefined) {
    throw new Error('[formtree] useField(name) needs a provided node. Render a FormNodeProvider above this component.')
  }
  return nearest.field(source) as unknown as FieldNode<unknown, unknown>
}

function createFieldView(node: FieldNode<unknown, unknown>, state: NodeState<unknown>): FieldView<unknown, unknown> {
  const attributes = node.getAttributes()
  return {
    node,
    state,
    errorMessage: node.errorMessage,
    id: node.id,
    errorId: node.errorId,
    descriptionId: node.descriptionId,
    attrs: {
      ...attributes,
      'aria-describedby': attributes['aria-describedby'] ?? undefined,
      onBlur: node.blur,
    },
    value: state.value,
    setValue: node.setValue,
  }
}
