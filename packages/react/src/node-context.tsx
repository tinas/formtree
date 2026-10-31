import type { Definition, GroupNode, LensShape, NodeOf, UniversalNode } from '@formtree/core'
import type { ReactElement, ReactNode } from 'react'

import { createContext, useContext, useMemo } from 'react'

import { useNodeState } from './use-node-state'

type AnyRecord = Record<string, unknown>

/**
 * The loosely typed node {@link useFormNode} returns without a definition.
 *
 * @category Node Context
 */
export type AnyGroupNode = GroupNode<LensShape<AnyRecord, AnyRecord>>

interface NodeContext {
  readonly node: UniversalNode
  readonly parent: NodeContext | undefined
}

const NODE_CONTEXT = createContext<NodeContext | undefined>(undefined)

/**
 * Props of {@link FormNodeProvider}.
 *
 * @category Node Context
 */
export interface FormNodeProviderProps {
  /** A form, a step, an array item: any node. */
  readonly node: object
  readonly children?: ReactNode
}

/**
 * Makes a node available to every descendant component. Nothing is provided implicitly, not even by `useForm`.
 *
 * @category Node Context
 */
export function FormNodeProvider({ node, children }: FormNodeProviderProps): ReactElement {
  const parent = useContext(NODE_CONTEXT)
  const context = useMemo(() => ({ node: node as UniversalNode, parent }), [node, parent])
  return <NODE_CONTEXT.Provider value={context}>{children}</NODE_CONTEXT.Provider>
}

/**
 * Returns the nearest provided node of this definition, typed by it, and re-renders the component when its state
 * changes. Throws when no ancestor provided one.
 *
 * @category Node Context
 */
export function useFormNode<NodeDefinition extends Definition>(definition: NodeDefinition): NodeOf<NodeDefinition>
/** Returns the nearest provided node of any definition, loosely typed. Throws when no ancestor provided one. */
export function useFormNode(): AnyGroupNode
export function useFormNode(definition?: Definition): unknown {
  const context = useContext(NODE_CONTEXT)
  const found = definition == undefined ? context : findContext(context, definition)
  if (found == undefined) {
    throw new Error(
      definition == undefined
        ? '[formtree] useFormNode() found no provided node. Render a FormNodeProvider above this component.'
        : '[formtree] useFormNode(definition) found no provided node for this definition.',
    )
  }
  useNodeState(found.node)
  return found.node
}

export function useNearestNode(): UniversalNode | undefined {
  return useContext(NODE_CONTEXT)?.node
}

function findContext(context: NodeContext | undefined, definition: Definition): NodeContext | undefined {
  let current = context
  while (current != undefined && current.node.definition != definition) {
    current = current.parent
  }
  return current
}
