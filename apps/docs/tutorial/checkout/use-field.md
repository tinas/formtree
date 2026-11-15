# Binding Inputs with useField

<script setup>
import CheckoutForm from './steps/use-field/checkout-form.vue'
</script>

<div class="vue-only">

Binding by hand takes four bindings on every input, and each new input repeats all of them.
`useField` reads the same node and reduces them to two.

</div>

## Replacing the Bindings

<div class="vue-only">

Each node is passed to `useField`, and what it returns is bound with `v-model` and `v-bind`:

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

`model` reads the value of the node and writes it with `setValue`, while `attrs` carries the id of
the input and `blur` as its blur handler, so the inputs work as they did before.

</div>

## Connecting the Error to the Input

<div class="vue-only">

`attrs` also carries attributes that the inputs bound by hand did not have, such as those that mark
an input as invalid and point a screen reader to its error. For them to work, the element of each
error needs the `errorId` they point to:

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

A screen reader now announces the error of an input together with the input.

</div>

## Trying the Checkout

<div class="vue-only">

<DemoFrame title="Two inputs bound with useField" class="tutorial-demo">
  <CheckoutForm />
</DemoFrame>

The inputs behave as before. Enter an invalid email, leave the input, and inspect it. Its
`aria-describedby` names the error below it.

::: code-group

<<< ./steps/use-field/checkout-form.vue [checkout-form.vue]

<<< ./steps/use-field/forms/checkout.ts [forms/checkout.ts]

:::

</div>
