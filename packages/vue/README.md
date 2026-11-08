# @formtree/vue

[![npm](https://img.shields.io/npm/v/@formtree/vue)](https://www.npmjs.com/package/@formtree/vue)
[![CI](https://github.com/tinas/formtree/actions/workflows/ci.yml/badge.svg)](https://github.com/tinas/formtree/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@formtree/vue)](https://github.com/tinas/formtree/blob/main/LICENSE)

The Vue adapter of [formtree](https://form-tree.netlify.app/guide/), a headless form library for TypeScript. You describe what a form holds and which rules it follows in a definition, and every part of the form, from a wizard step to a single field, validates and submits on its own. formtree renders nothing, so the markup stays yours.

## Installation

```sh
pnpm add @formtree/vue zod
```

The examples use [Zod](https://zod.dev), and any [Standard Schema](https://standardschema.dev) library works in its place. The package includes `@formtree/core`, so it is the only formtree package a Vue app installs.

## A Contact Form

A definition holds the schema and has no state, so it lives in a module of its own:

```ts
import { defineGroup } from '@formtree/vue'
import { z } from 'zod'

export const contactForm = defineGroup({
  schema: z.object({
    name: z.string({ error: 'Enter your name' }).trim().min(1, { error: 'Enter your name' }),
    email: z.email({ error: 'Enter a valid email address' }),
  }),
})
```

A component creates the form, binds each field to an input, and passes your submit function to `handleSubmit`:

```vue
<script setup lang="ts">
import { useField, useForm } from '@formtree/vue'
import { sendMessage } from './api'
import { contactForm } from './forms/contact'

const form = useForm(contactForm)
const name = useField(form.field('name'))
const email = useField(form.field('email'))
const send = form.handleSubmit(sendMessage)
</script>

<template>
  <form novalidate @submit.prevent="send">
    <label :for="name.id">Name</label>
    <input v-model="name.model" v-bind="name.attrs" />
    <p :id="name.errorId">{{ name.errorMessage }}</p>

    <label :for="email.id">Email</label>
    <input v-model="email.model" v-bind="email.attrs" />
    <p :id="email.errorId">{{ email.errorMessage }}</p>

    <button type="submit">Send</button>
  </form>
</template>
```

`sendMessage` receives the parsed values, with the name trimmed. The input's attributes link it to its error for screen readers, and a failed submit moves focus to the first field with an error.

## Going Further

- [Quick Start](https://form-tree.netlify.app/guide/quick-start) builds this form step by step.
- [Submitting](https://form-tree.netlify.app/guide/submitting) saves one step or one card of a larger form on its own.
- [Conditional Fields](https://form-tree.netlify.app/guide/conditional-fields) turns on a part of the form only after a certain answer.
- [Async Validation](https://form-tree.netlify.app/guide/async-validation) checks a value with the server next to its schema.
- [Devtools](https://form-tree.netlify.app/guide/devtools) shows every form as a tree in Vue Devtools.

## Requirements

Vue 3.5 or later and TypeScript 5.4 or later. The package is published as ES modules.

## License

MIT
