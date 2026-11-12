# Binding with useField

<script setup>
import CheckoutForm from './steps/use-field/checkout-form.vue'
</script>

<div class="vue-only">

Binding by hand takes four bindings on every input, and each input repeats them. `useField` reads
the same node and turns it into two.

</div>

## Replacing the Bindings

<div class="vue-only">

Pass each node to `useField`, and bind what it returns with `v-model` and `v-bind`:

```vue [checkout-form.vue]
<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'
import { useForm } from '@formtree/vue' // [!code --]
import { useField, useForm } from '@formtree/vue' // [!code ++]
import { shallowRef } from 'vue'
import { checkoutForm } from './forms/checkout'

const form = useForm(checkoutForm)
const fullName = form.field('fullName') // [!code --]
const email = form.field('email') // [!code --]
const fullName = useField(form.field('fullName')) // [!code ++]
const email = useField(form.field('email')) // [!code ++]
const order = shallowRef<OutputOf<typeof checkoutForm>>()

const placeOrder = form.handleSubmit(checkout => {
  order.value = checkout
})
</script>

<template>
  <form novalidate @submit.prevent="placeOrder">
    <label :for="fullName.id">Name</label>
    <!-- [!code --:6] -->
    <input
      :id="fullName.id"
      :value="fullName.state.value"
      @input="fullName.setValue(($event.target as HTMLInputElement).value)"
      @blur="fullName.blur"
    />
    <input v-model="fullName.model" v-bind="fullName.attrs" /> <!-- [!code ++] -->
    <p>{{ fullName.errorMessage }}</p>

    <label :for="email.id">Email</label>
    <!-- [!code --:6] -->
    <input
      :id="email.id"
      :value="email.state.value"
      @input="email.setValue(($event.target as HTMLInputElement).value)"
      @blur="email.blur"
    />
    <input v-model="email.model" v-bind="email.attrs" /> <!-- [!code ++] -->
    <p>{{ email.errorMessage }}</p>

    <button type="submit">Place order</button>
  </form>
  <pre v-if="order">{{ order }}</pre>
</template>
```

`model` reads the node's value and writes it with `setValue`, and `attrs` carries the input's id and
`blur` as its blur handler, so the inputs work as they did before.

</div>

## Connecting the Error

<div class="vue-only">

`attrs` also holds attributes the hand-bound inputs lacked, such as the ones that mark an input
invalid and point a screen reader to its error. Give each error's element the `errorId` they point
to:

```vue
<template>
  <form novalidate @submit.prevent="placeOrder">
    <label :for="fullName.id">Name</label>
    <input v-model="fullName.model" v-bind="fullName.attrs" />
    <p>{{ fullName.errorMessage }}</p> <!-- [!code --] -->
    <p :id="fullName.errorId">{{ fullName.errorMessage }}</p> <!-- [!code ++] -->

    <label :for="email.id">Email</label>
    <input v-model="email.model" v-bind="email.attrs" />
    <p>{{ email.errorMessage }}</p> <!-- [!code --] -->
    <p :id="email.errorId">{{ email.errorMessage }}</p> <!-- [!code ++] -->

    <button type="submit">Place order</button>
  </form>
  <pre v-if="order">{{ order }}</pre>
</template>
```

A screen reader now reads an input's error together with the input.

</div>

## Trying the Checkout

<div class="vue-only">

<DemoFrame title="Two inputs bound with useField" class="tutorial-demo">
  <CheckoutForm />
</DemoFrame>

The inputs behave as before. Enter an invalid email, leave the input and inspect it, and its
`aria-describedby` names the error below it.

::: code-group

<<< ./steps/use-field/checkout-form.vue [checkout-form.vue]

<<< ./steps/use-field/forms/checkout.ts [forms/checkout.ts]

:::

</div>
