import type { NodeKind, UniversalNode } from '@formtree/core'
import type { RegisteredForm } from '../formtree-app'
import type { InspectorNode, InspectorState, InspectorTag } from './devtools-api'

import { isPlainObject, NODE_KIND } from '@formtree/core'

const ID_SEPARATOR = '#'

const TEXT_COLOR = 0xffffff

interface TagStyle {
  readonly backgroundColor: number
  readonly tooltip: string
}

const FORM_ID_TAG: TagStyle = {
  backgroundColor: 0x94a3b8,
  tooltip: 'The id of the form, the prefix of every DOM id in it.',
}

const KIND_TAGS: Record<NodeKind, TagStyle> = {
  field: {
    backgroundColor: 0x475569,
    tooltip: 'Defined with defineField: its own schema, rules and output.',
  },
  group: {
    backgroundColor: 0x0b7a63,
    tooltip: 'Defined with defineGroup: its own schema, children and rules.',
  },
  array: {
    backgroundColor: 0x7c3aed,
    tooltip: 'Defined with arrayOf: a list whose items share one definition.',
  },
  lens: {
    backgroundColor: 0x94a3b8,
    tooltip:
      "A key of its parent's schema, without a definition of its own. The parent validates it, and its submit hands over the validated input.",
  },
}

interface StateTag extends TagStyle {
  readonly labelOf: (node: UniversalNode) => string | undefined
}

const STATE_TAGS: ReadonlyArray<StateTag> = [
  {
    backgroundColor: 0x9ca3af,
    tooltip: 'activeWhen turned this branch off: it is not validated and not in the output, and its value is kept.',
    labelOf: node => (node.state.active ? undefined : 'inactive'),
  },
  {
    backgroundColor: 0xdc2626,
    tooltip: 'Errors in this subtree that the user sees now.',
    labelOf: node => errorCountLabel(node.listErrors({ deep: true }).length, 'shown'),
  },
  {
    backgroundColor: 0x6b7280,
    tooltip:
      'Errors in this subtree that exist but are not shown yet: the display mode waits for a blur, a change or a submit.',
    labelOf: node => errorCountLabel(hiddenErrorCount(node), 'hidden'),
  },
  {
    backgroundColor: 0xd97706,
    tooltip: 'An asynchronous check in this subtree is running.',
    labelOf: node => (node.state.validating ? 'checking' : undefined),
  },
  {
    backgroundColor: 0xdc2626,
    tooltip: 'An asynchronous check in this subtree threw.',
    labelOf: node => (node.state.failedChecks.length > 0 ? 'check failed' : undefined),
  },
  {
    backgroundColor: 0x2563eb,
    tooltip: 'A submit of this node is running.',
    labelOf: node => (node.state.submitting ? 'submitting' : undefined),
  },
  {
    backgroundColor: 0x2563eb,
    tooltip: 'How many times this node was submitted.',
    labelOf: node => (node.state.submitCount > 0 ? `submitted ×${node.state.submitCount}` : undefined),
  },
  {
    backgroundColor: 0x0891b2,
    tooltip: 'A value in this subtree differs from its initial value.',
    labelOf: node => (node.state.dirty ? 'dirty' : undefined),
  },
]

interface NodeChild {
  readonly label: string
  readonly node: UniversalNode
}

const CHILDREN_BY_KIND: Record<NodeKind, (node: UniversalNode) => Array<NodeChild>> = {
  field: () => [],
  group: keyedChildren,
  array: node => node.items.map(item => ({ label: `[${item.index}]`, node: item })),
  lens: node => (isPlainObject(node.state.value) ? keyedChildren(node) : []),
}

export function inspectorTree(forms: ReadonlyMap<string, RegisteredForm>, filter: string): Array<InspectorNode> {
  const trees = [...forms].map(([formKey, { form, label }]) => {
    const tree = treeOf(formKey, { label, node: form })
    return { ...tree, tags: [tagOf(form.id, FORM_ID_TAG), ...(tree.tags ?? [])] }
  })
  return filter == '' ? trees : filterTree(trees, filter.toLowerCase())
}

export function inspectedNode(
  forms: ReadonlyMap<string, RegisteredForm>,
  inspectorId: string,
): UniversalNode | undefined {
  const separator = inspectorId.indexOf(ID_SEPARATOR)
  const form = forms.get(inspectorId.slice(0, separator))?.form
  const path = inspectorId.slice(separator + 1)
  if (form == undefined || path == '') {
    return form
  }
  return form.field(path)
}

export function inspectorState(node: UniversalNode): InspectorState {
  const { errors, ...state } = node.state
  return {
    node: [
      { key: 'kind', value: node.kind },
      { key: 'path', value: node.path },
      { key: 'id', value: node.id },
    ],
    state: Object.entries(state).map(([key, value]) => ({ key, value })),
    errors: [
      { key: 'visible', value: errors },
      { key: 'all', value: node.listErrors({ includeHidden: true }) },
    ],
  }
}

function treeOf(formKey: string, { label, node }: NodeChild): InspectorNode {
  return {
    id: `${formKey}${ID_SEPARATOR}${node.path}`,
    label,
    tags: [tagOf(node.kind, KIND_TAGS[node.kind]), ...stateTagsOf(node)],
    children: CHILDREN_BY_KIND[node.kind](node).map(child => treeOf(formKey, child)),
  }
}

function keyedChildren(node: UniversalNode): Array<NodeChild> {
  const declaredKeys = declaredKeysOf(node)
  const schemaKeys = new Set([...valueKeysOf(node), ...erroredKeysOf(node)].filter(key => !declaredKeys.includes(key)))
  return [...declaredKeys, ...[...schemaKeys].sort()].map(key => ({ label: key, node: node.field(key) }))
}

function valueKeysOf(node: UniversalNode): Array<string> {
  const value = node.state.value
  return isPlainObject(value) ? Object.keys(value) : []
}

function declaredKeysOf(node: UniversalNode): Array<string> {
  const definition = node.definition
  return definition?.kind == NODE_KIND.group ? Object.keys(definition.children) : []
}

function erroredKeysOf(node: UniversalNode): Array<string> {
  const prefix = node.path == '' ? '' : `${node.path}.`
  return node
    .listErrors({ deep: true, includeHidden: true })
    .map(error => error.path)
    .filter(path => path.length > prefix.length && path.startsWith(prefix))
    .map(path => path.slice(prefix.length).split('.')[0] ?? '')
}

function stateTagsOf(node: UniversalNode): Array<InspectorTag> {
  return STATE_TAGS.flatMap(tag => {
    const label = tag.labelOf(node)
    return label == undefined ? [] : [tagOf(label, tag)]
  })
}

function hiddenErrorCount(node: UniversalNode): number {
  const allErrors = node.listErrors({ deep: true, includeHidden: true })
  return allErrors.length - node.listErrors({ deep: true }).length
}

function errorCountLabel(count: number, visibility: string): string | undefined {
  if (count == 0) {
    return undefined
  }
  return `${count} ${count == 1 ? 'error' : 'errors'} ${visibility}`
}

function tagOf(label: string, { backgroundColor, tooltip }: TagStyle): InspectorTag {
  return { label, textColor: TEXT_COLOR, backgroundColor, tooltip }
}

function filterTree(nodes: ReadonlyArray<InspectorNode>, filter: string): Array<InspectorNode> {
  return nodes.flatMap(node => {
    const children = filterTree(node.children ?? [], filter)
    return node.label.toLowerCase().includes(filter) || children.length > 0 ? [{ ...node, children }] : []
  })
}
