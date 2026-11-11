<script setup lang="ts">
import { provideFormNode, useFormNode } from '@formtree/vue'
import { computed } from 'vue'

import NumberField from '../components/number-field.vue'
import SelectField from '../components/select-field.vue'
import { saveLineItem } from '../forms/api'
import { lineItemsArray } from '../forms/line-items'

const props = defineProps<{ index: number }>()

const PRODUCT_OPTIONS = [
  { value: 'MUG-01', label: 'Mug' },
  { value: 'TEE-02', label: 'T-shirt' },
  { value: 'CAP-03', label: 'Cap' },
]

const lineItems = useFormNode(lineItemsArray)
const row = provideFormNode(lineItems.items[props.index]!)

const status = computed(() => {
  if (row.state.submitting) {
    return 'Saving…'
  }
  if (row.state.value.id == undefined) {
    return 'Not saved'
  }
  return row.state.dirty ? 'Unsaved changes' : 'Saved'
})

const save = row.handleSubmit(async item => {
  row.reset({ value: await saveLineItem(item) })
})

function moveUp() {
  lineItems.move(props.index, props.index - 1)
}
</script>

<template>
  <div class="demo-row" style="align-items: flex-start">
    <SelectField name="sku" label="Product" :options="PRODUCT_OPTIONS" />
    <NumberField name="quantity" label="Quantity" />
    <div class="demo-row" style="margin-top: 22px">
      <button type="button" @click="save">Save</button>
      <button type="button" :disabled="index == 0" @click="moveUp">
        Move up
      </button>
      <button type="button" @click="lineItems.remove(index)">Remove</button>
      <span class="demo-hint">{{ status }}</span>
    </div>
  </div>
</template>
