# Introduction

## What Is FormTree?

FormTree is a headless, framework-agnostic form library for TypeScript. You describe what a form
holds and which rules it follows in a definition, and FormTree tracks the values, validates them,
and hands only valid values to your submit function. Definitions nest, so any part of a form, such
as a step of a wizard or a row of a list, validates and submits on its own. FormTree renders
nothing, so the markup and the styles stay yours.

[Why FormTree](/guide/why-formtree) explains the idea behind it and who it is for.

::: tip Prerequisites
The guide assumes basic familiarity with TypeScript, and FormTree needs TypeScript 5.4 or later.
The examples write schemas with [Zod](https://zod.dev), so install it to follow along. Any
[Standard Schema](https://standardschema.dev) library can take its place.
:::

Install FormTree:

<div class="vue-only">

::: code-group

```sh [pnpm]
pnpm add @formtree/vue
```

```sh [npm]
npm install @formtree/vue
```

```sh [yarn]
yarn add @formtree/vue
```

:::

</div>

<div class="react-only">

::: code-group

```sh [pnpm]
pnpm add @formtree/react
```

```sh [npm]
npm install @formtree/react
```

```sh [yarn]
yarn add @formtree/react
```

:::

</div>

<div class="javascript-only">

::: code-group

```sh [pnpm]
pnpm add @formtree/core
```

```sh [npm]
npm install @formtree/core
```

```sh [yarn]
yarn add @formtree/core
```

:::

</div>

<div class="vue-only">

Here is a complete login form. `defineGroup` describes the values and their rules, and the
component turns it into a form with `useForm` and binds an input to each field with `useField`:

```vue
<script setup lang="ts">
import { defineGroup, useField, useForm } from '@formtree/vue'
import { z } from 'zod'
import { logIn } from './api'

const loginForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
    password: z.string({ error: 'Enter your password' }).min(1, {
      error: 'Enter your password',
    }),
  }),
})

const form = useForm(loginForm)
const email = useField(form.field('email'))
const password = useField(form.field('password'))

const submit = form.handleSubmit(async credentials => {
  await logIn(credentials)
})
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <label :for="email.id">Email</label>
    <input v-model="email.model" v-bind="email.attrs" type="email" />
    <p :id="email.errorId">{{ email.errorMessage }}</p>

    <label :for="password.id">Password</label>
    <input v-model="password.model" v-bind="password.attrs" type="password" />
    <p :id="password.errorId">{{ password.errorMessage }}</p>

    <button type="submit">Log in</button>
  </form>
</template>
```

`v-model` keeps each input and its field in sync, and `v-bind` adds everything else the input needs.

</div>

<div class="react-only">

Here is a complete login form. `defineGroup` describes the values and their rules, and the
component turns it into a form with `useForm` and binds an input to each field with `useField`:

```tsx
import { defineGroup, useField, useForm } from '@formtree/react'
import { z } from 'zod'
import { logIn } from './api'

const loginForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
    password: z.string({ error: 'Enter your password' }).min(1, {
      error: 'Enter your password',
    }),
  }),
})

export function LoginForm() {
  const form = useForm(loginForm)
  const email = useField(form.field('email'))
  const password = useField(form.field('password'))

  const submit = form.handleSubmit(async credentials => {
    await logIn(credentials)
  })

  return (
    <form
      noValidate
      onSubmit={event => {
        event.preventDefault()
        void submit()
      }}
    >
      <label htmlFor={email.id}>Email</label>
      <input
        {...email.attrs}
        type="email"
        value={email.value ?? ''}
        onChange={event => email.setValue(event.target.value)}
      />
      <p id={email.errorId}>{email.errorMessage}</p>

      <label htmlFor={password.id}>Password</label>
      <input
        {...password.attrs}
        type="password"
        value={password.value ?? ''}
        onChange={event => password.setValue(event.target.value)}
      />
      <p id={password.errorId}>{password.errorMessage}</p>

      <button type="submit">Log in</button>
    </form>
  )
}
```

`value` and `setValue` keep each input and its field in sync, and `attrs` adds everything else the
input needs. Until the user types, a value is `undefined`, so the input falls back to an empty
string.

</div>

<div class="javascript-only">

Here is a complete login form. `defineGroup` describes the values and their rules, `createForm`
turns it into a form, and `bindInput` connects each input to its field by the ids of the field:

::: code-group

```ts twoslash [login-form.ts]
// @filename: api.ts
export declare function logIn(credentials: { email: string; password: string }): Promise<void>
// @filename: login-form.ts
// ---cut---
import { createForm, defineGroup } from '@formtree/core'
import { z } from 'zod'
import { logIn } from './api'

const loginForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
    password: z.string({ error: 'Enter your password' }).min(1, {
      error: 'Enter your password',
    }),
  }),
})

const form = createForm(loginForm, { id: 'login' })

bindInput('email')
bindInput('password')

const submit = form.handleSubmit(async credentials => {
  await logIn(credentials)
})

document.querySelector('form')!.addEventListener('submit', event => {
  event.preventDefault()
  void submit()
})

function bindInput(key: 'email' | 'password') {
  const field = form.field(key)
  const input = document.getElementById(field.id) as HTMLInputElement
  const error = document.getElementById(field.errorId)!

  input.addEventListener('input', () => field.setValue(input.value))
  input.addEventListener('blur', () => field.blur())
  field.subscribe(() => {
    error.textContent = field.errorMessage ?? ''
  })
}
```

```html [index.html]
<form novalidate>
  <label for="login:email">Email</label>
  <input id="login:email" type="email" />
  <p id="login:email:error"></p>

  <label for="login:password">Password</label>
  <input id="login:password" type="password" />
  <p id="login:password:error"></p>

  <button type="submit">Log in</button>
</form>
```

:::

`subscribe` runs after every change to a field, so the error on the page stays current.

</div>

The text in each `error` is what the user sees when a value is missing or wrong. It becomes visible
once the user leaves the input, so no error is shown while the user is still typing. `handleSubmit`
validates the whole form first, and your function receives the values only when they are valid,
typed from the schema.

The `novalidate` attribute turns off the validation of the browser, so only your messages are
shown. `handleSubmit` leaves the submit event alone, so the form prevents the page reload itself,
with `.prevent` in Vue and `event.preventDefault()` in React and plain JavaScript.
