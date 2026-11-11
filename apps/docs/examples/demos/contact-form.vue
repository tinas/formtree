<script setup lang="ts">
import type { ContactMessage } from '../forms/api'

import { useField, useForm } from '@formtree/vue'
import { computed, shallowRef } from 'vue'

import { sendMessage } from '../forms/api'
import { contactForm } from '../forms/contact-form'

const form = useForm(contactForm)
const name = useField(form.field('name'))
const email = useField(form.field('email'))
const message = useField(form.field('message'))

const sent = shallowRef<ContactMessage>()
const sentText = computed(() => {
  if (sent.value == undefined) {
    return 'Send to see the message'
  }
  return JSON.stringify(sent.value, null, 2)
})

const send = form.handleSubmit(async contact => {
  sent.value = await sendMessage(contact)
})
</script>

<template>
  <div class="demo-columns">
    <form class="demo-form" novalidate @submit.prevent="send">
      <div class="demo-field">
        <label :for="name.id">Name</label>
        <input v-model="name.model" v-bind="name.attrs" autocomplete="off" />
        <p :id="name.errorId" class="demo-error">{{ name.errorMessage }}</p>
      </div>
      <div class="demo-field">
        <label :for="email.id">Email</label>
        <input
          v-model="email.model"
          v-bind="email.attrs"
          autocomplete="off"
        />
        <p :id="email.errorId" class="demo-error">{{ email.errorMessage }}</p>
      </div>
      <div class="demo-field">
        <label :for="message.id">Message</label>
        <textarea v-model="message.model" v-bind="message.attrs" rows="4" />
        <p :id="message.errorId" class="demo-error">
          {{ message.errorMessage }}
        </p>
      </div>
      <div class="demo-row">
        <button type="submit">Send</button>
        <span v-if="form.state.submitting" class="demo-hint">Sending…</span>
      </div>
    </form>

    <div class="demo-form">
      <p class="demo-hint">The message the server received</p>
      <pre class="demo-output">{{ sentText }}</pre>
    </div>
  </div>
</template>
