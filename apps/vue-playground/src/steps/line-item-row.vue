<script setup lang="ts">
import { injectFormNode, provideFormNode } from '@formtree/vue'
import { computed } from 'vue'

import { PRODUCTS, saveLineItem } from '../api'
import NumberField from '../components/number-field.vue'
import SelectField from '../components/select-field.vue'
import { cartGroup } from '../forms/checkout'

interface LineItemRowProps {
  index: number
}

const props = defineProps<LineItemRowProps>()

const PRODUCT_OPTIONS = PRODUCTS.map(product => {
  return {
    value: product.sku,
    label: product.name,
  }
})

const lineItems = injectFormNode(cartGroup).array('lineItems')
const row = provideFormNode(lineItems.items[props.index])

const isSaved = computed(() => row.state.value.id != undefined)
const status = computed(() => {
  if (row.state.submitting) {
    return 'Saving…'
  }
  if (!isSaved.value) {
    return 'Not saved'
  }
  return row.state.dirty ? 'Unsaved changes' : 'Saved'
})

const save = row.handleSubmit(async lineItem => {
  row.reset({ value: await saveLineItem(lineItem) })
})
</script>

<template>
  <div class="line-item">
    <SelectField name="sku" label="Product" :options="PRODUCT_OPTIONS" />
    <NumberField name="quantity" label="Quantity" />
    <div class="row-actions">
      <button type="button" :aria-disabled="isSaved && !row.state.dirty" @click="save">Save</button>
      <button type="button" class="secondary" @click="lineItems.remove(row.index)">Remove</button>
      <span class="hint">{{ status }}</span>
    </div>
  </div>
</template>
