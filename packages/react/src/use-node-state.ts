import type { NodeState, UniversalNode } from '@formtree/core'
import type { RefObject } from 'react'

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'

/**
 * Any node: a form, a group, an array, an item or a field.
 *
 * @category Node State
 */
export interface StatefulNode<Value> {
  readonly state: NodeState<Value>
}

interface Selection<Value> {
  readonly value: Value
}

interface VersionedSelection<Value> extends Selection<Value> {
  readonly version: number
}

/**
 * Returns the node's state and re-renders the component when any of it changes.
 *
 * @category Node State
 */
export function useNodeState<Value>(node: StatefulNode<Value>): NodeState<Value>
/**
 * Returns what `select` reads from the node and re-renders the component only when that changes. Results are compared
 * shallowly, so `select` may return a new object or array of the values it read.
 */
export function useNodeState<Node extends StatefulNode<unknown>, Selected>(
  node: Node,
  select: (node: Node) => Selected,
): Selected
export function useNodeState(
  node: StatefulNode<unknown>,
  select: (node: StatefulNode<unknown>) => unknown = stateOf,
): unknown {
  const universal = node as unknown as UniversalNode
  const committed = useRef<Selection<unknown>>(undefined)
  const readSelection = useMemo(
    () => createSelectionReader(universal, () => select(node), committed),
    [universal, node, select],
  )
  const selected = useSyncExternalStore(universal.subscribe, readSelection, readSelection)
  useEffect(() => {
    committed.current = { value: selected }
  }, [selected])
  return selected
}

function stateOf(node: StatefulNode<unknown>): NodeState<unknown> {
  return node.state
}

function createSelectionReader<Value>(
  node: UniversalNode,
  select: () => Value,
  committed: RefObject<Selection<Value> | undefined>,
): () => Value {
  let memo: VersionedSelection<Value> | undefined
  return () => {
    if (memo != undefined && memo.version == node.version) {
      return memo.value
    }
    const next = select()
    const previous = memo ?? committed.current
    const value = previous != undefined && isShallowEqual(previous.value, next) ? previous.value : next
    memo = { version: node.version, value }
    return value
  }
}

function isShallowEqual(previous: unknown, next: unknown): boolean {
  if (Object.is(previous, next)) {
    return true
  }
  if (Array.isArray(previous) && Array.isArray(next)) {
    return previous.length == next.length && previous.every((item, index) => Object.is(item, next[index]))
  }
  if (isPlainRecord(previous) && isPlainRecord(next)) {
    const keys = Object.keys(previous)
    return keys.length == Object.keys(next).length && keys.every(key => Object.is(previous[key], next[key]))
  }
  return false
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value != 'object' || value == null) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype == Object.prototype || prototype == null
}
