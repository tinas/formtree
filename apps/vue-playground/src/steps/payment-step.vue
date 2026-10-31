<script setup lang="ts">
import { provideFormNode, useField, useFormNode } from '@formtree/vue'

import SelectField from '../components/select-field.vue'
import TextField from '../components/text-field.vue'
import { checkoutGroup, PAYMENT_METHOD } from '../forms/checkout'

const emit = defineEmits<{ complete: [] }>()

const PAYMENT_OPTIONS = [
  { value: PAYMENT_METHOD.card, label: 'Card' },
  { value: PAYMENT_METHOD.invoice, label: 'Invoice' },
]

const checkout = useFormNode(checkoutGroup)
const payment = provideFormNode(checkout.group('payment'))
const acceptTerms = useField(checkout.field('acceptTerms'))

const onSubmit = payment.handleSubmit(() => emit('complete'))

function toggleTerms(isChecked: boolean): void {
  acceptTerms.model = isChecked ? true : undefined
}
</script>

<template>
  <form :id="payment.id" class="step" novalidate @submit.prevent="onSubmit">
    <h2>Payment</h2>
    <SelectField name="method" label="Method" :options="PAYMENT_OPTIONS" />
    <fieldset v-if="payment.group('card').state.active">
      <legend>Card</legend>
      <TextField name="card.holder" label="Cardholder" />
      <TextField name="card.number" label="Card number" />
    </fieldset>
    <fieldset v-if="payment.group('invoice').state.active">
      <legend>Invoice</legend>
      <TextField name="invoice.company" label="Company" />
      <TextField name="invoice.taxId" label="Tax ID" />
    </fieldset>
    <label class="choice">
      <input
        type="checkbox"
        :checked="acceptTerms.model == true"
        v-bind="acceptTerms.attrs"
        @change="toggleTerms(($event.target as HTMLInputElement).checked)"
      />
      I accept the terms of sale
    </label>
    <p :id="acceptTerms.errorId" class="error">{{ acceptTerms.state.errors[0]?.code }}</p>
  </form>
</template>
