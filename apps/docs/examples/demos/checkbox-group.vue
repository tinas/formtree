<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'

import { provideFormNode, useForm } from '@formtree/vue'
import { shallowRef } from 'vue'

import CheckboxGroupField from '../components/checkbox-group-field.vue'
import { CHANNEL, notificationsForm } from '../forms/notifications'

const CHANNEL_OPTIONS = [
  { value: CHANNEL.email, label: 'Email' },
  { value: CHANNEL.sms, label: 'SMS' },
  { value: CHANNEL.push, label: 'Push notification' },
]

const form = provideFormNode(
  useForm(notificationsForm, {
    initialValue: { channels: [CHANNEL.email] },
  }),
)

const output = shallowRef<OutputOf<typeof notificationsForm>>()

const saveSettings = form.handleSubmit(settings => {
  output.value = settings
})
</script>

<template>
  <div class="demo-columns">
    <form class="demo-form" novalidate @submit.prevent="saveSettings">
      <CheckboxGroupField name="channels" label="Notify me by" :options="CHANNEL_OPTIONS" />
      <div class="demo-row">
        <button type="submit">Save</button>
      </div>
    </form>

    <div class="demo-form">
      <p class="demo-hint">Output</p>
      <pre class="demo-output">{{ output ? JSON.stringify(output, null, 2) : 'Submit to see the output' }}</pre>
    </div>
  </div>
</template>
