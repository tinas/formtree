# Splitting into Components

## Using a Part in a Component

<div class="vue-only">

A component below the one that provides the form gets its part with `useFormNode`, which takes the
definition of the node it wants:

```vue [contact-section.vue]
<script setup lang="ts">
import { provideFormNode, useFormNode } from '@formtree/vue'
import { orderForm } from './forms/order'
import TextField from './text-field.vue'

provideFormNode(useFormNode(orderForm).group('contact'))
</script>

<template>
  <TextField name="fullName" label="Name" />
  <TextField name="email" label="Email" />
</template>
```

The section provides the contact details in turn, so its inputs bind by names relative to them.

::: tip No Fallback
`useFormNode` throws when no ancestor provided a node of that definition.
:::

</div>

<div class="react-only">

A component below the one that provides the form gets its part with `useFormNode`, which takes the
definition of the node it wants:

```tsx [contact-section.tsx]
import { FormNodeProvider, useFormNode } from '@formtree/react'
import { orderForm } from './forms/order'
import { TextField } from './text-field'

export function ContactSection() {
  const contact = useFormNode(orderForm).group('contact')

  return (
    <FormNodeProvider node={contact}>
      <TextField name="fullName" label="Name" />
      <TextField name="email" label="Email" />
    </FormNodeProvider>
  )
}
```

The section provides the contact details in turn, so its inputs bind by names relative to them.

::: tip No Fallback
`useFormNode` throws when no ancestor provided a node of that definition.
:::

</div>

<div class="javascript-only">

Set up each part in a function that takes the part's node, typed with `NodeOf` from its definition:

```ts twoslash [order-form.ts]
// @noStaticSemanticInfo
// @filename: forms/order.ts
import { defineGroup } from '@formtree/core'
import { contactGroup } from './contact'
import { lineItemsArray } from './line-items'

export const orderForm = defineGroup({
  children: { contact: contactGroup, lineItems: lineItemsArray },
})
// @filename: bind-input.ts
import type { FieldNode } from '@formtree/core'

export declare function bindInput(field: FieldNode<string | undefined, unknown>): () => void
// @filename: order-form.ts
// ---cut---
import type { NodeOf } from '@formtree/core'
import { createForm } from '@formtree/core'
import { bindInput } from './bind-input'
import { contactGroup } from './forms/contact'
import { orderForm } from './forms/order'

const form = createForm(orderForm)

bindContactSection(form.group('contact'))

function bindContactSection(contact: NodeOf<typeof contactGroup>) {
  bindInput(contact.field('fullName'))
  bindInput(contact.field('email'))
}
```

The function knows only the contact definition, so it works for contact details in any form.

</div>

## Rendering Rows

<div class="vue-only">

Render one row component per item, keyed by the item's `key`, and pass it the item's `index`:

```vue [line-item-list.vue]
<script setup lang="ts">
import { provideFormNode, useFormNode } from '@formtree/vue'
import { orderForm } from './forms/order'
import LineItemRow from './line-item-row.vue'

const lineItems = provideFormNode(useFormNode(orderForm).array('lineItems'))
</script>

<template>
  <LineItemRow v-for="lineItem in lineItems.items" :key="lineItem.key" :index="lineItem.index" />
</template>
```

The row reads the list by its definition and provides its item:

```vue [line-item-row.vue]
<script setup lang="ts">
import { provideFormNode, useFormNode } from '@formtree/vue'
import { lineItemsArray } from './forms/line-items'
import NumberField from './number-field.vue'
import TextField from './text-field.vue'

const props = defineProps<{ index: number }>()

provideFormNode(useFormNode(lineItemsArray).items[props.index]!)
</script>

<template>
  <TextField name="sku" label="Product" />
  <NumberField name="quantity" label="Quantity" />
</template>
```

Keyed by `key`, each component stays with its item when the list is reordered.

</div>

<div class="react-only">

Read the items with `useNodeState`, render one row component per item, keyed by the item's `key`,
and pass it the item's `index`:

```tsx [line-item-list.tsx]
import { FormNodeProvider, useFormNode, useNodeState } from '@formtree/react'
import { orderForm } from './forms/order'
import { LineItemRow } from './line-item-row'

export function LineItemList() {
  const lineItems = useFormNode(orderForm).array('lineItems')
  const items = useNodeState(lineItems, node => node.items)

  return (
    <FormNodeProvider node={lineItems}>
      {items.map(lineItem => (
        <LineItemRow key={lineItem.key} index={lineItem.index} />
      ))}
    </FormNodeProvider>
  )
}
```

The list re-renders when a row is added, removed or moved, not when a value inside a row changes. The
row reads the list by its definition and provides its item:

```tsx [line-item-row.tsx]
import { FormNodeProvider, useFormNode } from '@formtree/react'
import { lineItemsArray } from './forms/line-items'
import { NumberField } from './number-field'
import { TextField } from './text-field'

export function LineItemRow({ index }: { index: number }) {
  const row = useFormNode(lineItemsArray).items[index]!

  return (
    <FormNodeProvider node={row}>
      <TextField name="sku" label="Product" />
      <NumberField name="quantity" label="Quantity" />
    </FormNodeProvider>
  )
}
```

Keyed by `key`, each component stays with its item when the list is reordered.

</div>

<div class="javascript-only">

Create each row's element once and keep it by the item's `key`:

