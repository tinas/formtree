<script setup lang="ts">
import { useField } from '@formtree/vue'

interface SelectOption {
  readonly value: string
  readonly label: string
}

const props = defineProps<{ name: string; label: string; options: ReadonlyArray<SelectOption> }>()

const field = useField<string>(() => props.name)
</script>

<template>
  <div class="demo-field">
    <label :for="field.id">{{ label }}<span v-if="field.state.required" aria-hidden="true">*</span></label>
    <select v-model="field.model" v-bind="field.attrs">
      <option :value="undefined" disabled>Choose…</option>
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <p :id="field.errorId" class="demo-error">{{ field.errorMessage }}</p>
  </div>
</template>
