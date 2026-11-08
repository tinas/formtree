import type { FormRuntime } from '../form/form-runtime'
import type { StandardSchemaV1 } from '../standard-schema/standard-schema'
import type { NodeKind } from './node-kind'

import { joinSegments, parentPath, pathAndAncestors, splitPath } from '../paths/path'
import { writeIn } from '../paths/value-tree'
import { runSchema } from '../standard-schema/run-schema'
import { toPath } from '../state/node-id'
import { nodeKindOf } from './node-identity'

interface SchemaOwner {
  readonly id: string
  readonly schema: StandardSchemaV1
  readonly value: unknown
}

interface ProbeAnswer {
  readonly schema: StandardSchemaV1
  readonly value: unknown
  readonly required: boolean
}

type OwnerFinder = (runtime: FormRuntime, nodeId: string) => SchemaOwner | undefined

const OWNER_FINDERS: Record<NodeKind, OwnerFinder> = {
  field: ownSchemaOwner,
  group: () => undefined,
  array: () => undefined,
  lens: ancestorSchemaOwner,
}

export function requiredReader(runtime: FormRuntime, nodeId: string): () => boolean {
  let answer: ProbeAnswer | undefined
  return () => {
    const owner = OWNER_FINDERS[nodeKindOf(runtime, nodeId)](runtime, nodeId)
    if (owner == undefined) {
      return false
    }
    if (answer == undefined || answer.schema != owner.schema || !Object.is(answer.value, owner.value)) {
      answer = { schema: owner.schema, value: owner.value, required: rejectsEmpty(runtime, nodeId, owner) }
    }
    return answer.required
  }
}

function ownSchemaOwner(runtime: FormRuntime, nodeId: string): SchemaOwner | undefined {
  const schema = runtime.syncEntries.get(nodeId)?.schema
  return schema == undefined ? undefined : { id: nodeId, schema, value: undefined }
}

function ancestorSchemaOwner(runtime: FormRuntime, nodeId: string): SchemaOwner | undefined {
  const id = pathAndAncestors(parentPath(nodeId)).findLast(ancestorId => {
    return runtime.syncEntries.get(ancestorId)?.schema != undefined
  })
  const entry = id == undefined ? undefined : runtime.syncEntries.get(id)
  return id == undefined || entry?.schema == undefined ? undefined : { id, schema: entry.schema, value: entry.value }
}

function rejectsEmpty(runtime: FormRuntime, nodeId: string, owner: SchemaOwner): boolean {
  const nodePath = toPath(runtime.state.arrayKeys, nodeId)
  if (nodePath == undefined) {
    return false
  }
  const path = splitPath(nodePath).slice(splitPath(owner.id).length)
  const run = runSchema(owner.schema, writeIn(owner.value, path, undefined))
  if (run instanceof Promise || run.valid) {
    return false
  }
  const keyPath = joinSegments(path)
  return run.errors.some(error => error.path == keyPath)
}
