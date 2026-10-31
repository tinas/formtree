<script setup lang="ts">
interface DemoFrameProps {
  title?: string
}

defineProps<DemoFrameProps>()
</script>

<template>
  <div class="demo">
    <div class="demo-bar">
      <span class="demo-bar-label">Live example</span>
      <span v-if="title" class="demo-bar-title">{{ title }}</span>
    </div>
    <div class="demo-preview">
      <slot />
    </div>
  </div>
</template>
