<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'
import { useField, useForm } from '@formtree/vue'
import { shallowRef } from 'vue'
import { checkoutForm } from './forms/checkout'

const form = useForm(checkoutForm)
const fullName = useField(form.field('fullName'))
const email = useField(form.field('email'))
const order = shallowRef<OutputOf<typeof checkoutForm>>()

const placeOrder = form.handleSubmit(checkout => {
  order.value = checkout
})
</script>

<template>
  <form novalidate @submit.prevent="placeOrder">
    <label :for="fullName.id">Name</label>
    <input v-model="fullName.model" v-bind="fullName.attrs" />
    <p :id="fullName.errorId">{{ fullName.errorMessage }}</p>

    <label :for="email.id">Email</label>
    <input v-model="email.model" v-bind="email.attrs" />
    <p :id="email.errorId">{{ email.errorMessage }}</p>

    <button type="submit">Place order</button>
  </form>
  <pre v-if="order">{{ order }}</pre>
</template>
