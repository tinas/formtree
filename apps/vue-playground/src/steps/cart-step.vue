<script setup lang="ts">
import { injectFormNode, provideFormNode } from '@formtree/vue'

import TextField from '../components/text-field.vue'
import { checkoutGroup } from '../forms/checkout'
import LineItemRow from './line-item-row.vue'

const emit = defineEmits<{ complete: [] }>()

const cart = provideFormNode(injectFormNode(checkoutGroup).group('cart'))
const items = cart.array('items')

const onSubmit = cart.handleSubmit(() => emit('complete'))
</script>

<template>
  <form :id="cart.id" class="step" novalidate @submit.prevent="onSubmit">
    <h2>Cart</h2>
    <div class="line-items">
      <p class="hint">Each row saves on its own. Saved rows stay clean until they change.</p>
      <LineItemRow v-for="item in items.items" :key="item.key" :index="item.index" />
      <p class="error">{{ items.state.errors[0]?.code }}</p>
      <button type="button" class="secondary" @click="items.push({ quantity: 1 })">Add product</button>
    </div>
    <TextField name="promoCode" label="Promo code" />
    <p class="hint">
      {{ cart.field('promoCode').state.validating ? 'Checking code…' : 'Try welcome10 or freeship.' }}
    </p>
  </form>
</template>
