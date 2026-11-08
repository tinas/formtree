# Conditional Fields

## Turning a Part On and Off

To ask for some fields only after a certain answer, such as card details for a card payment, put
them in a child and say when it applies with the group's `activeWhen`:

```ts twoslash
// @noStaticSemanticInfo
import { defineGroup } from '@formtree/core'
import { z } from 'zod'
// ---cut---
const cardGroup = defineGroup({
  schema: z.object({
    holder: z.string({ error: 'Cardholder name is required' }),
    number: z.string({ error: 'Card number is required' }),
  }),
})

export const paymentForm = defineGroup({
  schema: z.object({
    method: z.enum(['card', 'invoice'], { error: 'Choose a payment method' }),
  }),
  children: { card: cardGroup },
  activeWhen: {
    card: ({ value }) => value.method == 'card',
  },
})
```

Each function receives the value of the group's own schema and runs again after every change.

::: tip Option Order
Write `activeWhen` after `schema` and `children`, because its functions are typed from them, as
[TypeScript](/guide/typescript) explains.
:::

## Inactive Parts

An inactive part is not validated and is left out of the submitted values, so `card` is optional in
the submit function:

```ts twoslash
// @noStaticSemanticInfo
// @filename: api.ts
export declare function chargeCard(card: { holder: string; number: string }): Promise<void>
// @filename: index.ts
import { createForm, defineGroup } from '@formtree/core'
import { z } from 'zod'
import { chargeCard } from './api'

const paymentForm = defineGroup({
  schema: z.object({
    method: z.enum(['card', 'invoice'], { error: 'Choose a payment method' }),
  }),
  children: {
    card: defineGroup({
      schema: z.object({
        holder: z.string({ error: 'Cardholder name is required' }),
        number: z.string({ error: 'Card number is required' }),
      }),
    }),
  },
  activeWhen: {
    card: ({ value }) => value.method == 'card',
  },
})

const form = createForm(paymentForm)
// ---cut---
const placeOrder = form.handleSubmit(async payment => {
  if (payment.card) {
    await chargeCard(payment.card)
  }
})
```

Its value is kept, so a customer who switches back to card finds the details as they left them.
[Checkout Branches](/examples/checkout-branches) shows this live.

## Showing Active Parts

`state.active` tells the page whether a part applies:

<div class="vue-only">

```vue
<script setup lang="ts">
import { useForm } from '@formtree/vue'
import { paymentForm } from './forms/payment'

const form = useForm(paymentForm)
const card = form.group('card')
</script>

<template>
  <fieldset v-if="card.state.active">
    <legend>Card</legend>
  </fieldset>
</template>
```

</div>

<div class="react-only">

```tsx
import { useForm, useNodeState } from '@formtree/react'
import { paymentForm } from './forms/payment'

export function PaymentForm() {
  const form = useForm(paymentForm)
  const cardActive = useNodeState(form.group('card'), node => node.state.active)

  return cardActive ? (
    <fieldset>
      <legend>Card</legend>
    </fieldset>
  ) : null
}
```

</div>

<div class="javascript-only">

```ts
import { createForm } from '@formtree/core'
import { paymentForm } from './forms/payment'

const form = createForm(paymentForm)
const card = form.group('card')
const cardFieldset = document.querySelector<HTMLFieldSetElement>('#card')!

toggleCardFieldset()
card.subscribe(toggleCardFieldset)

function toggleCardFieldset() {
  cardFieldset.hidden = !card.state.active
}
```

</div>

::: tip Hiding Is Up to the Page
Hiding a part is only the page's choice, because the form never depends on what is rendered.
:::

## Nested Conditions

Conditions nest with their groups, so a part inside an inactive part is inactive too:

```ts twoslash
// @noStaticSemanticInfo
import { defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'
// ---cut---
const stateField = defineField({
  schema: z.string({ error: 'State is required' }),
})

const addressGroup = defineGroup({
  schema: z.object({
    street: z.string({ error: 'Street is required' }),
    country: z.string({ error: 'Country is required' }),
  }),
  children: { state: stateField },
  activeWhen: {
    state: ({ value }) => value.country == 'US',
  },
})

const deliveryGroup = defineGroup({
  schema: z.object({
    method: z.enum(['shipping', 'pickup'], { error: 'Choose a delivery method' }),
  }),
  children: { address: addressGroup },
  activeWhen: {
    address: ({ value }) => value.method == 'shipping',
  },
})
```

::: tip Single Values
`activeWhen` accepts only keys of `children`, so a single value that comes and goes, like the
state, gets a definition of its own.
:::

## Clearing a Part

To clear an inactive part instead of keeping its values, reset it:

```ts twoslash
// @noStaticSemanticInfo
import { createForm, defineGroup } from '@formtree/core'
import { z } from 'zod'

const paymentForm = defineGroup({
  schema: z.object({
    method: z.enum(['card', 'invoice'], { error: 'Choose a payment method' }),
  }),
  children: {
    card: defineGroup({
      schema: z.object({
        holder: z.string({ error: 'Cardholder name is required' }),
        number: z.string({ error: 'Card number is required' }),
      }),
    }),
  },
  activeWhen: {
    card: ({ value }) => value.method == 'card',
  },
})

const form = createForm(paymentForm)
// ---cut---
form.group('card').reset({ value: {} })
```

The card fields then come back empty if the customer picks card again.
