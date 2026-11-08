<script setup lang="ts">
import { useField } from '@formtree/vue'

const props = defineProps<{ name: string; label: string }>()

const field = useField<string>(() => props.name)
</script>

<template>
  <div class="demo-field">
    <label :for="field.id">{{ label }}<span v-if="field.state.required" aria-hidden="true">*</span></label>
    <input v-model="field.model" v-bind="field.attrs" autocomplete="off" />
    <p :id="field.errorId" class="demo-error">{{ field.errorMessage }}</p>
  </div>
</template>
