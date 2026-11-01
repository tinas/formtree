<script setup lang="ts">
import type { ChoiceOption } from './choice-options'

import { useField } from '@formtree/vue'
import { computed } from 'vue'

import FieldFrame from './field-frame.vue'

interface SelectFieldProps {
  name: string
  label: string
  options: ReadonlyArray<ChoiceOption>
}

const props = defineProps<SelectFieldProps>()

const field = useField<string>(() => props.name)

const selected = computed({
  get: () => field.model ?? '',
  set: value => {
    field.model = value == '' ? undefined : value
  },
})
</script>

<template>
  <FieldFrame :label="label" :label-for="field.id" :error-id="field.errorId" :error="field.errorMessage">
    <select v-model="selected" v-bind="field.attrs">
      <option value="">Select…</option>
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
  </FieldFrame>
</template>
