<script setup lang="ts">
import { useField } from '@formtree/vue'
import { computed } from 'vue'

const props = defineProps<{ name: string; label: string }>()

const field = useField<number>(() => props.name)

const text = computed({
  get: () => (field.model === undefined ? '' : String(field.model)),
  set: value => {
    field.model = value === '' ? undefined : Number(value)
  },
})
</script>

<template>
  <div class="demo-field">
    <label :for="field.id">{{ label }}</label>
    <input v-model="text" v-bind="field.attrs" type="number" />
    <p :id="field.errorId" class="demo-error">{{ field.state.errors[0]?.code }}</p>
  </div>
</template>
