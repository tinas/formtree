<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'

import { provideFormNode, useForm } from '@formtree/vue'
import { shallowRef } from 'vue'

import RadioField from '../components/radio-field.vue'
import { DRINK, drinkOrderForm, MILK } from '../forms/drink-order'

const DRINK_OPTIONS = [
  { value: DRINK.tea, label: 'Tea' },
  { value: DRINK.coffee, label: 'Coffee' },
]

const MILK_OPTIONS = [
  { value: undefined, label: 'None' },
  { value: MILK.oat, label: 'Oat' },
  { value: MILK.whole, label: 'Whole' },
]

const form = provideFormNode(useForm(drinkOrderForm))

const output = shallowRef<OutputOf<typeof drinkOrderForm>>()

const placeOrder = form.handleSubmit(order => {
  output.value = order
})
</script>

<template>
  <div class="demo-columns">
    <form class="demo-form" novalidate @submit.prevent="placeOrder">
      <RadioField name="drink" label="Drink" :options="DRINK_OPTIONS" />
      <RadioField name="milk" label="Milk" :options="MILK_OPTIONS" />
      <div class="demo-row">
        <button type="submit">Order</button>
      </div>
    </form>

    <div class="demo-form">
      <p class="demo-hint">Output</p>
      <pre class="demo-output">
        {{ output ? JSON.stringify(output, null, 2) : 'Submit to see the output' }}
      </pre>
    </div>
  </div>
</template>
