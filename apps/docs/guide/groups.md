# Groups

## Splitting a Form into Parts

A part of a form gets a definition of its own. Define it with `defineGroup`, and add it to the
form's `children`:

```ts twoslash
// @noStaticSemanticInfo
import { defineGroup } from '@formtree/core'
import { z } from 'zod'
// ---cut---
export const addressGroup = defineGroup({
  schema: z.object({
    street: z.string({ error: 'Street is required' }).trim().min(1, { error: 'Street is required' }),
    city: z.string({ error: 'City is required' }).trim().min(1, { error: 'City is required' }),
  }),
})

export const checkoutForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
  }),
  children: {
    address: addressGroup,
  },
})
```

The form holds the address's values under `address`, and any other form can reuse `addressGroup`.

::: tip Keys Are Nodes Too
A key of the schema, such as `email`, is a node too, but it takes its rules from the group, so it is
called a lens node, not a child.
:::

## Reaching a Part

`form.group` returns the node of a part, and the keys you give it are looked up inside that part:

```ts twoslash
// @noStaticSemanticInfo
import { createForm, defineGroup } from '@formtree/core'
import { z } from 'zod'

const addressGroup = defineGroup({
  schema: z.object({
    street: z.string({ error: 'Street is required' }).trim().min(1, { error: 'Street is required' }),
    city: z.string({ error: 'City is required' }).trim().min(1, { error: 'City is required' }),
  }),
})

const checkoutForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
  }),
  children: {
    address: addressGroup,
  },
})

const form = createForm(checkoutForm)
// ---cut---
const address = form.group('address')
const city = address.field('city')
```

::: tip Dotted Paths
A dotted path from the root, `form.field('address.city')`, returns the same node.
:::

## Checking a Part's State

A group's state covers everything inside it. Read `valid` to know whether a part has no errors:

<div class="vue-only">

```vue
<script setup lang="ts">
import { useForm } from '@formtree/vue'
import { checkoutForm } from './forms/checkout'

const form = useForm(checkoutForm)
const address = form.group('address')
</script>

<template>
  <li :class="{ complete: address.state.valid }">Address</li>
</template>
```

</div>

<div class="react-only">

```tsx
import { useForm, useNodeState } from '@formtree/react'
import { checkoutForm } from './forms/checkout'

export function CheckoutSteps() {
  const form = useForm(checkoutForm)
  const addressValid = useNodeState(form.group('address'), node => node.state.valid)

  return <li className={addressValid ? 'complete' : undefined}>Address</li>
}
```

`useNodeState` reads from the node and re-renders the component only when what it read changes, here
when the address becomes valid or invalid.

</div>

<div class="javascript-only">

```ts twoslash
// @noStaticSemanticInfo
// @filename: forms/checkout.ts
import { defineGroup } from '@formtree/core'
import { z } from 'zod'

const addressGroup = defineGroup({
  schema: z.object({
    street: z.string({ error: 'Street is required' }).trim().min(1, { error: 'Street is required' }),
    city: z.string({ error: 'City is required' }).trim().min(1, { error: 'City is required' }),
  }),
})

export const checkoutForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
  }),
  children: {
    address: addressGroup,
  },
})
// @filename: index.ts
// ---cut---
import { createForm } from '@formtree/core'
import { checkoutForm } from './forms/checkout'

const form = createForm(checkoutForm)
const address = form.group('address')
const addressStep = document.querySelector<HTMLLIElement>('#address-step')!

form.subscribe(() => {
  addressStep.classList.toggle('complete', address.state.valid)
})
```

</div>

[`NodeState`](/api/@formtree/core/interfaces/NodeState) lists the other flags, such as `dirty`,
that cover a group's parts in the same way.
