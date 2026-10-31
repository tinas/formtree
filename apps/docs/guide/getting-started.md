# Getting Started

## Installation

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

formtree validates with any [Standard Schema](https://standardschema.dev) library, such as Zod,
Valibot or ArkType. The examples here use Zod. For Vue, install `@formtree/vue` instead; it
re-exports everything from the core.

## Define the form

A definition describes a part of the form: its schema, its rules and its children. It holds no
state, so it lives at module level and can be imported anywhere.

```ts twoslash
import { defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'

export const emailField = defineField({
  schema: z.email({ error: 'Enter a valid email address' }),
})

export const contactGroup = defineGroup({
  schema: z.object({
    fullName: z.string({ error: 'Name is required' }).trim().min(1, { error: 'Name is required' }),
  }),
  children: { email: emailField },
})
```

`contactGroup` has two keys. `fullName` is described by the group's own schema. `email` is a
child with a definition of its own, which it can bring anywhere else a contact email is needed.

## Create a form

```ts twoslash
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/checkout'

const form = createForm(contactGroup)

form.state.value // {}
```

The value is a draft. Every key the schema describes starts as `undefined`, and whether an empty
value is an error is up to the schema. An initial value can be passed as `initialValue`, and it
may be partial.

## Read and write

Every position in the tree is a node. A node reads its state and writes its value.

```ts twoslash
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/checkout'

const form = createForm(contactGroup)
// ---cut---
const email = form.field('email')

email.setValue('ada@example.com')
email.blur()

email.state.value
email.state.errors
email.state.dirty
```

`setValue` writes a draft value and `blur` marks the node as touched. `state` is a snapshot:
`value`, `initialValue`, `errors`, `valid`, `dirty`, `touched`, `validating`, `submitting`,
`submitCount` and `active`. It keeps its reference until something about the node changes.

## Submit

```ts twoslash
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/checkout'

declare function saveContact(contact: { fullName: string; email: string }): Promise<void>
const form = createForm(contactGroup)
// ---cut---
const submit = form.handleSubmit(async contact => {
  await saveContact(contact)
})

document.querySelector('form')?.addEventListener('submit', submit)
```

`handleSubmit` returns a function that takes an optional event, prevents its default action,
validates the node and calls the handler with the validated output. It resolves to
`'success'`, `'invalid'`, `'rejected'` or `'skipped'`. [Submitting](/guide/submitting) covers
each of them.

## Render

The core has no opinion about rendering. It notifies subscribers once per change, and a
renderer reads what it needs.

```ts twoslash
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/checkout'

const form = createForm(contactGroup)
// ---cut---
const email = form.field('email')
const input = document.querySelector<HTMLInputElement>('#email')!
const message = document.querySelector<HTMLParagraphElement>('#email-error')!

input.addEventListener('input', () => email.setValue(input.value))
input.addEventListener('blur', () => email.blur())
message.id = email.errorId

function render() {
  for (const [name, value] of Object.entries(email.getAttributes())) {
    if (value === null) {
      input.removeAttribute(name)
    } else {
      input.setAttribute(name, value)
    }
  }
  message.textContent = email.state.errors[0]?.code ?? ''
}

form.subscribe(render)
render()
```

`getAttributes()` returns the `id`, `name`, `aria-invalid` and `aria-describedby` of the input,
with `null` for an attribute to remove. An error from a schema carries the schema's message as
its `code`, so a schema can hold readable messages, as here, or translation keys for the UI to
translate.

With Vue, the adapter does this wiring for you. Continue with [Vue](/vue/), or read
[How It Works](/guide/how-it-works) first.
