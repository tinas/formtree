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
Valibot or ArkType. The examples here use Zod. For Vue or React, install `@formtree/vue` or
`@formtree/react` instead, which re-export everything from the core.

## Define the form

A definition describes part of the form with its schema, its rules and its children. It holds no
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
child with a definition of its own, so any other form that asks for a contact email can use it.

## Create a form

```ts twoslash
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/contact'

const form = createForm(contactGroup)

form.state.value // {}
```

The value is a draft. Every key the schema describes starts as `undefined`, and the schema decides
whether an empty value is an error. `initialValue` sets a starting value, which may be partial.

## Read and write

Every position in the tree is a node. A node reads its state and writes its value.

```ts twoslash
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/contact'

const form = createForm(contactGroup)
// ---cut---
const email = form.field('email')

email.setValue('ada@example.com')
email.blur()

const { value, errors, dirty } = email.state
```

`setValue` writes a draft value and `blur` marks the node as touched. `state` is a snapshot of the
node, a [`NodeState`](/api/@formtree/core/interfaces/NodeState), and it keeps its reference until
something about the node changes.

## Submit

```ts twoslash
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/contact'

declare function saveContact(contact: { fullName: string; email: string }): Promise<void>
const form = createForm(contactGroup)
// ---cut---
const submit = form.handleSubmit(async contact => {
  await saveContact(contact)
})

document.querySelector('form')?.addEventListener('submit', submit)
```

`handleSubmit` returns a function that takes an optional event and prevents its default action. It
validates the node, calls the handler with the validated output and resolves to an outcome that
[Lifecycle](/guide/lifecycle#a-submit) explains.

## Render

The core has no opinion about rendering. It notifies subscribers once per change, and a renderer
reads what it needs.

```ts twoslash
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/contact'

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
  message.textContent = email.errorMessage ?? ''
}

form.subscribe(render)
render()
```

`getAttributes()` returns the attributes of the input, with `null` for one to remove. A schema
error carries the schema's message as its `code`. Here that is a readable message, and it can also
be a translation key that the UI [translates](/guide/errors-and-focus#translating-errors).

With [Vue](/vue/) or [React](/react/), the adapter does this wiring.
