<script setup lang="ts">
import { useField } from '@formtree/vue'

import FieldFrame from './field-frame.vue'

interface TextFieldProps {
  name: string
  label: string
}

const props = defineProps<TextFieldProps>()

const field = useField<string>(() => props.name)
</script>

<template>
  <FieldFrame :label="label" :label-for="field.id" :error-id="field.errorId" :error="field.state.errors[0]?.code">
    <input v-model="field.model" v-bind="field.attrs" autocomplete="off" />
  </FieldFrame>
</template>
