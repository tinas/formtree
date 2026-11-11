<script setup lang="ts">
import { defineGroup, provideFormNode, useForm } from '@formtree/vue'
import { computed } from 'vue'

import { lineItemsArray } from '../forms/line-items'
import LineItemRow from './line-item-row.vue'

const cartForm = defineGroup({
  children: { lineItems: lineItemsArray },
})

const form = useForm(cartForm, {
  initialValue: {
    lineItems: [
      { id: 101, sku: 'MUG-01', quantity: 2 },
      { id: 102, sku: 'TEE-02', quantity: 1 },
    ],
  },
})

const lineItems = provideFormNode(form.array('lineItems'))

const cartStatus = computed(() => {
  if (lineItems.state.dirty) {
    return 'The cart has unsaved changes'
  }
  return 'Everything is saved'
})

function addItem() {
  lineItems.push({ quantity: 1 })
}
</script>

<template>
  <div class="demo-form">
    <LineItemRow
      v-for="lineItem in lineItems.items"
      :key="lineItem.key"
      :index="lineItem.index"
    />
    <div class="demo-row">
      <button type="button" @click="addItem">Add item</button>
      <span class="demo-hint">{{ cartStatus }}</span>
    </div>
  </div>
</template>
