# Recursive Forms

## Defining a Recursive Group

To let a group contain itself, refer to it through a function in `arrayOf` and give it its type with
`GroupDefinition`:

```ts twoslash
import type { GroupDefinition, InputOf } from '@formtree/core'
import { arrayOf, defineGroup } from '@formtree/core'
import { z } from 'zod'

export const conditionGroup = defineGroup({
  schema: z.object({
    attribute: z.string({ error: 'Choose an attribute' }),
    operator: z.enum(['is', 'isNot'], { error: 'Choose an operator' }),
    value: z.string({ error: 'Enter a value' }).min(1, { error: 'Enter a value' }),
  }),
})
// ---cut---
export interface ConditionTreeInput {
  match: 'all' | 'any'
  conditions: Array<InputOf<typeof conditionGroup>>
  groups: Array<ConditionTreeInput>
}

export const conditionTreeGroup: GroupDefinition<ConditionTreeInput> = defineGroup({
  schema: z.object({ match: z.enum(['all', 'any'], { error: 'Choose how the conditions combine' }) }),
  children: {
    conditions: arrayOf(conditionGroup),
    groups: arrayOf(() => conditionTreeGroup),
  },
})
```

The function delays the reference until a form needs the nested level. TypeScript cannot infer the
type of a constant that refers to itself, so the interface describes one level and lists itself
under `groups`.

## Rules and Data at Every Level

Every level runs the same rules. Pass the group's dependencies on to its nested groups in
`childDeps`:

```ts{1-2,8-15} twoslash
import type { GroupDefinition, InputOf } from '@formtree/core'
import { arrayOf, defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'

export interface AttributeDeps {
  readonly attributes: ReadonlyArray<{ id: string; label: string }>
}

export const conditionGroup = defineGroupWithDeps<AttributeDeps>()({
  schema: ({ deps }) =>
    z.object({
      attribute: z
        .string({ error: 'Choose an attribute' })
        .refine(id => deps.attributes.some(attribute => attribute.id == id), {
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
// ---cut---
export const conditionTreeGroup: GroupDefinition<ConditionTreeInput, ConditionTreeInput, AttributeDeps> =
  defineGroupWithDeps<AttributeDeps>()({
    schema: z.object({ match: z.enum(['all', 'any'], { error: 'Choose how the conditions combine' }) }),
    children: {
      conditions: arrayOf(conditionGroup),
      groups: arrayOf(() => conditionTreeGroup),
    },
    childDeps: {
      conditions: ({ deps }) => deps,
      groups: ({ deps }) => deps,
    },
    validate: ({ value }) =>
      value.conditions.length + value.groups.length == 0
        ? { path: 'conditions', code: 'Add a condition or a group' }
        : undefined,
  })
```

The dependency type is the third argument of `GroupDefinition`. A condition at any depth checks
against the same attributes, and an empty group at any depth reports its own error.

## Rendering a Tree

Render the tree with a component that renders one level and itself for each nested group:

<div class="vue-only">

```vue [condition-tree.vue]
<script setup lang="ts">
import { provideFormNode, useFormNode } from '@formtree/vue'
import ConditionRow from './condition-row.vue'
import { conditionTreeGroup } from './forms/segment'

defineOptions({ name: 'ConditionTree' })

const props = defineProps<{ index?: number }>()

const parent = useFormNode(conditionTreeGroup)
const tree = props.index == undefined ? parent : provideFormNode(parent.array('groups').items[props.index]!)
const conditions = tree.array('conditions')
const groups = tree.array('groups')
</script>

<template>
  <fieldset>
    <ConditionRow v-for="condition in conditions.items" :key="condition.key" :index="condition.index" />
    <ConditionTree v-for="group in groups.items" :key="group.key" :index="group.index" />
  </fieldset>
</template>
```

Each nested level takes its group by index from the level above and provides it. `defineOptions`
names the component, so its template can render it.

</div>

<div class="react-only">

```tsx [condition-tree.tsx]
import { FormNodeProvider, useFormNode } from '@formtree/react'
import { ConditionRow } from './condition-row'
import { conditionTreeGroup } from './forms/segment'

export function ConditionTree({ index }: { index?: number }) {
  const parent = useFormNode(conditionTreeGroup)
  const tree = index == undefined ? parent : parent.array('groups').items[index]!
  const conditions = tree.array('conditions')
  const groups = tree.array('groups')

  return (
    <FormNodeProvider node={tree}>
      <fieldset>
        {conditions.items.map(condition => (
          <ConditionRow key={condition.key} index={condition.index} />
        ))}
        {groups.items.map(group => (
          <ConditionTree key={group.key} index={group.index} />
        ))}
      </fieldset>
    </FormNodeProvider>
  )
}
```

Each nested level takes its group by index from the level above and provides it.

</div>

<div class="javascript-only">

```ts twoslash [condition-tree.ts]
// @filename: condition-row.ts
import type { NodeOf } from '@formtree/core'
import type { conditionGroup } from './forms/segment'

export declare function renderConditionRow(condition: NodeOf<typeof conditionGroup>): HTMLElement
// @filename: condition-tree.ts
// ---cut---
import type { NodeOf } from '@formtree/core'

import { renderConditionRow } from './condition-row'
import { conditionTreeGroup } from './forms/segment'

export function renderConditionTree(tree: NodeOf<typeof conditionTreeGroup>): HTMLFieldSetElement {
  const fieldset = document.createElement('fieldset')
  for (const condition of tree.array('conditions').items) {
    fieldset.append(renderConditionRow(condition))
  }
  for (const group of tree.array('groups').items) {
    fieldset.append(renderConditionTree(group))
  }
  return fieldset
}
```

</div>

[Segment Builder](/examples/segment-builder) shows the complete builder.
