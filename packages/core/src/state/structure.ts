import type { AnyArrayDefinition, AnyGroupDefinition, Definition } from '../definitions/definition'
import type { DefinitionHandlers } from '../definitions/runtime-options'

import { definitionAt } from '../definitions/definition-at'
import { resolveItemDefinition } from '../definitions/definition'
import { matchDefinition } from '../definitions/runtime-options'
import { isPlainObject } from '../paths/value-tree'

const MATERIALIZERS: DefinitionHandlers<unknown, unknown> = {
  field: (_definition, value) => value,
  group: materializeGroup,
  array: materializeArray,
}

export function materializeStructure(definition: Definition, value: unknown): unknown {
  return matchDefinition(definition, MATERIALIZERS, value)
}

export function materializeAt(root: Definition, nodeId: string, value: unknown): unknown {
  const definition = definitionAt(root, nodeId)
  return definition == undefined ? value : materializeStructure(definition, value)
}

function materializeGroup(definition: AnyGroupDefinition, value: unknown): unknown {
  const base = isPlainObject(value) ? value : {}
  let result = base
  for (const [key, child] of Object.entries(definition.children)) {
    const childValue = materializeStructure(child, base[key])
    if (!Object.is(childValue, base[key])) {
      result = { ...result, [key]: childValue }
    }
  }
  return result
}

function materializeArray(definition: AnyArrayDefinition, value: unknown): unknown {
  const base = Array.isArray(value) ? value : []
  const itemDefinition = resolveItemDefinition(definition)
  const items = base.map(item => materializeStructure(itemDefinition, item))
  const unchanged = items.every((item, index) => Object.is(item, base[index]))
  return unchanged ? base : items
}
