import type { FormRuntime } from '../form/form-runtime'
import type { NodeKind } from './node-kind'

import { definitionAt } from '../definitions/definition-at'
import { parentPath } from '../paths/path'
import { itemKeyOfNode, toPath } from '../state/node-id'
import { NODE_KIND } from './node-kind'

const ERROR_SUFFIX = 'error'
const DESCRIPTION_SUFFIX = 'description'
const SUMMARY_SUFFIX = 'summary'

export function pathOf(runtime: FormRuntime, nodeId: string): string {
  return toPath(runtime.state.arrayKeys, nodeId) ?? ''
}

export function nodeKindOf(runtime: FormRuntime, nodeId: string): NodeKind {
  return definitionAt(runtime.definition, nodeId)?.kind ?? NODE_KIND.lens
}

export function domIdOf(runtime: FormRuntime, nodeId: string): string {
  const path = pathOf(runtime, nodeId)
  return path == '' ? runtime.formId : `${runtime.formId}:${path}`
}

export function errorIdOf(runtime: FormRuntime, nodeId: string): string {
  return `${domIdOf(runtime, nodeId)}:${ERROR_SUFFIX}`
}

export function descriptionIdOf(runtime: FormRuntime, nodeId: string): string {
  return `${domIdOf(runtime, nodeId)}:${DESCRIPTION_SUFFIX}`
}

export function summaryIdOf(runtime: FormRuntime, nodeId: string): string {
  return `${domIdOf(runtime, nodeId)}:${SUMMARY_SUFFIX}`
}

export function itemKeyOf(nodeId: string): string {
  return itemKeyOfNode(nodeId) ?? ''
}

export function itemIndexOf(runtime: FormRuntime, nodeId: string): number {
  const key = itemKeyOfNode(nodeId)
  const keys = runtime.state.arrayKeys.get(parentPath(nodeId)) ?? []
  return key == undefined ? -1 : keys.indexOf(key)
}
