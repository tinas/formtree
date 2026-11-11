<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'
import { useForm } from '@formtree/vue'
import { shallowRef } from 'vue'
import { checkoutForm } from './forms/checkout'

const form = useForm(checkoutForm)
const fullName = form.field('fullName')
const email = form.field('email')
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
      @blur="fullName.blur"
    />
    <p>{{ fullName.errorMessage }}</p>

    <label :for="email.id">Email</label>
    <input
      :id="email.id"
      :value="email.state.value"
      @input="email.setValue(($event.target as HTMLInputElement).value)"
      @blur="email.blur"
    />
    <p>{{ email.errorMessage }}</p>

    <button type="submit">Place order</button>
  </form>
  <pre v-if="order">{{ order }}</pre>
</template>
