<script setup lang="ts">
import { useField } from '@formtree/vue'

const props = defineProps<{ name: string; label: string; type?: string }>()

const field = useField<string>(() => props.name)
</script>

<template>
  <label :for="field.id">{{ label }}</label>
  <input v-model="field.model" v-bind="field.attrs" :type="type" />
  <p :id="field.errorId">{{ field.errorMessage }}</p>
</template>
