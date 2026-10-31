# Conditional Branches

Many forms change shape with their own data. A checkout asks for a shipping address only when
the order is shipped, and for card details only when the customer pays by card. `activeWhen`
says when a child takes part in the form.

## The problem

Without a way to switch a branch off, every field is part of the schema all the time, and the
required ones turn into conditions:

```ts
const checkoutSchema = z
  .object({
    paymentMethod: z.enum(['card', 'invoice']),
    cardNumber: z.string().optional(),
    company: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.paymentMethod === 'card' && !value.cardNumber) {
      context.addIssue({ code: 'custom', path: ['cardNumber'], message: 'Card number is required' })
    }
    if (value.paymentMethod === 'invoice' && !value.company) {
      context.addIssue({ code: 'custom', path: ['company'], message: 'Company name is required' })
    }
  })
```

The schema no longer says what is required. The payload sends card details along with an
invoice unless someone clears them, so components start watching the method and resetting
fields, and each branch needs its own watcher.

## activeWhen

```ts twoslash
import { defineGroup } from '@formtree/core'
import { z } from 'zod'
import { cardGroup, invoiceGroup } from './forms/checkout'

export const paymentGroup = defineGroup({
  schema: z.object({
    method: z.enum(['card', 'invoice'], { error: 'Choose a payment method' }),
  }),
  children: { card: cardGroup, invoice: invoiceGroup },
  activeWhen: {
    card: ({ value }) => value.method === 'card',
    invoice: ({ value }) => value.method === 'invoice',
  },
})
```

Each key of `activeWhen` names a child, and its function decides from the group's own draft
whether that child is active. The children stay complete definitions with plain, unconditional
schemas. The decision lives in the parent, because the parent holds the value it depends on.

## What an inactive branch does

An inactive branch is not validated, so its errors do not block a submit. It is not part of the
output, so it cannot leak into the payload. Its values are kept: a customer who picks invoice,
types a company name, switches to card and comes back finds the company name still there.

The output type says the same thing. A child with an `activeWhen` is optional in the output:

```ts twoslash
import type { OutputOf } from '@formtree/core'
import { paymentGroup } from './forms/checkout'

type Payment = OutputOf<typeof paymentGroup>
// {
//   method: 'card' | 'invoice'
//   card?: { holder: string, number: string }
//   invoice?: { company: string, taxId: string }
// }
```

`state.active` tells the UI whether to render a branch:

```vue
<fieldset v-if="payment.group('card').state.active">
  <TextField name="card.holder" label="Cardholder" />
  <TextField name="card.number" label="Card number" />
</fieldset>
```

Hiding the fieldset is the UI's decision. The form does not depend on it: an inactive branch is
left out whether it is rendered or not.

## Nested branches

Branches nest, and each one follows its own parent. The delivery step shows an address only for
shipping, and the address asks for a state only for the United States.

```ts twoslash
import { defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'

const stateField = defineField({ schema: z.string({ error: 'State is required' }) })

const addressGroup = defineGroup({
  schema: z.object({
    street: z.string({ error: 'Street is required' }),
    country: z.string({ error: 'Country is required' }),
  }),
  children: { state: stateField },
  activeWhen: { state: ({ value }) => value.country === 'US' },
})

export const deliveryGroup = defineGroup({
  schema: z.object({ method: z.enum(['shipping', 'pickup']) }),
  children: { address: addressGroup },
  activeWhen: { address: ({ value }) => value.method === 'shipping' },
})
```

`state` is active only when its address is active and the country is `US`. Switching delivery
to pickup turns off the whole address, state included.

## What activeWhen can see

An `activeWhen` function receives `{ value, deps }`. `value` is the draft of the group's own
schema, without its children. If a decision depends on a value that lives in a child, move that
value into the parent's schema. This keeps the direction of every decision from parent to child,
and it keeps the types simple: a function never waits for the types of the children it controls.

`deps` holds the group's [dependencies](/guide/dependencies), for branches that depend on
configuration from outside the form, such as a feature that only some accounts have.

## Clearing a branch

Keeping inactive values is the default because it is what users expect when they change their
mind. When a branch should start over, reset it explicitly:

```ts twoslash
import { createForm } from '@formtree/core'
import { paymentGroup } from './forms/checkout'

const form = createForm(paymentGroup)
// ---cut---
form.field('method').setValue('invoice')
form.group('card').reset({ value: {} })
```

[Checkout Branches](/examples/) shows both steps live, with the output next to them.
