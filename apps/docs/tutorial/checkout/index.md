# Binding an Input by Hand

<script setup>
import CheckoutForm from './steps/binding-by-hand/checkout-form.vue'
</script>

<div class="vue-only">

This tutorial builds a checkout one chapter at a time, starting from inputs bound by hand. By its
end, each input of the checkout is one line in the template, a component that finds its field by
name, and you will know every binding that component makes for you, from the value to the
attributes a screen reader needs.

::: tip Prerequisites
The tutorial assumes basic familiarity with Vue and TypeScript. To follow along, install
`@formtree/vue`, and `zod` for the schemas.
:::

</div>

## Describing the Checkout

<div class="vue-only">

A form starts from a definition, which says what the form holds and which rules its values follow.
Define the checkout with `defineGroup` and a schema:

```ts twoslash [forms/checkout.ts]
// @noStaticSemanticInfo
import { defineGroup } from '@formtree/vue'
import { z } from 'zod'

export const checkoutForm = defineGroup({
  schema: z.object({
    fullName: z.string({ error: 'Enter your name' }).trim().min(1, {
      error: 'Enter your name',
    }),
    email: z.email({ error: 'Enter a valid email address' }),
  }),
})
```

The schema's messages are the errors the customer sees.

</div>

## Creating the Form

<div class="vue-only">

Create the form from the definition with `useForm`, and wrap the function that places the order in
the form's `handleSubmit`:

```vue [checkout-form.vue]
<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'
import { useForm } from '@formtree/vue'
import { shallowRef } from 'vue'
import { checkoutForm } from './forms/checkout'

const form = useForm(checkoutForm)
const order = shallowRef<OutputOf<typeof checkoutForm>>()

const placeOrder = form.handleSubmit(checkout => {
  order.value = checkout
})
</script>

<template>
  <form novalidate @submit.prevent="placeOrder">
    <button type="submit">Place order</button>
  </form>
  <pre v-if="order">{{ order }}</pre>
</template>
```

The function runs only once every value is valid, and receives the values as the schema outputs
them. The component keeps the order, so the page shows what a submit sends.

</div>

## Showing the Value

<div class="vue-only">

Every value in the form has a node, which holds the value and its errors. Get the node for the name
with `form.field`, show its value in an input, and write what the user types with `setValue`:

```vue{8,18-23} [checkout-form.vue]
<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'
import { useForm } from '@formtree/vue'
import { shallowRef } from 'vue'
import { checkoutForm } from './forms/checkout'

const form = useForm(checkoutForm)
const fullName = form.field('fullName')
const order = shallowRef<OutputOf<typeof checkoutForm>>()

const placeOrder = form.handleSubmit(checkout => {
  order.value = checkout
})
</script>

<template>
  <form novalidate @submit.prevent="placeOrder">
    <label :for="fullName.id">Name</label>
    <input
      :id="fullName.id"
      :value="fullName.state.value"
      @input="fullName.setValue(($event.target as HTMLInputElement).value)"
    />

    <button type="submit">Place order</button>
  </form>
  <pre v-if="order">{{ order }}</pre>
</template>
```

The input shows the node's value, so it also follows changes made in code, such as a reset, and the
node's `id` connects the label to it.

</div>

## Showing the Error

<div class="vue-only">

Tell the node when the user leaves the input with `blur`, and show its `errorMessage` below:

```vue{8,10}
<template>
  <form novalidate @submit.prevent="placeOrder">
    <label :for="fullName.id">Name</label>
    <input
      :id="fullName.id"
      :value="fullName.state.value"
      @input="fullName.setValue(($event.target as HTMLInputElement).value)"
      @blur="fullName.blur"
    />
    <p>{{ fullName.errorMessage }}</p>

    <button type="submit">Place order</button>
  </form>
  <pre v-if="order">{{ order }}</pre>
</template>
```

The form checks the value on every change, but `errorMessage` stays empty until the user has left
the input, so nobody sees an error while still typing.

</div>

## Trying the Checkout

<div class="vue-only">

Bind the email the same way:

<DemoFrame title="Two inputs bound by hand" class="tutorial-demo">
  <CheckoutForm />
</DemoFrame>

Leave the name empty and move on to see its error. Then fill in both inputs and press Place order.

::: code-group

<<< ./steps/binding-by-hand/checkout-form.vue [checkout-form.vue]

<<< ./steps/binding-by-hand/forms/checkout.ts [forms/checkout.ts]

:::

</div>
