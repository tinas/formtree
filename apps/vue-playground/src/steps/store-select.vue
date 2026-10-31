<script setup lang="ts">
import { useField } from '@formtree/vue'
import { computed } from 'vue'

import { STORES } from '../api'
import FieldFrame from '../components/field-frame.vue'

interface StoreChoice {
  storeId?: string
  name?: string
}

const store = useField<StoreChoice>('store')

const selectedStoreId = computed({
  get: () => store.model?.storeId ?? '',
  set: storeId => {
    store.model = STORES.find(option => option.storeId == storeId)
  },
})
</script>

<template>
  <FieldFrame label="Pickup store" :label-for="store.id" :error-id="store.errorId" :error="store.state.errors[0]?.code">
    <select v-model="selectedStoreId" v-bind="store.attrs">
      <option value="">Select a store…</option>
      <option v-for="option in STORES" :key="option.storeId" :value="option.storeId">{{ option.name }}</option>
    </select>
  </FieldFrame>
</template>
