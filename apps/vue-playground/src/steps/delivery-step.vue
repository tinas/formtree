<script setup lang="ts">
import { provideFormNode, useFormNode } from '@formtree/vue'

import { COUNTRIES } from '../api'
import SelectField from '../components/select-field.vue'
import TextField from '../components/text-field.vue'
import { checkoutGroup, DELIVERY_METHOD } from '../forms/checkout'
import StoreSelect from './store-select.vue'

const emit = defineEmits<{ complete: [] }>()

const DELIVERY_OPTIONS = [
  { value: DELIVERY_METHOD.shipping, label: 'Ship to an address' },
  { value: DELIVERY_METHOD.pickup, label: 'Pick up in store' },
]

const COUNTRY_OPTIONS = COUNTRIES.map(country => {
  return {
    value: country.code,
    label: country.name,
  }
})

const delivery = provideFormNode(useFormNode(checkoutGroup).group('delivery'))

const onSubmit = delivery.handleSubmit(() => emit('complete'))
</script>

<template>
  <form :id="delivery.id" class="step" novalidate @submit.prevent="onSubmit">
    <h2>Delivery</h2>
    <SelectField name="method" label="Method" :options="DELIVERY_OPTIONS" />
    <fieldset v-if="delivery.group('address').state.active">
      <legend>Shipping address</legend>
      <TextField name="address.street" label="Street" />
      <TextField name="address.city" label="City" />
      <SelectField name="address.country" label="Country" :options="COUNTRY_OPTIONS" />
      <TextField v-if="delivery.field('address.state').state.active" name="address.state" label="State" />
    </fieldset>
    <StoreSelect v-if="delivery.field('store').state.active" />
  </form>
</template>
