<script setup lang="ts">
import { useField, useForm } from '@formtree/vue'
import { computed } from 'vue'

import { updatePrice } from '../forms/api'
import { priceField } from '../forms/product'

const props = defineProps<{ price: number }>()

const cell = useForm(priceField, { initialValue: props.price })
const price = useField(cell)

const text = computed({
  get: () => (price.model == undefined ? '' : String(price.model)),
  set: value => {
    price.model = value === '' ? undefined : Number(value)
  },
})

const saveHint = computed(() => {
  if (cell.state.submitting) {
    return 'Saving…'
  }
  return cell.state.dirty ? 'Press Enter to save' : ''
})

const savePrice = cell.handleSubmit(async newPrice => {
  cell.reset({ value: await updatePrice(newPrice) })
})
</script>

<template>
  <form class="demo-row" novalidate @submit.prevent="savePrice">
    <input
      v-model="text"
      v-bind="price.attrs"
      type="number"
      step="0.1"
      style="width: 110px"
    />
    <span class="demo-hint">{{ saveHint }}</span>
    <span :id="price.errorId" class="demo-error">
      {{ price.errorMessage }}
    </span>
  </form>
</template>
