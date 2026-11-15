# Binding an Input by Hand

<script setup>
import CheckoutForm from './steps/binding-by-hand/checkout-form.vue'
</script>

<div class="vue-only">

This tutorial builds a checkout one chapter at a time, starting from inputs bound by hand. By the
end, each input of the checkout is a single line in the template, a component that finds its field
by name. Because every binding is first written by hand, each one that the component later takes
over is already familiar, from the value to the attributes a screen reader needs.

::: tip Prerequisites
The tutorial assumes basic familiarity with Vue and TypeScript. To follow along, install
`@formtree/vue`, and `zod` for the schemas.
:::

</div>

## Describing the Checkout

<div class="vue-only">

Every form starts from a definition, which describes the values the form holds and the rules they
follow. The checkout is defined with `defineGroup` and a schema:

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

The messages in the schema are the errors that the customer sees.

</div>

## Creating the Form

<div class="vue-only">

The component creates the form from the definition with `useForm`, and wraps the function that
places the order in the `handleSubmit` of the form:

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
them. The component keeps the placed order, so the page can show what a submit sends.

</div>

## Showing the Value

<div class="vue-only">

Each value in the form has its own node, which holds the value and its errors. `form.field` finds
the node of the name, and the input shows the value of that node and passes what the user types to
`setValue`:

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

Because the input reads its value from the node, it also follows changes made in code, such as a
reset. The `id` of the node connects the label to the input.

</div>

## Showing the Error

<div class="vue-only">

The node also needs to know when the user leaves the input. Calling `blur` tells it, and the
`errorMessage` of the node is shown below the input:

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

The form validates the value on every change, but `errorMessage` stays empty until the user has
left the input, so no error is shown while the user is still typing.

</div>

## Trying the Checkout

<div class="vue-only">

The email is bound in the same way:

<DemoFrame title="Two inputs bound by hand" class="tutorial-demo">
  <CheckoutForm />
</DemoFrame>

Leave the name empty and move to the next input to see its error. Then fill in both inputs and
press Place order.

::: code-group

<<< ./steps/binding-by-hand/checkout-form.vue [checkout-form.vue]

<<< ./steps/binding-by-hand/forms/checkout.ts [forms/checkout.ts]

:::

</div>
