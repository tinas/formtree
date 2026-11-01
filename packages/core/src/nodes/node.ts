import type { Definition } from '../definitions/definition'
import type { ErrorInput } from '../errors/form-error'
import type { FormEventObserver } from '../form/form-events'
import type { FormRuntime } from '../form/form-runtime'
import type { NodeKind } from './node-kind'
import type {
  ClearErrorsOptions,
  FieldAttributes,
  ListedError,
  ListErrorsOptions,
  NodeState,
  ResetOptions,
  SetErrorsOptions,
  SubmitEventLike,
  SubmitHandler,
  SubmitOptions,
  SubmitOutcome,
  ValidationResult,
} from './node-types'

import { definitionAt } from '../definitions/definition-at'
import { clearNodeErrors, listNodeErrors, setNodeErrors } from '../form/error-operations'
import { focusElementById } from '../form/focus'
import { observeRuntime } from '../form/form-events'
import { subscribeToRuntime } from '../form/form-runtime'
import { createSubmitHandler, validateNode } from '../form/submit'
import { blurNode, editNodeArray, resetNodeValue, setNodeValue } from '../form/value-operations'
import { joinPath } from '../paths/path'
import { ARRAY_EDIT } from '../state/array-transitions'
import { itemSegment, toNodeId } from '../state/node-id'
import {
  descriptionIdOf,
  domIdOf,
  errorIdOf,
  itemIndexOf,
  itemKeyOf,
  nodeKindOf,
  pathOf,
  summaryIdOf,
} from './node-identity'
import { errorMessageOf, readNodeState } from './node-state'

/**
 * Runtime object behind every node view, for adapters.
 *
 * @internal
 */
export interface UniversalNode {
  readonly kind: NodeKind
  readonly definition: Definition | undefined
  readonly id: string
  readonly path: string
  readonly key: string
  readonly index: number
  readonly state: NodeState<unknown>
  readonly errorMessage: string | undefined
  readonly errorId: string
  readonly descriptionId: string
  readonly summaryId: string
  readonly items: ReadonlyArray<UniversalNode>
  readonly subscribe: (listener: () => void) => () => void
  readonly observe: (observer: FormEventObserver) => () => void
  readonly setValue: (value: unknown) => void
  readonly blur: () => void
  readonly validate: () => Promise<ValidationResult<unknown>>
  readonly handleSubmit: (
    onValid: SubmitHandler<unknown>,
    options?: SubmitOptions,
  ) => (event?: SubmitEventLike) => Promise<SubmitOutcome>
  readonly reset: (options?: ResetOptions<unknown>) => void
  readonly setErrors: (errors: ReadonlyArray<ErrorInput>, options?: SetErrorsOptions) => void
  readonly clearErrors: (options?: ClearErrorsOptions) => void
  readonly listErrors: (options?: ListErrorsOptions) => Array<ListedError>
  readonly focus: () => void
  readonly getAttributes: () => FieldAttributes
  readonly field: (path: string) => UniversalNode
  readonly group: (path: string) => UniversalNode
  readonly array: (path: string) => UniversalNode
  readonly push: (value: unknown) => void
  readonly insert: (index: number, value: unknown) => void
  readonly remove: (index: number) => void
  readonly move: (from: number, to: number) => void
  readonly swap: (first: number, second: number) => void
  readonly replace: (values: ReadonlyArray<unknown>) => void
}

export function nodeFor(runtime: FormRuntime, nodeId: string): UniversalNode {
  const cached = runtime.nodes.get(nodeId) as UniversalNode | undefined
  if (cached != undefined) {
    return cached
  }
  const node = createNode(runtime, nodeId)
  runtime.nodes.set(nodeId, node)
  return node
}

export function nodeAt(runtime: FormRuntime, baseId: string, path: string): UniversalNode {
  return nodeFor(runtime, toNodeId(runtime.state.arrayKeys, baseId, path) ?? joinPath(baseId, path))
}

export function itemNodesOf(runtime: FormRuntime, arrayId: string): ReadonlyArray<UniversalNode> {
  const keys = runtime.state.arrayKeys.get(arrayId)
  const cached = runtime.itemLists.get(arrayId)
  if (cached != undefined && cached.keys == keys) {
    return cached.nodes as ReadonlyArray<UniversalNode>
  }
  const nodes = (keys ?? []).map(key => nodeFor(runtime, joinPath(arrayId, itemSegment(key))))
  runtime.itemLists.set(arrayId, { keys, nodes })
  return nodes
}

export function attributesOf(runtime: FormRuntime, nodeId: string): FieldAttributes {
  const hasErrors = readNodeState(runtime, nodeId).errors.length > 0
  return {
    id: domIdOf(runtime, nodeId),
    name: pathOf(runtime, nodeId),
    'aria-invalid': hasErrors ? 'true' : 'false',
    'aria-describedby': hasErrors ? errorIdOf(runtime, nodeId) : null,
  }
}

function createNode(runtime: FormRuntime, nodeId: string): UniversalNode {
  return {
    get kind() {
      return nodeKindOf(runtime, nodeId)
    },
    get definition() {
      return definitionAt(runtime.definition, nodeId)
    },
    get id() {
      return domIdOf(runtime, nodeId)
    },
    get path() {
      return pathOf(runtime, nodeId)
    },
    get key() {
      return itemKeyOf(nodeId)
    },
    get index() {
      return itemIndexOf(runtime, nodeId)
    },
    get state() {
      return readNodeState(runtime, nodeId)
    },
    get errorMessage() {
      return errorMessageOf(runtime, nodeId)
    },
    get errorId() {
      return errorIdOf(runtime, nodeId)
    },
    get descriptionId() {
      return descriptionIdOf(runtime, nodeId)
    },
    get summaryId() {
      return summaryIdOf(runtime, nodeId)
    },
    get items() {
      return itemNodesOf(runtime, nodeId)
    },
    subscribe: listener => subscribeToRuntime(runtime, listener),
    observe: observer => observeRuntime(runtime, observer),
    setValue: value => setNodeValue(runtime, nodeId, value),
    blur: () => blurNode(runtime, nodeId),
    validate: () => validateNode(runtime, nodeId),
    handleSubmit: (onValid, options) => createSubmitHandler({ runtime, nodeId, onValid, options }),
    reset: options => resetNodeValue(runtime, nodeId, options),
    setErrors: (errors, options) => setNodeErrors({ runtime, nodeId, errors, options }),
    clearErrors: options => clearNodeErrors(runtime, nodeId, options),
    listErrors: options => listNodeErrors(runtime, nodeId, options),
    focus: () => focusElementById(domIdOf(runtime, nodeId), runtime.options.focusElement),
    getAttributes: () => attributesOf(runtime, nodeId),
    field: path => nodeAt(runtime, nodeId, path),
    group: path => nodeAt(runtime, nodeId, path),
    array: path => nodeAt(runtime, nodeId, path),
    push: value => editNodeArray(runtime, nodeId, { type: ARRAY_EDIT.push, value }),
    insert: (index, value) => editNodeArray(runtime, nodeId, { type: ARRAY_EDIT.insert, index, value }),
    remove: index => editNodeArray(runtime, nodeId, { type: ARRAY_EDIT.remove, index }),
    move: (from, to) => editNodeArray(runtime, nodeId, { type: ARRAY_EDIT.move, from, to }),
    swap: (first, second) => editNodeArray(runtime, nodeId, { type: ARRAY_EDIT.swap, first, second }),
    replace: values => editNodeArray(runtime, nodeId, { type: ARRAY_EDIT.replace, values }),
  }
}
