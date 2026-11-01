# Introduction

formtree is a headless form library for TypeScript. Every part of a form, from a wizard step to a
single field, validates and submits on its own, and every rule is written once, in a definition.

## A first form

A sign-up form with a name and an email. The definition says what the form holds and which rules
apply.

```ts twoslash
import { defineGroup } from '@formtree/core'
import { z } from 'zod'

export const signUpGroup = defineGroup({
  schema: z.object({
    name: z.string({ error: 'Enter your name' }).trim().min(1, { error: 'Enter your name' }),
    email: z.email({ error: 'Enter a valid email address' }),
  }),
})
```

A component creates the form, binds the inputs and submits.

::: code-group

```vue [Vue]
<script setup lang="ts">
import { useField, useForm } from '@formtree/vue'
import { createAccount } from './api'
import { signUpGroup } from './forms/sign-up'

const form = useForm(signUpGroup)
const name = useField(form.field('name'))
const email = useField(form.field('email'))

const signUp = form.handleSubmit(account => createAccount(account))
</script>

<template>
  <form novalidate @submit.prevent="signUp">
    <label :for="name.id">Name</label>
    <input v-model="name.model" v-bind="name.attrs" />
    <p :id="name.errorId">{{ name.errorMessage }}</p>

    <label :for="email.id">Email</label>
    <input v-model="email.model" v-bind="email.attrs" />
    <p :id="email.errorId">{{ email.errorMessage }}</p>

    <button type="submit">Sign up</button>
  </form>
</template>
```

```tsx [React]
import { useField, useForm } from '@formtree/react'
import { createAccount } from './api'
import { signUpGroup } from './forms/sign-up'

export function SignUpForm() {
  const form = useForm(signUpGroup)
  const name = useField(form.field('name'))
  const email = useField(form.field('email'))

  const signUp = form.handleSubmit(account => createAccount(account))

  return (
    <form noValidate onSubmit={signUp}>
      <label htmlFor={name.id}>Name</label>
      <input {...name.attrs} value={name.value ?? ''} onChange={event => name.setValue(event.target.value)} />
      <p id={name.errorId}>{name.errorMessage}</p>

      <label htmlFor={email.id}>Email</label>
      <input {...email.attrs} value={email.value ?? ''} onChange={event => email.setValue(event.target.value)} />
      <p id={email.errorId}>{email.errorMessage}</p>

      <button type="submit">Sign up</button>
    </form>
  )
}
```

:::

An error appears once its field is left, and a submit with errors shows all of them and focuses
the first. `createAccount` receives `{ name: string, email: string }` with the name already
trimmed.

<script setup>
import SignUp from '../examples/demos/sign-up.vue'
</script>

<DemoFrame title="A first form">
  <SignUp />
</DemoFrame>

## What is different

### Submit any part

Most form libraries validate and submit at the root, so saving one step of a checkout means
checking its fields one by one. In formtree a step submits the same way the whole form does.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

declare function goToPayment(): void
const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
})
// ---cut---
const delivery = form.group('delivery')
const continueToPayment = delivery.handleSubmit(() => goToPayment())
```

Continue checks the delivery step and nothing else, and its handler receives the output of that
step. [Submitting](/guide/submitting#submitting-part-of-the-form) shows the rest.

### Write a rule once

A definition holds no state, so any number of forms can share it. Any definition can also be the
root of a form, a single field included.

```ts twoslash
import { createForm } from '@formtree/core'
import { priceField } from './forms/product'
// ---cut---
const priceForm = createForm(priceField, { initialValue: 24.9 })
```

A price edited on its own runs the same rule as the product page.
[Inline Edit](/examples/inline-edit) shows it live.

### Branches that come and go

Card details are required only when the customer pays by card.

```ts twoslash
import { defineGroup } from '@formtree/core'
import { z } from 'zod'
import { cardGroup, invoiceGroup } from './forms/payment'
// ---cut---
export const paymentGroup = defineGroup({
  schema: z.object({ method: z.enum(['card', 'invoice']) }),
  children: { card: cardGroup, invoice: invoiceGroup },
  activeWhen: {
    card: ({ value }) => value.method === 'card',
    invoice: ({ value }) => value.method === 'invoice',
  },
})
```

A branch that is off is not validated, stays out of the output and keeps its values for when the
customer comes back. No watcher resets anything.
[Conditional Branches](/guide/conditional-branches) explains the rules.

### Server checks in the definition

Whether a promo code is still valid is a question for a server, and the check belongs in the
definition, next to the schema.

```ts twoslash
import { defineFieldWithDeps } from '@formtree/core'
import { z } from 'zod'
import { checkPromoCode } from './forms/api'
// ---cut---
export const promoCodeField = defineFieldWithDeps<{ cartId: string }>()({
  schema: z.string().trim().toUpperCase(),
  validateAsync: {
    on: 'blur',
    run: async (code, { signal, deps }) => {
      const valid = await checkPromoCode({ code, cartId: deps.cartId }, signal)
      return valid ? undefined : { code: 'This code is not valid' }
    },
  },
})
```

The check waits for a pause, is cancelled by the next change, remembers each answer and runs on
the trimmed, upper-cased value. A submit waits for it.
[Asynchronous checks](/guide/fields#asynchronous-checks) covers the details.

### Types that scale

A node takes its type from its own definition. A path is checked one segment at a time, never
against a union of every path in the form, so large and recursive forms stay typed and fast to
check. A component that renders an address knows the address definition and nothing about the
form around it. [Types](/guide/types) shows how.

### Nothing depends on what is on screen

Mounting and unmounting change nothing. Leaving a wizard step keeps its values, and a field in a
dialog finds its node by path or by definition, never by being next to the nearest form.
[How It Works](/guide/how-it-works) describes the model, and ten
[design rules](/guide/design-rules) keep it predictable.
