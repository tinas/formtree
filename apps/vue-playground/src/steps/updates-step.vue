<script setup lang="ts">
import type { NotificationChannel } from '../forms/checkout'

import { useField, useFormNode } from '@formtree/vue'

import { checkoutGroup, NOTIFICATION_CHANNEL } from '../forms/checkout'

const emit = defineEmits<{ complete: [] }>()

const NOTIFICATION_CHOICES = [
  { value: NOTIFICATION_CHANNEL.email, label: 'Email' },
  { value: NOTIFICATION_CHANNEL.sms, label: 'SMS' },
  { value: NOTIFICATION_CHANNEL.push, label: 'Push notification' },
]

const notifyBy = useField(useFormNode(checkoutGroup).field('notifyBy'))

const onSubmit = notifyBy.node.handleSubmit(() => emit('complete'))

function toggleChannel(channel: NotificationChannel, isChecked: boolean): void {
  const selected = notifyBy.model ?? []
  notifyBy.model = isChecked ? [...selected, channel] : selected.filter(value => value != channel)
}
</script>

<template>
  <form :id="`${notifyBy.id}:step`" class="step" novalidate @submit.prevent="onSubmit">
    <h2>Updates</h2>
    <fieldset :id="notifyBy.id" tabindex="-1" :aria-describedby="notifyBy.attrs['aria-describedby']">
      <legend>Send order updates by</legend>
      <label v-for="choice in NOTIFICATION_CHOICES" :key="choice.value" class="choice">
        <input
          type="checkbox"
          :checked="notifyBy.model?.includes(choice.value)"
          @change="toggleChannel(choice.value, ($event.target as HTMLInputElement).checked)"
          @blur="notifyBy.node.blur()"
        />
        {{ choice.label }}
      </label>
    </fieldset>
    <p :id="notifyBy.errorId" class="error">{{ notifyBy.errorMessage }}</p>
  </form>
</template>
