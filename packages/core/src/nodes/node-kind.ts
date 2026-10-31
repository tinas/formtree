/**
 * What a node is.
 *
 * @category Nodes
 */
export const NODE_KIND = {
  field: 'field',
  group: 'group',
  array: 'array',
  /** A key of its parent's schema, without a definition of its own. */
  lens: 'lens',
} as const

/** @category Nodes */
export type NodeKind = (typeof NODE_KIND)[keyof typeof NODE_KIND]
