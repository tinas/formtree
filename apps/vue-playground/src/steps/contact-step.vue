<script setup lang="ts">
import { injectFormNode, provideFormNode } from '@formtree/vue'

import TextField from '../components/text-field.vue'
import { checkoutGroup } from '../forms/checkout'

const emit = defineEmits<{ complete: [] }>()

const contact = provideFormNode(injectFormNode(checkoutGroup).group('contact'))

const onSubmit = contact.handleSubmit(() => emit('complete'))
</script>

<template>
  <form :id="contact.id" class="step" novalidate @submit.prevent="onSubmit">
    <h2>Contact</h2>
    <TextField name="fullName" label="Full name" />
    <TextField name="email" label="Email" />
  </form>
</template>
