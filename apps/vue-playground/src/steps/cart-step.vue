<script setup lang="ts">
import { provideFormNode, useFormNode } from '@formtree/vue'

import TextField from '../components/text-field.vue'
import { checkoutGroup } from '../forms/checkout'
import LineItemRow from './line-item-row.vue'

const emit = defineEmits<{ complete: [] }>()

const cart = provideFormNode(useFormNode(checkoutGroup).group('cart'))
const lineItems = cart.array('lineItems')

const onSubmit = cart.handleSubmit(() => emit('complete'))
</script>

<template>
  <form :id="cart.id" class="step" novalidate @submit.prevent="onSubmit">
    <h2>Cart</h2>
    <div class="line-items">
      <p class="hint">Each row saves on its own. Saved rows stay clean until they change.</p>
      <LineItemRow v-for="lineItem in lineItems.items" :key="lineItem.key" :index="lineItem.index" />
      <p class="error">{{ lineItems.errorMessage }}</p>
      <button type="button" class="secondary" @click="lineItems.push({ quantity: 1 })">Add product</button>
    </div>
    <TextField name="promoCode" label="Promo code" />
    <p class="hint">
      {{ cart.field('promoCode').state.requesting ? 'Checking code…' : 'Try welcome10 or freeship.' }}
    </p>
  </form>
</template>
