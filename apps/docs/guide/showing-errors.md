# Showing Errors

## When Errors Appear

By default, an error shows once the user has left its input. Use the `mode` option to pick another
moment, such as the first submit:

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

The form still validates on every change, so `state.valid` is right before any error shows.
[`VALIDATION_MODE`](/api/@formtree/core/variables/VALIDATION_MODE) lists the modes.

::: tip After a Submit
`reValidateMode` decides when errors update after a submit.
:::

## Translating Errors

Write translation keys as the schema's messages, and turn each error into text with `formatError`:

<div class="vue-only">

```ts twoslash
// @noStaticSemanticInfo
// @filename: i18n.ts
export declare function t(key: string, params?: Readonly<Record<string, unknown>>): string
// @filename: contact-form.ts
import { useForm } from '@formtree/vue'
import { contactForm } from './forms/contact-form'
// ---cut---
import { t } from './i18n'

const form = useForm(contactForm, {
  formatError: error => t(error.code, error.params),
})
```

</div>

<div class="react-only">

```ts
import { t } from './i18n'

const form = useForm(contactForm, {
  formatError: error => t(error.code, error.params),
})
```

</div>

<div class="javascript-only">

```ts twoslash
// @noStaticSemanticInfo
// @filename: i18n.ts
export declare function t(key: string, params?: Readonly<Record<string, unknown>>): string
// @filename: contact-form.ts
import { createForm } from '@formtree/core'
import { contactForm } from './forms/contact-form'
// ---cut---
import { t } from './i18n'

const form = createForm(contactForm, {
  formatError: error => t(error.code, error.params),
})
```

</div>

Every `errorMessage` now passes through your function, which reads the key from `code` and values
such as `minimum` from `params`.

::: tip Every Form at Once
[App Defaults](/guide/app-defaults) sets `formatError` once for every form.
:::

## Connecting Errors to Inputs

A screen reader reads an error with its input when the error element has the field's `errorId` and
the input has the field's attributes:

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
<input {...email.attrs} value={email.value ?? ''} onChange={event => email.setValue(event.target.value)} />
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
  const input = document.getElementById(field.id) as HTMLInputElement | HTMLTextAreaElement
  const error = document.getElementById(field.errorId)!

  input.addEventListener('input', () => field.setValue(input.value))
  input.addEventListener('blur', () => field.blur())
  form.subscribe(() => {
    error.textContent = field.errorMessage ?? ''
    for (const [attribute, value] of Object.entries(field.getAttributes())) {
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

The form's `id` is the prefix of every id, so the HTML can use them.

</div>

::: tip ARIA Attributes
While an error shows, the input gets `aria-invalid="true"` and an `aria-describedby` that points at
the error element.
:::

## Listing All Errors

For an error summary, `listErrors({ deep: true })` returns the shown errors of a node and everything
below it, each with the id of the input it belongs to:

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
const errors = form.listErrors({ deep: true })

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

`form.formatError` gives each error the text its input shows. The `summaryId` and `tabindex="-1"`
let a failed submit focus the list, as [Submitting](/guide/submitting) shows.

## Setting Errors Yourself

To show an error the definition cannot know about, such as a store that has just closed, call
`setErrors` on a node, with paths relative to that node:

```ts twoslash
// @noStaticSemanticInfo
import { createForm } from '@formtree/core'
import { checkoutForm } from './forms/checkout'

const form = createForm(checkoutForm, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
})
// ---cut---
const delivery = form.group('delivery')

delivery.setErrors([{ path: 'store', code: 'This store has closed for today' }])
```

The error shows at once, whatever the mode, and goes away when the store changes.
[`SetErrorsOptions`](/api/@formtree/core/interfaces/SetErrorsOptions) covers keeping it longer.

::: tip One Owner per Error
Schema runs replace only schema errors, so they never remove an error you set.
:::
