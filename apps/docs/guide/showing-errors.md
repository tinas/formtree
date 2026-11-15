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

The schema's messages can be translation keys, which `formatError` then turns into text:

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

Every `errorMessage` now passes through this function, which reads the key from `code` and values
such as `minimum` from `params`. To use the same `formatError` in every form, set it once as an app
default, as [App Defaults](/guide/app-defaults) describes.

## Connecting Errors to Inputs

A screen reader announces an error together with its input when the error element carries the
field's `errorId` and the input carries the field's attributes:

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

Every id begins with the form's `id`, so the HTML can refer to them directly.

</div>

While an error is shown, the input receives `aria-invalid="true"` and an `aria-describedby` that
points to the error element.

## Listing All Errors

An error summary presents every visible error in one place. `listErrors({ deep: true })` returns
the visible errors of a node and of everything below it, each with the id of the input it belongs
to:

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

`form.formatError` gives each error the same text that its input shows. The errors follow the order
of the definition, so in a form laid out as it is defined, the first link leads to the field that a
failed submit focuses. The `summaryId` and `tabindex="-1"` allow a failed submit to focus the list,
as [Submitting](/guide/submitting) shows.

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
[`SetErrorsOptions`](/api/@formtree/core/interfaces/SetErrorsOptions) covers keeping an error
longer. Schema runs replace only schema errors, so they never remove an error set this way.

Every error, including one set from code, stops a submit. A warning that should not block, such as a
likely typo in an email address, is therefore text derived from the value, computed from the field's
`state.value` and shown next to the input.
