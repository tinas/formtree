# Showing Errors

## Choosing When Errors Appear

By default, an error becomes visible once the user has left its input. The `mode` option chooses a
different moment, such as the first submit:

<div class="vue-only">

```ts twoslash
// @noStaticSemanticInfo
import { useForm } from '@formtree/vue'
import { contactForm } from './forms/contact-form'
// ---cut---
const form = useForm(contactForm, { mode: 'onSubmit' })
```

</div>

<div class="react-only">

```ts
const form = useForm(contactForm, { mode: 'onSubmit' })
```

</div>

<div class="javascript-only">

```ts twoslash
// @noStaticSemanticInfo
import { createForm } from '@formtree/core'
import { contactForm } from './forms/contact-form'
// ---cut---
const form = createForm(contactForm, { mode: 'onSubmit' })
```

</div>

The form still validates on every change, so `state.valid` is accurate before any error is shown.
[`VALIDATION_MODE`](/api/@formtree/core/variables/VALIDATION_MODE) lists the modes. Once the form
has been submitted, `reValidateMode` determines when its errors are updated.

## Translating Errors

The messages in the schema can be translation keys, which `formatError` turns into text. Given as an
app default, it translates the errors of every form:

<div class="vue-only">

```ts [main.ts]
import { createFormTreePlugin } from '@formtree/vue'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import { messages } from './messages'

const i18n = createI18n({ legacy: false, locale: 'en', messages })

createApp(App)
  .use(i18n)
  .use(
    createFormTreePlugin({
      formatError: error => i18n.global.t(error.code, { ...error.params }),
    }),
  )
  .mount('#app')
```

</div>

<div class="react-only">

```tsx [app.tsx]
import type { FormError } from '@formtree/react'
import { FormTreeProvider } from '@formtree/react'
import i18next from 'i18next'
import { ContactForm } from './contact-form'

export function App() {
  return (
    <FormTreeProvider formatError={formatError}>
      <ContactForm />
    </FormTreeProvider>
  )
}

function formatError(error: FormError) {
  return i18next.t(error.code, { ...error.params })
}
```

</div>

<div class="javascript-only">

```ts twoslash [form-defaults.ts]
// @noStaticSemanticInfo
// @filename: i18next.d.ts
declare module 'i18next' {
  const i18next: { t: (key: string, options?: Record<string, unknown>) => string }
  export default i18next
}
// @filename: form-defaults.ts
// ---cut---
import type { FormDefaults } from '@formtree/core'
import i18next from 'i18next'

export const formDefaults: FormDefaults = {
  formatError: error => i18next.t(error.code, { ...error.params }),
}
```

Each `createForm` receives `formDefaults`, as [App Setup](/guide/app-setup) shows.

</div>

Every `errorMessage` passes through this function, which reads the key from `code` and values such
as `minimum` from `params`. A single form can also take its own `formatError` among its options.

## Switching Languages

<div class="vue-only">

Errors on screen follow a language switch by themselves, because each field runs `formatError`
again when the locale of vue-i18n changes.

</div>

<div class="react-only">

`<FormTreeProvider>` receives the current language:

```tsx{4,8,11} [app.tsx]
import type { FormError } from '@formtree/react'
import { FormTreeProvider } from '@formtree/react'
import i18next from 'i18next'
import { useTranslation } from 'react-i18next'
import { ContactForm } from './contact-form'

export function App() {
  const { i18n } = useTranslation()

  return (
    <FormTreeProvider formatError={formatError} language={i18n.language}>
      <ContactForm />
    </FormTreeProvider>
  )
}

function formatError(error: FormError) {
  return i18next.t(error.code, { ...error.params })
}
```

When `language` changes, every component that reads a form re-renders, and `formatError` reads the new
language from i18next.

</div>

<div class="javascript-only">

An input bound by hand writes its error again when the language changes:

```ts{2,13} twoslash [bind-input.ts]
// @noStaticSemanticInfo
// @filename: i18next.d.ts
declare module 'i18next' {
  const i18next: { on: (event: 'languageChanged', listener: () => void) => void }
  export default i18next
}
// @filename: bind-input.ts
// ---cut---
import type { FieldAttributes, FieldNode } from '@formtree/core'
import i18next from 'i18next'

type TextInput = HTMLInputElement | HTMLTextAreaElement

export function bindInput(field: FieldNode<string | undefined, unknown>) {
  const input = document.getElementById(field.id) as TextInput
  const error = document.getElementById(field.errorId)!

  input.addEventListener('input', () => field.setValue(input.value))
  input.addEventListener('blur', () => field.blur())
  showField()
  i18next.on('languageChanged', showField)
  return field.subscribe(showField)

  function showField() {
    input.value = field.state.value ?? ''
    error.textContent = field.errorMessage ?? ''
    setAttributes(input, field.attributes)
  }
}
// ---cut-after---

export function setAttributes(element: HTMLElement, attributes: FieldAttributes) {
  for (const [attribute, value] of Object.entries(attributes)) {
    if (value == null) {
      element.removeAttribute(attribute)
    } else {
      element.setAttribute(attribute, value)
    }
  }
}
```

