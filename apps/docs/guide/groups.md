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
    street: z.string({ error: 'Street is required' }).trim().min(1, {
      error: 'Street is required',
    }),
    city: z.string({ error: 'City is required' }).trim().min(1, {
      error: 'City is required',
    }),
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
Each key of the schema, such as `email`, is also a node. Because its rules come from the group's
schema rather than from a definition of its own, it is called a lens node rather than a child.

## Accessing a Part

Each part of a form has its own node, which `form.group` finds by the part's name. From there,
`field` and `group` look inside that part, so `address.field('city')` finds the city within the
address:

```ts twoslash
// @noStaticSemanticInfo
import { createForm, defineGroup } from '@formtree/core'
import { z } from 'zod'

const addressGroup = defineGroup({
  schema: z.object({
    street: z.string({ error: 'Street is required' }).trim().min(1, {
      error: 'Street is required',
    }),
    city: z.string({ error: 'City is required' }).trim().min(1, {
      error: 'City is required',
    }),
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

::: tip
Passing the full path from the root, as in `form.field('address.city')`, returns the same node.
:::

## Reading the Validity of a Part

A part's node also describes everything inside it. Its `state.valid` is `true` once none of the
part's fields has an error, so a list of steps can mark the address as complete:

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
  const address = form.group('address')
  const addressValid = useNodeState(address, node => node.state.valid)

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
    street: z.string({ error: 'Street is required' }).trim().min(1, {
      error: 'Street is required',
    }),
    city: z.string({ error: 'City is required' }).trim().min(1, {
      error: 'City is required',
    }),
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

address.subscribe(() => {
  addressStep.classList.toggle('complete', address.state.valid)
})
```

</div>

The other flags in [`NodeState`](/api/@formtree/core/interfaces/NodeState), such as `dirty`,
describe the whole part in the same way.
