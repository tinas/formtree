# Recursive Definitions

A segment builder describes a set of users with conditions that nest: everyone in Germany, and
either on the pro plan or on a mobile device. Each group of conditions can hold more groups,
to any depth. A definition can include itself to describe that.

## A condition and a tree of conditions

```ts twoslash
import type { GroupDefinition, InputOf } from '@formtree/core'
import { arrayOf, defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'

interface AttributeDeps {
  readonly attributes: ReadonlyArray<{ id: string; label: string }>
}

export const conditionGroup = defineGroupWithDeps<AttributeDeps>()({
  schema: ({ deps }) =>
    z.object({
      attribute: z
        .string({ error: 'Choose an attribute' })
        .refine(id => deps.attributes.some(attribute => attribute.id === id), {
          error: 'This attribute is not available',
        }),
      operator: z.enum(['is', 'isNot'], { error: 'Choose an operator' }),
      value: z.string({ error: 'Enter a value' }).min(1, { error: 'Enter a value' }),
    }),
})

export interface ConditionTreeInput {
  match: 'all' | 'any'
  conditions: Array<InputOf<typeof conditionGroup>>
  groups: Array<ConditionTreeInput>
}

export const conditionTreeGroup: GroupDefinition<ConditionTreeInput, ConditionTreeInput, AttributeDeps> =
  defineGroupWithDeps<AttributeDeps>()({
    schema: z.object({ match: z.enum(['all', 'any']) }),
    children: {
      conditions: arrayOf(conditionGroup),
      groups: arrayOf(() => conditionTreeGroup),
    },
    childDeps: {
      conditions: ({ deps }) => deps,
      groups: ({ deps }) => deps,
    },
    validate: ({ value }) =>
      value.conditions.length + value.groups.length === 0
        ? { path: 'conditions', code: 'Add a condition or a group' }
        : undefined,
  })
```

Three things make it work:

1. **`arrayOf(() => conditionTreeGroup)`** refers to the definition lazily, because it does not
   exist yet when its own options are written.
2. **The type annotation** on `conditionTreeGroup`. TypeScript cannot infer the type of a
   constant that refers to itself in its own initializer, the same limit `z.lazy` has. The
   annotation gives the input, the output and the dependencies.
3. **`childDeps`** passes the attributes down to every level, so a condition five levels deep
   checks its attribute against the same list as one at the top.

## Every level validates

The tree is built as deep as the value is, and every level runs its own schema and rules. An
empty group at any depth reports `Add a condition or a group` on its own `conditions`.

```ts twoslash
import { createForm } from '@formtree/core'
import { segmentGroup } from './forms/segment'

const form = createForm(segmentGroup, {
  deps: { attributes: [{ id: 'country', label: 'Country' }] },
  initialValue: { rules: { match: 'all' } },
})
// ---cut---
const rules = form.group('rules')

rules.array('groups').push({ match: 'any' })
const nested = rules.array('groups').items[0]!

nested.array('conditions').push({ attribute: 'country', operator: 'is', value: 'DE' })
nested.state.valid // true
```

## Types at any depth

Navigating a recursive tree does not slow the type checker, because a path is only checked as far
as it is written. Each level is again a `conditionTreeGroup` node.

```ts twoslash
import { createForm } from '@formtree/core'
import { segmentGroup } from './forms/segment'

const form = createForm(segmentGroup, {
  deps: { attributes: [{ id: 'country', label: 'Country' }] },
})
// ---cut---
const deep = form.group('rules').array('groups').items[0]?.array('groups').items[0]

deep?.field('match').state.value // 'all' | 'any' | undefined
```

Because the annotation gives the types, the children of an annotated recursive definition are
typed from the annotated input. They are still defined nodes at runtime, with their own schemas
and rules.

## Rendering

A recursive definition is rendered by a recursive component: the component for a condition group
renders its conditions and, for each nested group, itself.
[Segment Builder](/examples/segment-builder) does this in Vue.
