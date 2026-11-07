<script setup>
import SubmitTree from '../.vitepress/components/submit-tree.vue'
</script>

# Submitting

## Handling a Submit

`handleSubmit` wraps your function in a submit function that validates the form, waits for its
server checks, and calls your function only with valid values:

```ts twoslash
import type { OutputOf } from '@formtree/core'
import { createForm } from '@formtree/core'
import { contactForm } from './forms/contact-form'

declare function sendMessage(contact: OutputOf<typeof contactForm>): Promise<void>
const form = createForm(contactForm)
// ---cut---
const send = form.handleSubmit(async contact => {
  await sendMessage(contact)
})

const outcome = await send()
//    ^?
```

A call resolves to `'invalid'` when errors remain, which then show, and to `'skipped'` while a submit
is already running, so a double click sends once.

## Submitting One Part

Every node has its own `handleSubmit`, so a wizard's Continue button can submit only its step:

```ts twoslash
// @noStaticSemanticInfo
import type { OutputOf } from '@formtree/core'
import { createForm } from '@formtree/core'
import { checkoutForm } from './forms/checkout'
import { deliveryGroup } from './forms/delivery'

declare function saveDelivery(delivery: OutputOf<typeof deliveryGroup>): Promise<void>
declare function showStep(step: 'delivery' | 'payment'): void
const form = createForm(checkoutForm, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
})
// ---cut---
const continueToPayment = form.group('delivery').handleSubmit(async delivery => {
  await saveDelivery(delivery)
  showStep('payment')
})
```

<SubmitTree />

The submit covers the node and everything below it, so errors elsewhere neither block it nor show,
and a part that is turned off resolves to `'skipped'`.

::: tip Submitting the Whole Form Later
A later submit of the whole form reuses the step's results for values that have not changed.
:::

## Errors from the Server

Return the server's errors from your function, with paths relative to the submitted node:

```ts twoslash
// @noStaticSemanticInfo
import type { OutputOf } from '@formtree/core'
import { createForm } from '@formtree/core'
import { accountForm } from './forms/account'

interface FieldError {
  readonly field: string
  readonly message: string
}
declare function createAccount(account: OutputOf<typeof accountForm>): Promise<{ errors?: Array<FieldError> }>
const form = createForm(accountForm)
// ---cut---
const signUp = form.handleSubmit(async account => {
  const response = await createAccount(account)
  return response.errors?.map(error => ({ path: error.field, code: error.message }))
})
```

The call resolves to `'rejected'`, and each error shows on its field and blocks every submit that
covers it until the user changes that value.

## Focusing the First Error

A failed submit focuses the first field with an error, or the error summary with
`shouldFocusError: 'summary'`:

```ts twoslash
// @noStaticSemanticInfo
import type { OutputOf } from '@formtree/core'
import { createForm } from '@formtree/core'
import { contactForm } from './forms/contact-form'

declare function sendMessage(contact: OutputOf<typeof contactForm>): Promise<void>
const form = createForm(contactForm)
// ---cut---
const send = form.handleSubmit(
  async contact => {
    await sendMessage(contact)
  },
  { shouldFocusError: 'summary' },
)
```

`focusElement` decides how an element is focused, for example with smooth scrolling.

::: tip Every Form at Once
[App Defaults](/guide/app-defaults) sets both options for every form.
:::

## A Button Outside the Form

A button outside the `<form>` element submits it through the HTML `form` attribute:

<div class="vue-only">

```vue
<template>
  <form id="delivery-step" novalidate @submit.prevent="continueToPayment">…</form>

  <footer>
    <button type="submit" form="delivery-step">Continue</button>
  </footer>
</template>
```

</div>

<div class="react-only">

```tsx
return (
  <>
    <form
      id="delivery-step"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        void continueToPayment()
      }}
    >
      …
    </form>

    <footer>
      <button type="submit" form="delivery-step">
        Continue
      </button>
    </footer>
  </>
)
```

</div>

<div class="javascript-only">

```html
<form id="delivery-step" novalidate>…</form>

<footer>
  <button type="submit" form="delivery-step">Continue</button>
</footer>
```

</div>

## Keeping the Button Enabled

formtree has no flag that disables the submit button while the form is invalid. Pressing an enabled
button shows every error and focuses the first one, while a disabled button does not say what is
wrong. An edit form can disable Save until something changes, as
[Initial Values and Reset](/guide/initial-values) shows.
