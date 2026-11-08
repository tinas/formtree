# @formtree/react

[![npm](https://img.shields.io/npm/v/@formtree/react)](https://www.npmjs.com/package/@formtree/react)
[![CI](https://github.com/tinas/formtree/actions/workflows/ci.yml/badge.svg)](https://github.com/tinas/formtree/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@formtree/react)](https://github.com/tinas/formtree/blob/main/LICENSE)

The React adapter of [formtree](https://form-tree.netlify.app/guide/?framework=react), a headless form library for TypeScript. You describe what a form holds and which rules it follows in a definition, and every part of the form, from a wizard step to a single field, validates and submits on its own. formtree renders nothing, so the markup stays yours.

## Installation

```sh
pnpm add @formtree/react zod
```

The examples use [Zod](https://zod.dev), and any [Standard Schema](https://standardschema.dev) library works in its place. The package includes `@formtree/core`, so it is the only formtree package a React app installs.

## A Contact Form

A definition holds the schema and has no state, so it lives in a module of its own:

```ts
import { defineGroup } from '@formtree/react'
import { z } from 'zod'

export const contactForm = defineGroup({
  schema: z.object({
    name: z.string({ error: 'Enter your name' }).trim().min(1, { error: 'Enter your name' }),
    email: z.email({ error: 'Enter a valid email address' }),
  }),
})
```

A component creates the form, binds each field to an input, and passes your submit function to `handleSubmit`:

```tsx
import { useField, useForm } from '@formtree/react'
import { sendMessage } from './api'
import { contactForm } from './forms/contact'

export function ContactForm() {
  const form = useForm(contactForm)
  const name = useField(form.field('name'))
  const email = useField(form.field('email'))
  const send = form.handleSubmit(sendMessage)

  return (
    <form
      noValidate
      onSubmit={event => {
        event.preventDefault()
        void send()
      }}
    >
      <label htmlFor={name.id}>Name</label>
      <input {...name.attrs} value={name.value ?? ''} onChange={event => name.setValue(event.target.value)} />
      <p id={name.errorId}>{name.errorMessage}</p>

      <label htmlFor={email.id}>Email</label>
      <input {...email.attrs} value={email.value ?? ''} onChange={event => email.setValue(event.target.value)} />
      <p id={email.errorId}>{email.errorMessage}</p>

      <button type="submit">Send</button>
    </form>
  )
}
```

`sendMessage` receives the parsed values, with the name trimmed. The input's attributes link it to its error for screen readers, and a failed submit moves focus to the first field with an error.

## Going Further

- [Quick Start](https://form-tree.netlify.app/guide/quick-start?framework=react) builds this form step by step.
- [Submitting](https://form-tree.netlify.app/guide/submitting?framework=react) saves one step or one card of a larger form on its own.
- [Conditional Fields](https://form-tree.netlify.app/guide/conditional-fields?framework=react) turns on a part of the form only after a certain answer.
- [Async Validation](https://form-tree.netlify.app/guide/async-validation?framework=react) checks a value with the server next to its schema.
- [Splitting into Components](https://form-tree.netlify.app/guide/components?framework=react) gives each part of a form a component of its own.

## Requirements

React 18.3 or later and TypeScript 5.4 or later. The package is published as ES modules.

## License

MIT