</div>

## Connecting Errors to Inputs

A screen reader announces an error together with its input when the error element carries the
`errorId` of the field and the input carries its attributes:

<div class="vue-only">

```vue
<label :for="email.id">Email</label>
<input v-model="email.model" v-bind="email.attrs" />
<p :id="email.errorId">{{ email.errorMessage }}</p>
```

</div>

<div class="react-only">

```tsx
<label htmlFor={email.id}>Email</label>
<input
  {...email.attrs}
  value={email.value ?? ''}
  onChange={event => email.setValue(event.target.value)}
/>
<p id={email.errorId}>{email.errorMessage}</p>
```

</div>

<div class="javascript-only">

::: code-group

```ts twoslash [contact-form.ts]
// @noStaticSemanticInfo
import { createForm } from '@formtree/core'
import { contactForm } from './forms/contact-form'
// ---cut---
const form = createForm(contactForm, { id: 'contact' })

function bindInput(key: 'name' | 'email' | 'message') {
  const field = form.field(key)
  const input = document.getElementById(field.id) as
    | HTMLInputElement
    | HTMLTextAreaElement
  const error = document.getElementById(field.errorId)!

  input.addEventListener('input', () => field.setValue(input.value))
  input.addEventListener('blur', () => field.blur())
  field.subscribe(() => {
    error.textContent = field.errorMessage ?? ''
    for (const [attribute, value] of Object.entries(field.attributes)) {
      if (value == null) {
        input.removeAttribute(attribute)
      } else {
        input.setAttribute(attribute, value)
      }
    }
  })
}
```

```html [index.html]
<label for="contact:email">Email</label>
<input id="contact:email" />
<p id="contact:email:error"></p>
```

:::

Every id begins with the `id` of the form, so the HTML can refer to them directly.

</div>

While an error is shown, the input receives `aria-invalid="true"` and an `aria-describedby` that
points to the error element.

## Listing All Errors

`listErrors({ deep: true })` returns the visible errors of a node and everything below it, each with
the id of its input, which is all an error summary needs:

<div class="vue-only">

```vue
<script setup lang="ts">
import { useForm } from '@formtree/vue'
import { computed } from 'vue'
import { contactForm } from './forms/contact'

const form = useForm(contactForm)
const errors = computed(() => form.listErrors({ deep: true }))
</script>

<template>
  <ul :id="form.summaryId" tabindex="-1">
    <li v-for="error in errors" :key="`${error.targetId}:${error.code}`">
      <a :href="`#${error.targetId}`">{{ form.formatError(error) }}</a>
    </li>
  </ul>
</template>
```

</div>

<div class="react-only">

```tsx
const errors = useNodeState(form, node => node.listErrors({ deep: true }))

return (
  <ul id={form.summaryId} tabIndex={-1}>
    {errors.map(error => (
      <li key={`${error.targetId}:${error.code}`}>
        <a href={`#${error.targetId}`}>{form.formatError(error)}</a>
      </li>
    ))}
  </ul>
)
```

</div>

<div class="javascript-only">

::: code-group

```ts twoslash [contact-form.ts]
// @noStaticSemanticInfo
import { createForm } from '@formtree/core'
import { contactForm } from './forms/contact-form'

const form = createForm(contactForm, { id: 'contact' })
// ---cut---
import type { ListedError } from '@formtree/core'

const summary = document.getElementById(form.summaryId)!

form.subscribe(() => {
  summary.replaceChildren(...form.listErrors({ deep: true }).map(summaryItem))
})

function summaryItem(error: ListedError): HTMLLIElement {
  const link = document.createElement('a')
  link.href = `#${error.targetId}`
  link.textContent = form.formatError(error)
  const item = document.createElement('li')
  item.append(link)
  return item
}
```

```html [index.html]
<ul id="contact:summary" tabindex="-1"></ul>
```

:::

</div>

`form.formatError` gives each error the same text that its input shows, and the errors follow the
order of the definition. The `summaryId` and `tabindex="-1"` let a failed submit focus the list, as
[Submitting](/guide/submitting#focusing-the-first-error) shows.

## Setting Errors from Code

Some errors depend on information the definition cannot know, such as a store that has just closed.
`setErrors` places such an error on a node, with paths relative to that node:

```ts twoslash
// @noStaticSemanticInfo
import { createForm } from '@formtree/core'
import { checkoutForm } from './forms/checkout'

const form = createForm(checkoutForm, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
})
// ---cut---
const delivery = form.group('delivery')

delivery.setErrors([
  {
    path: 'store',
    code: 'This store has closed for today',
  },
])
```

The error is shown immediately, regardless of the mode, and is removed when the store changes.
Schema runs never remove it, because each producer replaces only its own errors.
[`SetErrorsOptions`](/api/@formtree/core/interfaces/SetErrorsOptions) covers keeping an error
longer.

::: tip Warnings
Every error stops a submit, so a warning that should not block, such as a likely typo in an email
address, is text that the page derives from the `state.value` of the field.
:::