```ts twoslash [line-item-list.ts]
// @noStaticSemanticInfo
// @filename: forms/order.ts
import { defineGroup } from '@formtree/core'
import { contactGroup } from './contact'
import { lineItemsArray } from './line-items'

export const orderForm = defineGroup({
  children: { contact: contactGroup, lineItems: lineItemsArray },
})
// @filename: line-item-list.ts
// ---cut---
import type { ArrayItem, NodeOf } from '@formtree/core'
import { createForm } from '@formtree/core'
import { lineItemGroup } from './forms/line-items'
import { orderForm } from './forms/order'

const form = createForm(orderForm)
const lineItems = form.array('lineItems')
const list = document.getElementById('line-items')!
const rowTemplate = document.getElementById('line-item-row') as HTMLTemplateElement
const rowElements = new Map<string, HTMLElement>()

renderRows()

function renderRows() {
  list.replaceChildren(
    ...lineItems.items.map(lineItem => {
      const element = rowElements.get(lineItem.key) ?? createRow(lineItem)
      rowElements.set(lineItem.key, element)
      return element
    }),
  )
}

function createRow(row: NodeOf<typeof lineItemGroup> & ArrayItem) {
  const element = rowTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement

  element.querySelector('.remove')!.addEventListener('click', () => {
    rowElements.delete(row.key)
    lineItems.remove(row.index)
    renderRows()
  })
  return element
}
```

Each element stays with its item when the list is reordered, and `row.index` is always the item's
current position.

</div>

## Showing a Row's State

<div class="vue-only">

Read `row.state` in the template to show what the row is doing, such as a save in progress:

```vue{3,10,12-14,20-22} [line-item-row.vue]
<script setup lang="ts">
import { provideFormNode, useFormNode } from '@formtree/vue'
import { saveLineItem } from './api'
import { lineItemsArray } from './forms/line-items'
import NumberField from './number-field.vue'
import TextField from './text-field.vue'

const props = defineProps<{ index: number }>()

const row = provideFormNode(useFormNode(lineItemsArray).items[props.index]!)

const save = row.handleSubmit(async lineItem => {
  await saveLineItem(lineItem)
})
</script>

<template>
  <TextField name="sku" label="Product" />
  <NumberField name="quantity" label="Quantity" />
  <button type="button" :aria-busy="row.state.submitting" @click="save">
    {{ row.state.submitting ? 'Saving…' : 'Save' }}
  </button>
</template>
```

`state` is reactive, so the button updates when the save starts and when it ends.

</div>

<div class="react-only">

Read `submitting` with `useNodeState`, which re-renders the component only when the value it selects
changes:

```tsx{1-2,9-12,18-20} [line-item-row.tsx]
import { FormNodeProvider, useFormNode, useNodeState } from '@formtree/react'
import { saveLineItem } from './api'
import { lineItemsArray } from './forms/line-items'
import { NumberField } from './number-field'
import { TextField } from './text-field'

export function LineItemRow({ index }: { index: number }) {
  const row = useFormNode(lineItemsArray).items[index]!
  const submitting = useNodeState(row, node => node.state.submitting)
  const save = row.handleSubmit(async lineItem => {
    await saveLineItem(lineItem)
  })

  return (
    <FormNodeProvider node={row}>
      <TextField name="sku" label="Product" />
      <NumberField name="quantity" label="Quantity" />
      <button type="button" aria-busy={submitting} onClick={() => save()}>
        {submitting ? 'Saving…' : 'Save'}
      </button>
    </FormNodeProvider>
  )
}
```

A component re-renders only through `useNodeState` and `useField`, so reading `row.state` directly
would show the state from the last render.

</div>

<div class="javascript-only">

Update the row from its own `subscribe` to show what it is doing, such as a save in progress:

```ts{3,5-14,17} twoslash [line-item-list.ts]
// @noStaticSemanticInfo
// @filename: forms/order.ts
import { defineGroup } from '@formtree/core'
import { contactGroup } from './contact'
import { lineItemsArray } from './line-items'

export const orderForm = defineGroup({
  children: { contact: contactGroup, lineItems: lineItemsArray },
})
// @filename: api.ts
export { saveLineItem } from './forms/api'
// @filename: line-item-list.ts
import type { ArrayItem, NodeOf } from '@formtree/core'
import { createForm } from '@formtree/core'
import { saveLineItem } from './api'
import { lineItemGroup } from './forms/line-items'
import { orderForm } from './forms/order'

const form = createForm(orderForm)
const lineItems = form.array('lineItems')
const rowTemplate = document.getElementById('line-item-row') as HTMLTemplateElement
const rowElements = new Map<string, HTMLElement>()

declare function renderRows(): void
// ---cut---
function createRow(row: NodeOf<typeof lineItemGroup> & ArrayItem) {
  const element = rowTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement
  const save = element.querySelector<HTMLButtonElement>('.save')!

  save.addEventListener(
    'click',
    row.handleSubmit(async lineItem => {
      await saveLineItem(lineItem)
    }),
  )
  const stopShowingStatus = row.subscribe(() => {
    save.textContent = row.state.submitting ? 'Saving…' : 'Save'
    save.setAttribute('aria-busy', String(row.state.submitting))
  })

  element.querySelector('.remove')!.addEventListener('click', () => {
    stopShowingStatus()
    rowElements.delete(row.key)
    lineItems.remove(row.index)
    renderRows()
  })
  return element
}
```

Removing the row stops its subscription.

</div>
