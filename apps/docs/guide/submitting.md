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
A later submit of the whole form runs the step's schemas and rules again only for values that have
changed, and asks its server checks again.
:::

## Errors from the Server

Write the server's errors with `setErrors` on the submitted node, with paths relative to it:

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
  if (response.errors) {
    form.setErrors(response.errors.map(error => ({ path: error.field, code: error.message })))
  }
})
```

The call resolves to `'rejected'`, and each error shows on its field and blocks every submit that
covers it until the user changes that value.

## Validating on the Server

To check a request on the server with the rules of the form, create a form from the same definition
with the request's data and call `validate`:

```ts twoslash
// @noStaticSemanticInfo
// @filename: store.ts
import type { OutputOf } from '@formtree/core'
import type { checkoutForm } from './forms/checkout'

export declare function listShippingCountries(): Promise<Array<string>>
export declare function placeOrder(order: OutputOf<typeof checkoutForm>): Promise<void>
// @filename: index.ts
// ---cut---
import { createForm } from '@formtree/core'
import { checkoutForm } from './forms/checkout'
import { listShippingCountries, placeOrder } from './store'

export async function handleCheckout(request: Request, cartId: string) {
  const form = createForm(checkoutForm, {
    initialValue: await request.json(),
    deps: { cartId, countries: await listShippingCountries() },
  })
  const result = await form.validate()
  if (result.valid) {
    await placeOrder(result.value)
    return new Response(null, { status: 201 })
  }
  if (result.errors.length > 0) {
    return Response.json({ errors: result.errors }, { status: 422 })
  }
  return new Response(null, { status: 503 })
}
```

`validate` resolves to the output, or to the errors with paths from the root, which the submit
function of the whole form passes to `setErrors` as they are. It runs every `validateAsync` check at once, without
waiting for a blur or a debounce, so `run` calls on the server whatever it calls in the browser, and
the form needs its `deps` there too. A part that is turned off stays out of the output. A check whose
`run` throws leaves no error, only an entry in `failedChecks`, so that request fails as unavailable.

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

`focusElement` decides how an element is focused, for example with smooth scrolling. A field hidden on
the page, such as one in a closed dialog, is skipped. To focus it instead, open the dialog in
`onInvalid`, which runs before focus moves. Focus waits for the promise it returns, so the dialog can
render first.

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
