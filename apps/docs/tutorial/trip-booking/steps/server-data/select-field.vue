<script setup lang="ts">
import { useField } from '@formtree/vue'

interface SelectOption {
  readonly value: string
  readonly label: string
}

const props = defineProps<{
  name: string
  label: string
  options: ReadonlyArray<SelectOption>
}>()

const field = useField<string>(() => props.name)
</script>

<template>
  <label :for="field.id">{{ label }}</label>
  <select v-model="field.model" v-bind="field.attrs">
    <option :value="undefined" disabled>Choose…</option>
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
  <p :id="field.errorId">{{ field.errorMessage }}</p>
</template>
