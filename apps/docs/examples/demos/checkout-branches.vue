<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'
import type { ShippingDeps } from '../forms/delivery'

import { defineGroupWithDeps, provideFormNode, useForm } from '@formtree/vue'
import { computed, shallowRef } from 'vue'

import NumberField from '../components/number-field.vue'
import SelectField from '../components/select-field.vue'
import TextField from '../components/text-field.vue'
import { SHIPPING_COUNTRIES } from '../forms/api'
import { deliveryGroup } from '../forms/delivery'
import { DEFAULT_DUE_IN_DAYS, paymentGroup } from '../forms/payment'

const orderForm = defineGroupWithDeps<ShippingDeps>()({
  children: { delivery: deliveryGroup, payment: paymentGroup },
  childDeps: { delivery: ({ deps }) => deps },
})

const form = provideFormNode(
  useForm(orderForm, {
    deps: { countries: SHIPPING_COUNTRIES },
  }),
)
const delivery = form.group('delivery')
const payment = form.group('payment')

const output = shallowRef<OutputOf<typeof orderForm>>()
const draft = computed(() => JSON.stringify(form.state.value, null, 2))
const outputText = computed(() => {
  if (output.value == undefined) {
    return 'Submit to see the output'
  }
  return JSON.stringify(output.value, null, 2)
})

const placeOrder = form.handleSubmit(order => {
  output.value = order
})

const DELIVERY_OPTIONS = [
  { value: 'shipping', label: 'Ship to an address' },
  { value: 'pickup', label: 'Pick up in store' },
]
const COUNTRY_OPTIONS = ['DE', 'FR', 'NL', 'TR', 'US'].map(country => ({
  value: country,
  label: country,
}))
const STORE_OPTIONS = [
  { value: 'berlin', label: 'Berlin, Torstraße' },
  { value: 'amsterdam', label: 'Amsterdam, Damrak' },
]
const PAYMENT_OPTIONS = [
  { value: 'card', label: 'Card' },
  { value: 'invoice', label: 'Invoice' },
]
</script>

<template>
  <div class="demo-columns">
    <form class="demo-form" novalidate @submit.prevent="placeOrder">
      <fieldset class="demo-fieldset">
        <legend>Delivery</legend>
        <SelectField
          name="delivery.method"
          label="Method"
          :options="DELIVERY_OPTIONS"
        />
        <template v-if="delivery.group('address').state.active">
          <TextField name="delivery.address.street" label="Street" />
          <TextField name="delivery.address.city" label="City" />
          <SelectField
            name="delivery.address.country"
            label="Country"
            :options="COUNTRY_OPTIONS"
          />
          <TextField
            v-if="delivery.field('address.state').state.active"
            name="delivery.address.state"
            label="State"
          />
        </template>
        <SelectField
          v-if="delivery.field('store').state.active"
          name="delivery.store"
          label="Store"
          :options="STORE_OPTIONS"
        />
      </fieldset>

      <fieldset class="demo-fieldset">
        <legend>Payment</legend>
        <SelectField
          name="payment.method"
          label="Method"
          :options="PAYMENT_OPTIONS"
        />
        <template v-if="payment.group('card').state.active">
          <TextField name="payment.card.holder" label="Cardholder" />
          <TextField name="payment.card.number" label="Card number" />
        </template>
        <template v-if="payment.group('invoice').state.active">
          <TextField name="payment.invoice.company" label="Company" />
          <TextField name="payment.invoice.taxId" label="Tax ID" />
          <NumberField
            name="payment.invoice.dueInDays"
            label="Due in days"
            :placeholder="String(DEFAULT_DUE_IN_DAYS)"
          />
        </template>
      </fieldset>

      <div class="demo-row">
        <button type="submit">Place order</button>
      </div>
    </form>

    <div class="demo-form">
      <p class="demo-hint">Draft, everything the form holds</p>
      <pre class="demo-output">{{ draft }}</pre>
      <p class="demo-hint">Output, what the submit handler received</p>
      <pre class="demo-output">{{ outputText }}</pre>
    </div>
  </div>
</template>
