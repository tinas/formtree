import type { Definition } from './definition'
import type { DefinitionHandlers } from './runtime-options'

import { pathAndAncestors, splitPath } from '../paths/path'
import { ownValue } from '../paths/value-tree'
import { itemKeyOf } from '../state/node-id'
import { resolveItemDefinition } from './definition'
import { matchDefinition } from './runtime-options'

const CHILD_DEFINITION: DefinitionHandlers<string, Definition | undefined> = {
  field: () => undefined,
  group: (definition, segment) => ownValue(definition.children, segment),
  array: (definition, segment) => (itemKeyOf(segment) == undefined ? undefined : resolveItemDefinition(definition)),
}

export function definitionAt(root: Definition, nodeId: string): Definition | undefined {
  let current: Definition | undefined = root
  for (const segment of splitPath(nodeId)) {
    current = current == undefined ? undefined : matchDefinition(current, CHILD_DEFINITION, segment)
  }
  return current
}

export function definitionsAlong(root: Definition, nodeId: string): Array<Definition> {
  return pathAndAncestors(nodeId)
    .map(ancestorId => definitionAt(root, ancestorId))
    .filter(definition => definition != undefined)
}

const ITEM_DEFINITION: DefinitionHandlers<undefined, Definition | undefined> = {
  field: () => undefined,
  group: () => undefined,
  array: definition => resolveItemDefinition(definition),
}

export function itemDefinitionAt(root: Definition, arrayId: string): Definition | undefined {
  const arrayDefinition = definitionAt(root, arrayId)
  return arrayDefinition == undefined ? undefined : matchDefinition(arrayDefinition, ITEM_DEFINITION, undefined)
}
