<script setup lang="ts">
import { useField } from '@formtree/vue'
import { computed } from 'vue'

import FieldFrame from './field-frame.vue'

interface NumberFieldProps {
  name: string
  label: string
}

const props = defineProps<NumberFieldProps>()

const field = useField<number>(() => props.name)

const text = computed({
  get: () => (field.model == undefined ? '' : String(field.model)),
  set: value => {
    field.model = value == '' ? undefined : Number(value)
  },
})
</script>

<template>
  <FieldFrame :label="label" :label-for="field.id" :error-id="field.errorId" :error="field.state.errors[0]?.code">
    <input v-model="text" v-bind="field.attrs" type="number" />
  </FieldFrame>
</template>
