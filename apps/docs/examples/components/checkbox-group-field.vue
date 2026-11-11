<script setup lang="ts">
import { useField } from '@formtree/vue'
import { computed } from 'vue'

interface CheckboxOption {
  readonly value: string
  readonly label: string
}

const props = defineProps<{
  name: string
  label: string
  options: ReadonlyArray<CheckboxOption>
}>()

const field = useField<Array<string>>(() => props.name)

const selected = computed({
  get: () => field.model ?? [],
  set: values => {
    field.model = props.options.map(option => option.value).filter(value => values.includes(value))
  },
})
</script>

<template>
  <fieldset v-bind="field.attrs" class="demo-choices" tabindex="-1">
    <legend>{{ label }}<span v-if="field.state.required" aria-hidden="true">*</span></legend>
    <label v-for="option in options" :key="option.value" class="demo-choice">
      <input v-model="selected" type="checkbox" :value="option.value" @blur="field.attrs.onBlur" />
      {{ option.label }}
    </label>
    <p :id="field.errorId" class="demo-error">{{ field.errorMessage }}</p>
  </fieldset>
</template>
