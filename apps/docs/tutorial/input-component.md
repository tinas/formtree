# Writing an Input Component

<script setup>
import CheckoutForm from './steps/input-component/checkout-form.vue'
</script>

<div class="vue-only">

Every input in the checkout repeats a label, the input, and its error. An input component writes
them once, and it then needs a way to find its field.

</div>

## Moving an Input into a Component

<div class="vue-only">

Give the component a `name` prop, and pass the name to `useField`:

```vue [text-field.vue]
<script setup lang="ts">
import { useField } from '@formtree/vue'

const props = defineProps<{ name: string; label: string }>()

const field = useField<string>(() => props.name)
</script>

<template>
  <label :for="field.id">{{ label }}</label>
  <input v-model="field.model" v-bind="field.attrs" />
  <p :id="field.errorId">{{ field.errorMessage }}</p>
</template>
```

With a name, `useField` looks the field up in the form that a component above it provides. The
getter keeps the binding in step with the prop.

::: tip Two Forms on One Page
`useField` looks a name up in the nearest form provided above it, so on a page with two forms, each
input binds to the form that encloses it.
:::

</div>

## Providing the Form

<div class="vue-only">

Pass the form to `provideFormNode` in the component that creates it, and render an input component
for each field:

```vue [checkout-form.vue]
<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'
import { useField, useForm } from '@formtree/vue' // [!code --]
import { provideFormNode, useForm } from '@formtree/vue' // [!code ++]
import { shallowRef } from 'vue'
import { checkoutForm } from './forms/checkout'
import TextField from './text-field.vue' // [!code ++]

const form = useForm(checkoutForm)
const fullName = useField(form.field('fullName')) // [!code --]
const email = useField(form.field('email')) // [!code --]
provideFormNode(form) // [!code ++]
const order = shallowRef<OutputOf<typeof checkoutForm>>()

const placeOrder = form.handleSubmit(checkout => {
  order.value = checkout
})
</script>

<template>
  <form novalidate @submit.prevent="placeOrder">
    <!-- [!code --:7] -->
    <label :for="fullName.id">Name</label>
    <input v-model="fullName.model" v-bind="fullName.attrs" />
    <p :id="fullName.errorId">{{ fullName.errorMessage }}</p>

    <label :for="email.id">Email</label>
    <input v-model="email.model" v-bind="email.attrs" />
    <p :id="email.errorId">{{ email.errorMessage }}</p>
    <TextField name="fullName" label="Name" /> <!-- [!code ++] -->
    <TextField name="email" label="Email" /> <!-- [!code ++] -->

    <button type="submit">Place order</button>
  </form>
  <pre v-if="order">{{ order }}</pre>
</template>
```

Every component below the checkout can now find the form, however deep it sits.

::: info Why the Form Is Provided
Passing each field down as a prop would work too, but every component between the form and the
input would then have to take it and pass it on. Nothing is provided on its own, not even by
`useForm`, so the component that creates a form decides which components see it.
:::

</div>

## Trying the Checkout

<div class="vue-only">

<DemoFrame title="Inputs from one component" class="tutorial-demo">
  <CheckoutForm />
</DemoFrame>

The checkout works as before, and another field now takes one line in the template.

::: code-group

<<< ./steps/input-component/checkout-form.vue [checkout-form.vue]

<<< ./steps/input-component/text-field.vue [text-field.vue]

<<< ./steps/input-component/forms/checkout.ts [forms/checkout.ts]

:::

</div>
