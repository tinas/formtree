import type { AnyArrayDefinition, AnyGroupDefinition, Definition } from '../definitions/definition'
import type { DefinitionHandlers } from '../definitions/runtime-options'
import type { FormState } from '../state/form-state'
import type { ArrayKeys } from '../state/node-id'

import { resolveItemDefinition } from '../definitions/definition'
import { groupOptionsOf, matchDefinition } from '../definitions/runtime-options'
import { shallowEqual } from '../paths/equality'
import { joinPath } from '../paths/path'
import { isPlainObject, ownValue } from '../paths/value-tree'
import { itemSegment } from '../state/node-id'

export interface Scope {
  readonly nodeId: string
  readonly definition: Definition
  readonly value: unknown
  readonly deps: unknown
}

export interface ScopeCollection {
  readonly scopes: ReadonlyArray<Scope>
  readonly inactive: ReadonlySet<string>
  readonly deps: ReadonlyMap<string, unknown>
}

export interface ScopeCollectionInput {
  readonly definition: Definition
  readonly state: FormState
  readonly previousDeps: ReadonlyMap<string, unknown>
}

interface Collector {
  readonly scopes: Array<Scope>
  readonly inactive: Set<string>
  readonly deps: Map<string, unknown>
  readonly previousDeps: ReadonlyMap<string, unknown>
  readonly arrayKeys: ArrayKeys
}

const CHILD_VISITORS: DefinitionHandlers<VisitInput, void> = {
  field: () => undefined,
  group: visitGroupChildren,
  array: visitArrayItems,
}

interface VisitInput {
  readonly collector: Collector
  readonly scope: Scope
}

export function collectScopes({ definition, state, previousDeps }: ScopeCollectionInput): ScopeCollection {
  const collector: Collector = {
    scopes: [],
    inactive: new Set(),
    deps: new Map(),
    previousDeps,
    arrayKeys: state.arrayKeys,
  }
  visitScope(collector, {
    nodeId: '',
    definition,
    value: state.value,
    deps: stableDeps(collector, '', state.deps),
  })
  return {
    scopes: collector.scopes,
    inactive: collector.inactive,
    deps: collector.deps,
  }
}

function visitScope(collector: Collector, scope: Scope): void {
  collector.scopes.push(scope)
  collector.deps.set(scope.nodeId, scope.deps)
  matchDefinition(scope.definition, CHILD_VISITORS, { collector, scope })
}

function visitGroupChildren(definition: AnyGroupDefinition, { collector, scope }: VisitInput): void {
  const options = groupOptionsOf(definition)
  const value = isPlainObject(scope.value) ? scope.value : {}
  const context = { value, deps: scope.deps }
  for (const [key, child] of Object.entries(definition.children)) {
    const nodeId = joinPath(scope.nodeId, key)
    if (ownValue(options.activeWhen, key)?.(context) == false) {
      collector.inactive.add(nodeId)
    } else {
      visitScope(collector, {
        nodeId,
        definition: child,
        value: ownValue(value, key),
        deps: stableDeps(collector, nodeId, ownValue(options.childDeps, key)?.(context)),
      })
    }
  }
}

function visitArrayItems(definition: AnyArrayDefinition, { collector, scope }: VisitInput): void {
  const items = Array.isArray(scope.value) ? scope.value : []
  const keys = collector.arrayKeys.get(scope.nodeId) ?? []
  const itemDefinition = resolveItemDefinition(definition)
  items.forEach((item, index) => {
    visitScope(collector, {
      nodeId: joinPath(scope.nodeId, itemSegment(keys[index])),
      definition: itemDefinition,
      value: item,
      deps: scope.deps,
    })
  })
}

function stableDeps(collector: Collector, nodeId: string, deps: unknown): unknown {
  const previous = collector.previousDeps.get(nodeId)
  return previous != undefined && shallowEqual(previous, deps) ? previous : deps
}
