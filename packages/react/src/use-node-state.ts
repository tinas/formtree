import type { NodeState, UniversalNode } from '@formtree/core'

import { useSyncExternalStore } from 'react'

/**
 * Any node: a form, a group, an array, an item or a field.
 *
 * @category Node State
 */
export interface StatefulNode<Value> {
  readonly state: NodeState<Value>
}

/**
 * Returns the node's state and re-renders the component only when that state changes. Use it to read the state of a
 * node that no other hook in the component subscribed to.
 *
 * @category Node State
 */
export function useNodeState<Value>(node: StatefulNode<Value>): NodeState<Value> {
  const { subscribe } = node as unknown as UniversalNode
  return useSyncExternalStore(
    subscribe,
    () => node.state,
    () => node.state,
  )
}
