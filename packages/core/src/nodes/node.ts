import type { Definition } from '../definitions/definition'
import type { ErrorInput } from '../errors/form-error'
import type { FormEventObserver } from '../form/form-events'
import type { FormRuntime } from '../form/form-runtime'
import type { ValidateOptions } from '../validation/validation-pass'
import type { NodeKind } from './node-kind'
import type {
  ClearErrorsOptions,
  FieldAttributes,
  ListedError,
  ListErrorsOptions,
  NodeState,
  ResetOptions,
  SetErrorsOptions,
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
import { submitNode, validateNode } from '../form/submit'
import { blurNode, editNodeArray, resetNodeValue, setNodeValue } from '../form/value-operations'
import { shallowEqual } from '../paths/equality'
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
import { computeNodeAttributes, computeNodeState, errorMessageOf } from './node-state'

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
  readonly attributes: FieldAttributes
  readonly errorId: string
  readonly descriptionId: string
  readonly summaryId: string
  readonly items: ReadonlyArray<UniversalNode>
  readonly subscribe: (listener: () => void) => () => void
  readonly observe: (observer: FormEventObserver) => () => void
  readonly setValue: (value: unknown) => void
  readonly blur: () => void
  readonly validate: (options?: ValidateOptions) => Promise<ValidationResult<unknown>>
  readonly handleSubmit: (onValid: SubmitHandler<unknown>, options?: SubmitOptions) => () => Promise<SubmitOutcome>
  readonly reset: (options?: ResetOptions<unknown>) => void
  readonly setErrors: (errors: ReadonlyArray<ErrorInput>, options?: SetErrorsOptions) => void
  readonly clearErrors: (options?: ClearErrorsOptions) => void
  readonly listErrors: (options?: ListErrorsOptions) => Array<ListedError>
  readonly focus: () => void
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

interface VersionedValue<Value> {
  readonly version: number
  readonly value: Value
}

interface ItemNodes {
  readonly keys: ReadonlyArray<string> | undefined
  readonly nodes: ReadonlyArray<UniversalNode>
}

export function nodeFor(runtime: FormRuntime, nodeId: string): UniversalNode {
  const cached = runtime.nodes.get(nodeId)
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

function cachedByVersion<Value>(runtime: FormRuntime, compute: (previous: Value | undefined) => Value): () => Value {
  let cached: VersionedValue<Value> | undefined
  return () => {
    if (cached?.version == runtime.version) {
      return cached.value
    }
    const next = compute(cached?.value)
    const value = cached != undefined && shallowEqual(cached.value, next) ? cached.value : next
    cached = { version: runtime.version, value }
    return value
  }
}

function cachedItemNodes(runtime: FormRuntime, arrayId: string): () => ReadonlyArray<UniversalNode> {
  let cached: ItemNodes | undefined
  return () => {
    const keys = runtime.state.arrayKeys.get(arrayId)
    if (cached != undefined && cached.keys == keys) {
      return cached.nodes
    }
    const nodes = (keys ?? []).map(key => nodeFor(runtime, joinPath(arrayId, itemSegment(key))))
    cached = { keys, nodes }
    return nodes
  }
}

function createNode(runtime: FormRuntime, nodeId: string): UniversalNode {
  const readState = cachedByVersion<NodeState<unknown>>(runtime, previous =>
    computeNodeState(runtime, nodeId, previous),
  )
  const readAttributes = cachedByVersion(runtime, () => computeNodeAttributes(runtime, nodeId, readState()))
  const readItems = cachedItemNodes(runtime, nodeId)
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
      return readState()
    },
    get errorMessage() {
      return errorMessageOf(runtime, readState())
    },
    get attributes() {
      return readAttributes()
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
      return readItems()
    },
    subscribe: listener => subscribeToRuntime(runtime, listener),
    observe: observer => observeRuntime(runtime, observer),
    setValue: value => setNodeValue(runtime, nodeId, value),
    blur: () => blurNode(runtime, nodeId),
    validate: options => validateNode(runtime, nodeId, options),
    handleSubmit: (onValid, options) => () => submitNode({ runtime, nodeId, onValid, options }),
    reset: options => resetNodeValue(runtime, nodeId, options),
    setErrors: (errors, options) => setNodeErrors({ runtime, nodeId, errors, options }),
    clearErrors: options => clearNodeErrors(runtime, nodeId, options),
    listErrors: options => listNodeErrors(runtime, nodeId, options),
    focus: () => focusElementById(domIdOf(runtime, nodeId), runtime.options.focusElement),
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
