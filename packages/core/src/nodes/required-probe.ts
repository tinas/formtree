import type { Definition } from '../definitions/definition'
import type { FormRuntime } from '../form/form-runtime'
import type { StandardSchemaV1 } from '../standard-schema/standard-schema'
import type { NodeKind } from './node-kind'

import { definitionAt } from '../definitions/definition-at'
import { isIndexSegment, joinSegments, parentPath, pathAndAncestors, splitPath } from '../paths/path'
import { isPlainObject, ownValue, writeIn } from '../paths/value-tree'
import { issuePathToString } from '../standard-schema/run-schema'
import { toPath } from '../state/node-id'
import { materializeStructure } from '../state/structure'
import { nodeKindOf } from './node-identity'

interface SchemaOwner {
  readonly id: string
  readonly schema: StandardSchemaV1
  readonly definition: Definition
}

type OwnerFinder = (runtime: FormRuntime, nodeId: string) => SchemaOwner | undefined

type IssuePaths = ReadonlySet<string> | undefined

const OWNER_FINDERS: Record<NodeKind, OwnerFinder> = {
  field: schemaOwnerAt,
  group: () => undefined,
  array: () => undefined,
  lens: ancestorSchemaOwner,
}

const emptyFormRuns = new WeakMap<Definition, WeakMap<StandardSchemaV1, Map<string, IssuePaths>>>()

export function isRequiredNode(runtime: FormRuntime, nodeId: string): boolean {
  const owner = OWNER_FINDERS[nodeKindOf(runtime, nodeId)](runtime, nodeId)
  const nodePath = toPath(runtime.state.arrayKeys, nodeId)
  if (owner == undefined || nodePath == undefined) {
    return false
  }
  const path = splitPath(nodePath).slice(splitPath(owner.id).length)
  return emptyFormIssues(owner, path)?.has(joinSegments(path)) ?? false
}

function schemaOwnerAt(runtime: FormRuntime, id: string): SchemaOwner | undefined {
  const schema = runtime.syncEntries.get(id)?.schema
  const definition = definitionAt(runtime.definition, id)
  return schema == undefined || definition == undefined ? undefined : { id, schema, definition }
}

function ancestorSchemaOwner(runtime: FormRuntime, nodeId: string): SchemaOwner | undefined {
  const id = pathAndAncestors(parentPath(nodeId)).findLast(ancestorId => {
    return runtime.syncEntries.get(ancestorId)?.schema != undefined
  })
  return id == undefined ? undefined : schemaOwnerAt(runtime, id)
}

function emptyFormIssues(owner: SchemaOwner, path: ReadonlyArray<string>): IssuePaths {
  const runs = emptyFormRunsOf(owner)
  const containers = containerPath(path)
  if (!runs.has(containers)) {
    const emptyForm = emptyFormAlong(materializeStructure(owner.definition, undefined), path)
    runs.set(containers, issuePathsOf(owner.schema, emptyForm))
  }
  return runs.get(containers)
}

function emptyFormRunsOf(owner: SchemaOwner): Map<string, IssuePaths> {
  let bySchema = emptyFormRuns.get(owner.definition)
  if (bySchema == undefined) {
    bySchema = new WeakMap()
    emptyFormRuns.set(owner.definition, bySchema)
  }
  let runs = bySchema.get(owner.schema)
  if (runs == undefined) {
    runs = new Map()
    bySchema.set(owner.schema, runs)
  }
  return runs
}

function containerPath(path: ReadonlyArray<string>): string {
  const isSlot = path.length > 0 && isIndexSegment(path[path.length - 1])
  return joinSegments(isSlot ? path : path.slice(0, -1))
}

function emptyFormAlong(tree: unknown, path: ReadonlyArray<string>): unknown {
  if (path.length == 0) {
    return tree
  }
  const [segment, ...rest] = path
  if (isIndexSegment(segment)) {
    const items = Array.isArray(tree) ? tree : []
    const index = Number(segment)
    return Array.from({ length: Math.max(items.length, index + 1) }, (_, position) => {
      return position == index ? emptyChildAlong(items[position], rest) : items[position]
    })
  }
  const record = isPlainObject(tree) ? tree : {}
  if (rest.length == 0) {
    return writeIn(record, [segment], undefined)
  }
  return { ...record, [segment]: emptyChildAlong(ownValue(record, segment), rest) }
}

function emptyChildAlong(value: unknown, rest: ReadonlyArray<string>): unknown {
  return rest.length == 0 ? undefined : emptyFormAlong(value, rest)
}

function issuePathsOf(schema: StandardSchemaV1, value: unknown): IssuePaths {
  const result = schema['~standard'].validate(value)
  if (result instanceof Promise) {
    return undefined
  }
  return new Set(result.issues?.map(issue => issuePathToString(issue.path)))
}
