<script setup lang="ts">
import { useField } from '@formtree/vue'
import { computed } from 'vue'

const props = defineProps<{ name: string; label: string; placeholder?: string }>()

const field = useField<number>(() => props.name)

const text = computed({
  get: () => (field.model == undefined ? '' : String(field.model)),
  set: value => {
    field.model = value === '' ? undefined : Number(value)
  },
})
</script>

<template>
  <div class="demo-field">
    <label :for="field.id">{{ label }}<span v-if="field.state.required" aria-hidden="true">*</span></label>
    <input v-model="text" v-bind="field.attrs" type="number" :placeholder="placeholder" />
    <p :id="field.errorId" class="demo-error">{{ field.errorMessage }}</p>
  </div>
</template>
