<script setup lang="ts">
import { defineGroup, provideFormNode, useForm } from '@formtree/vue'

import { lineItemsArray } from '../forms/checkout'
import LineItemRow from './line-item-row.vue'

const cartGroup = defineGroup({
  children: { items: lineItemsArray },
})

const form = useForm(cartGroup, {
  initialValue: {
    items: [
      { id: 101, sku: 'MUG-01', quantity: 2 },
      { id: 102, sku: 'TEE-02', quantity: 1 },
    ],
  },
})

const items = provideFormNode(form.array('items'))
</script>

<template>
  <div class="demo-form">
    <LineItemRow v-for="item in items.items" :key="item.key" :index="item.index" />
    <div class="demo-row">
      <button type="button" @click="items.push({ quantity: 1 })">Add item</button>
      <span class="demo-hint">{{ items.state.dirty ? 'The cart has unsaved changes' : 'Everything is saved' }}</span>
    </div>
  </div>
</template>
