# Quick Start

## Installation

::: tip Prerequisites
This guide assumes basic familiarity with TypeScript. Its examples write schemas with
[Zod](https://zod.dev), and any [Standard Schema](https://standardschema.dev) library can take its
place.
:::

Install formtree together with Zod:

<div class="vue-only">

::: code-group

```sh [pnpm]
pnpm add @formtree/vue zod
```

```sh [npm]
npm install @formtree/vue zod
```

```sh [yarn]
yarn add @formtree/vue zod
```

:::

::: tip
`@formtree/vue` includes the core, so everything in this guide is imported from it.
:::

</div>

<div class="react-only">

::: code-group

```sh [pnpm]
pnpm add @formtree/react zod
```

```sh [npm]
npm install @formtree/react zod
```

```sh [yarn]
yarn add @formtree/react zod
```

:::

::: tip
`@formtree/react` includes the core, so everything in this guide is imported from it.
:::

</div>

<div class="javascript-only">

::: code-group

```sh [pnpm]
pnpm add @formtree/core zod
```

```sh [npm]
npm install @formtree/core zod
```

```sh [yarn]
yarn add @formtree/core zod
```

:::

</div>

## Creating Your First Form

Let's build a contact form.

### 1. Describe the Form

A definition says which values the form holds and which rules each value follows. It has no state,
so put it in its own file:

<div class="vue-only">

```ts twoslash [forms/contact.ts]
import { defineGroup } from '@formtree/vue'
import { z } from 'zod'

export const contactForm = defineGroup({
  schema: z.object({
    name: z.string({ error: 'Enter your name' }).trim().min(1, { error: 'Enter your name' }),
    email: z.email({ error: 'Enter a valid email address' }),
    message: z.string({ error: 'Write a message' }).min(10, { error: 'Write at least 10 characters' }),
  }),
})
```

</div>

<div class="react-only">

```ts [forms/contact.ts]
import { defineGroup } from '@formtree/react'
import { z } from 'zod'

export const contactForm = defineGroup({
  schema: z.object({
    name: z.string({ error: 'Enter your name' }).trim().min(1, { error: 'Enter your name' }),
    email: z.email({ error: 'Enter a valid email address' }),
    message: z.string({ error: 'Write a message' }).min(10, { error: 'Write at least 10 characters' }),
  }),
})
```

</div>

<div class="javascript-only">

```ts twoslash [forms/contact.ts]
import { defineGroup } from '@formtree/core'
import { z } from 'zod'

export const contactForm = defineGroup({
  schema: z.object({
    name: z.string({ error: 'Enter your name' }).trim().min(1, { error: 'Enter your name' }),
    email: z.email({ error: 'Enter a valid email address' }),
    message: z.string({ error: 'Write a message' }).min(10, { error: 'Write at least 10 characters' }),
  }),
})
```

</div>

The text in `error` is what the user sees when a value is missing or wrong.

### 2. Create the Form

<div class="vue-only">

In a component, `useForm` turns the definition into a form:

```vue
<script setup lang="ts">
import { useForm } from '@formtree/vue'
import { contactForm } from './forms/contact'

const form = useForm(contactForm)
</script>
```

The form holds the values the user enters and checks them against the definition. It lives as long
as the component does.

</div>

<div class="react-only">

In a component, `useForm` turns the definition into a form:

```tsx
import { useForm } from '@formtree/react'
import { contactForm } from './forms/contact'

export function ContactForm() {
  const form = useForm(contactForm)
}
```

The form holds the values the user enters and checks them against the definition. It lives as long
as the component does.

</div>

<div class="javascript-only">

`createForm` turns the definition into a form:

```ts
import { createForm } from '@formtree/core'
import { contactForm } from './forms/contact'

const form = createForm(contactForm)
```

The form holds the values the user enters and checks them against the definition.

</div>

### 3. Bind an Input

<div class="vue-only">

Every value in the form has a node. Pass the node for the name to `useField`, and bind what it
returns to an input:

```vue{2,6,10-12}
<script setup lang="ts">
import { useField, useForm } from '@formtree/vue'
import { contactForm } from './forms/contact'

const form = useForm(contactForm)
const name = useField(form.field('name'))
</script>

<template>
  <label :for="name.id">Name</label>
  <input v-model="name.model" v-bind="name.attrs" />
  <p :id="name.errorId">{{ name.errorMessage }}</p>
</template>
```

`v-model` keeps the input and the node in sync, and `v-bind` adds everything else the input needs.
The error appears once the user leaves the input, so nobody sees it while still typing.

</div>

<div class="react-only">

Every value in the form has a node. Pass the node for the name to `useField`, and connect what it
returns to an input:

```tsx{1,6,8-14}
import { useField, useForm } from '@formtree/react'
import { contactForm } from './forms/contact'

export function ContactForm() {
  const form = useForm(contactForm)
  const name = useField(form.field('name'))

  return (
    <>
      <label htmlFor={name.id}>Name</label>
      <input {...name.attrs} value={name.value ?? ''} onChange={event => name.setValue(event.target.value)} />
      <p id={name.errorId}>{name.errorMessage}</p>
    </>
  )
}
```

`value` and `setValue` keep the input and the node in sync, and `attrs` adds everything else the
input needs. Until the user types, the value is `undefined`, so the input falls back to an empty
string. The error appears once the user leaves the input, so nobody sees it while still typing.

</div>

<div class="javascript-only">

Every value in the form has a node. Add an input for the name and a place for its error:

```html
<label for="name">Name</label>
<input id="name" />
<p id="name-error"></p>
```

Then pass what the user does to the node for the name, and write its error to the page:

```ts{5,7-8,10-11,13-15}
import { createForm } from '@formtree/core'
import { contactForm } from './forms/contact'

const form = createForm(contactForm)
const name = form.field('name')

const input = document.querySelector<HTMLInputElement>('#name')!
const error = document.querySelector<HTMLParagraphElement>('#name-error')!

input.addEventListener('input', () => name.setValue(input.value))
input.addEventListener('blur', () => name.blur())

form.subscribe(() => {
  error.textContent = name.errorMessage ?? ''
})
```

The node learns what the user types through `setValue` and when they leave the input through
`blur`. `subscribe` runs after every change, so the error on the page stays current. The error
appears once the user leaves the input, so nobody sees it while still typing.

</div>

### 4. Submit the Form

<div class="vue-only">

Bind the email and the message the same way, and pass your submit function to `handleSubmit`:

```vue{3,11-13,17}
<script setup lang="ts">
import { useField, useForm } from '@formtree/vue'
import { sendMessage } from './api'
import { contactForm } from './forms/contact'

const form = useForm(contactForm)
const name = useField(form.field('name'))
const email = useField(form.field('email'))
const message = useField(form.field('message'))

const send = form.handleSubmit(async contact => {
  await sendMessage(contact)
})
</script>

<template>
  <form novalidate @submit.prevent="send">
    <label :for="name.id">Name</label>
    <input v-model="name.model" v-bind="name.attrs" />
    <p :id="name.errorId">{{ name.errorMessage }}</p>

    <label :for="email.id">Email</label>
    <input v-model="email.model" v-bind="email.attrs" />
    <p :id="email.errorId">{{ email.errorMessage }}</p>

    <label :for="message.id">Message</label>
    <textarea v-model="message.model" v-bind="message.attrs" />
    <p :id="message.errorId">{{ message.errorMessage }}</p>

    <button type="submit">Send</button>
  </form>
</template>
```

</div>

<div class="react-only">

Bind the email and the message the same way, and pass your submit function to `handleSubmit`:

```tsx{2,11-13,16}
import { useField, useForm } from '@formtree/react'
import { sendMessage } from './api'
import { contactForm } from './forms/contact'

export function ContactForm() {
  const form = useForm(contactForm)
  const name = useField(form.field('name'))
  const email = useField(form.field('email'))
  const message = useField(form.field('message'))

  const send = form.handleSubmit(async contact => {
    await sendMessage(contact)
  })

  return (
    <form noValidate onSubmit={send}>
      <label htmlFor={name.id}>Name</label>
      <input {...name.attrs} value={name.value ?? ''} onChange={event => name.setValue(event.target.value)} />
      <p id={name.errorId}>{name.errorMessage}</p>

      <label htmlFor={email.id}>Email</label>
      <input {...email.attrs} value={email.value ?? ''} onChange={event => email.setValue(event.target.value)} />
      <p id={email.errorId}>{email.errorMessage}</p>

      <label htmlFor={message.id}>Message</label>
      <textarea
        {...message.attrs}
        value={message.value ?? ''}
        onChange={event => message.setValue(event.target.value)}
      />
      <p id={message.errorId}>{message.errorMessage}</p>

      <button type="submit">Send</button>
    </form>
  )
}
```

</div>

<div class="javascript-only">

Move the binding into a function so every input can use it, and pass your submit function to
`handleSubmit`:

::: code-group

```ts{2,11-16} [contact-form.ts]
import { createForm } from '@formtree/core'
import { sendMessage } from './api'
import { contactForm } from './forms/contact'

const form = createForm(contactForm)

bindInput('name')
bindInput('email')
bindInput('message')

document.querySelector('form')!.addEventListener(
  'submit',
  form.handleSubmit(async contact => {
    await sendMessage(contact)
  }),
)

function bindInput(key: 'name' | 'email' | 'message') {
  const field = form.field(key)
  const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${key}`)!
  const error = document.querySelector<HTMLParagraphElement>(`#${key}-error`)!

  input.addEventListener('input', () => field.setValue(input.value))
  input.addEventListener('blur', () => field.blur())
  form.subscribe(() => {
    error.textContent = field.errorMessage ?? ''
  })
}
```

```html [index.html]
<form novalidate>
  <label for="name">Name</label>
  <input id="name" />
  <p id="name-error"></p>

  <label for="email">Email</label>
  <input id="email" />
  <p id="email-error"></p>

  <label for="message">Message</label>
  <textarea id="message"></textarea>
  <p id="message-error"></p>

  <button type="submit">Send</button>
</form>
```

:::

</div>

`handleSubmit` checks the whole form first. If something is wrong, the errors show. Otherwise your
function receives the validated values.

The `novalidate` attribute on the form turns off the browser's own validation, so only your
messages show.

<div class="vue-only">

::: tip Vue Devtools
Install the formtree plugin in `main.ts` to inspect your forms in Vue Devtools while you develop:

```ts [main.ts]
import { createFormtree } from '@formtree/vue'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).use(createFormtree()).mount('#app')
```

:::

</div>
