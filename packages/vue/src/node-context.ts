import type { Definition, GroupNode, LensShape, NodeOf, UniversalNode } from '@formtree/core'
import type { InjectionKey } from 'vue'

import { inject, provide } from 'vue'

type AnyRecord = Record<string, unknown>

/**
 * The loosely typed node {@link injectFormNode} returns without a definition.
 *
 * @category Node Context
 */
export type AnyGroupNode = GroupNode<LensShape<AnyRecord, AnyRecord>>

interface NodeContext {
  readonly node: UniversalNode
  readonly parent: NodeContext | undefined
}

const NODE_CONTEXT: InjectionKey<NodeContext> = Symbol('formtree-node')

/**
 * Makes a node available to every descendant component and returns it. Nothing is provided implicitly, not even by
 * `useForm`.
 *
 * @category Node Context
 */
export function provideFormNode<Node extends object>(node: Node): Node {
  provide(NODE_CONTEXT, {
    node: node as unknown as UniversalNode,
    parent: inject(NODE_CONTEXT, undefined),
  })
  return node
}

/**
 * Returns the nearest provided node of this definition, typed by it. Throws when no ancestor provided one.
 *
 * @category Node Context
 */
export function injectFormNode<NodeDefinition extends Definition>(definition: NodeDefinition): NodeOf<NodeDefinition>
/** Returns the nearest provided node of any definition, loosely typed. Throws when no ancestor provided one. */
export function injectFormNode(): AnyGroupNode
export function injectFormNode(definition?: Definition): unknown {
  const context = inject(NODE_CONTEXT, undefined)
  const found = definition == undefined ? context : findContext(context, definition)
  if (found == undefined) {
    throw new Error(
      definition == undefined
        ? '[formtree] injectFormNode() found no provided node. Call provideFormNode() in an ancestor component.'
        : '[formtree] injectFormNode(definition) found no provided node for this definition.',
    )
  }
  return found.node
}

function findContext(context: NodeContext | undefined, definition: Definition): NodeContext | undefined {
  let current = context
  while (current != undefined && current.node.definition != definition) {
    current = current.parent
  }
  return current
}
