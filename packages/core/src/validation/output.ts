import type { AnyArrayDefinition, AnyGroupDefinition, Definition } from '../definitions/definition'
import type { DefinitionHandlers } from '../definitions/runtime-options'
import type { FormState } from '../state/form-state'
import type { SyncEntry } from './sync-validation'

import { definitionAt } from '../definitions/definition-at'
import { matchDefinition } from '../definitions/runtime-options'
import { joinPath, splitPath } from '../paths/path'
import { getIn, toGroupRecord } from '../paths/value-tree'
import { itemSegment, toPath } from '../state/node-id'

export interface OutputInput {
  readonly definition: Definition
  readonly entries: ReadonlyMap<string, SyncEntry>
  readonly state: FormState
  readonly nodeId: string
}

const OUTPUT_BUILDERS: DefinitionHandlers<OutputInput, unknown> = {
  field: (_definition, input) => input.entries.get(input.nodeId)?.output,
  group: buildGroupOutput,
  array: buildArrayOutput,
}

export function buildOutput(input: OutputInput): unknown {
  const nodeDefinition = definitionAt(input.definition, input.nodeId)
  if (nodeDefinition == undefined) {
    return valueAt(input.state, input.nodeId)
  }
  return matchDefinition(nodeDefinition, OUTPUT_BUILDERS, input)
}

export function valueAt(state: FormState, nodeId: string): unknown {
  const path = toPath(state.arrayKeys, nodeId)
  return path == undefined ? undefined : getIn(state.value, splitPath(path))
}

function buildGroupOutput(definition: AnyGroupDefinition, input: OutputInput): unknown {
  const ownOutput = input.entries.get(input.nodeId)?.output
  const childOutputs = Object.keys(definition.children)
    .map(key => {
      return {
        key,
        nodeId: joinPath(input.nodeId, key),
      }
    })
    .filter(child => !input.state.inactive.has(child.nodeId))
    .map(child => [child.key, buildOutput({ ...input, nodeId: child.nodeId })])
  return {
    ...toGroupRecord(ownOutput),
    ...Object.fromEntries(childOutputs),
  }
}

function buildArrayOutput(_definition: AnyArrayDefinition, input: OutputInput): unknown {
  const keys = input.state.arrayKeys.get(input.nodeId) ?? []
  return keys.map(key => buildOutput({ ...input, nodeId: joinPath(input.nodeId, itemSegment(key)) }))
}
