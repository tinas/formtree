<script setup lang="ts">
import { defineGroup, provideFormNode, useForm } from '@formtree/vue'

import { lineItemsArray } from '../forms/checkout'
import LineItemRow from './line-item-row.vue'

const cartGroup = defineGroup({
  children: { lineItems: lineItemsArray },
})

const form = useForm(cartGroup, {
  initialValue: {
    lineItems: [
      { id: 101, sku: 'MUG-01', quantity: 2 },
      { id: 102, sku: 'TEE-02', quantity: 1 },
    ],
  },
})

const lineItems = provideFormNode(form.array('lineItems'))
</script>

<template>
  <div class="demo-form">
    <LineItemRow v-for="lineItem in lineItems.items" :key="lineItem.key" :index="lineItem.index" />
    <div class="demo-row">
      <button type="button" @click="lineItems.push({ quantity: 1 })">Add item</button>
      <span class="demo-hint">{{
        lineItems.state.dirty ? 'The cart has unsaved changes' : 'Everything is saved'
      }}</span>
    </div>
  </div>
</template>
