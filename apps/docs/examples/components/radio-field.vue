<script setup lang="ts">
import { useField } from '@formtree/vue'

interface RadioOption {
  readonly value: string | undefined
  readonly label: string
}

const props = defineProps<{
  name: string
  label: string
  options: ReadonlyArray<RadioOption>
}>()

const field = useField<string>(() => props.name)
</script>

<template>
  <fieldset v-bind="field.attrs" class="demo-choices" role="radiogroup" tabindex="-1">
    <legend>
      {{ label }}
      <span v-if="field.state.required" aria-hidden="true">*</span>
    </legend>
    <label v-for="option in options" :key="option.label" class="demo-choice">
      <input
        v-model="field.model"
        type="radio"
        :name="field.attrs.name"
        :value="option.value"
        @blur="field.attrs.onBlur"
      />
      {{ option.label }}
    </label>
    <p :id="field.errorId" class="demo-error">{{ field.errorMessage }}</p>
  </fieldset>
</template>
