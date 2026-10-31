<script setup lang="ts">
interface FieldFrameProps {
  label: string
  labelFor: string
  errorId: string
  error?: string
}

defineProps<FieldFrameProps>()
</script>

<template>
  <div class="field">
    <label :for="labelFor">{{ label }}</label>
    <slot />
    <p :id="errorId" class="error">{{ error }}</p>
  </div>
</template>
