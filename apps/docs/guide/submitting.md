<script setup>
import SubmitTree from '../.vitepress/components/submit-tree.vue'
</script>

# Submitting

## Handling a Submit

`handleSubmit` turns a function into a submit function that validates the form, waits for its
server checks, and calls the function only with valid values:

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

A call resolves to `'invalid'` when errors remain, which then become visible, and to `'skipped'`
while a submit is already running, so a double click sends the values only once.

## Submitting One Part

Every node has its own `handleSubmit`, so the Continue button of a wizard can submit only its own
step:

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
const submitDelivery = form.group('delivery').handleSubmit(async delivery => {
//                                                               ^?
  await saveDelivery(delivery)
  showStep('payment')
})
```

<SubmitTree />

The submit covers the node and everything below it, so errors elsewhere neither block it nor become
visible, and an inactive part resolves to `'skipped'`.

## Showing Errors from the Server

The server may reject values that passed every check in the browser. Its errors are written with
`setErrors` on the submitted node, with paths relative to that node:

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
    form.setErrors(
      response.errors.map(error => ({
        path: error.field,
        code: error.message,
      })),
    )
  }
})
```

The call resolves to `'rejected'`, and each error is shown on its field and blocks every submit that
covers it until the user changes that value.

## Validating on the Server

The server validates a request with the same definition, by creating a form from the data of the
request and calling `validate`:

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
function of the whole form passes to `setErrors` unchanged.

::: details Checks on the Server
`validate` runs every `validateAsync` check at once, without waiting for a blur or a debounce, so
`run` calls on the server whatever it calls in the browser, and the form needs its `deps` there as
well. An inactive part is left out of the output. A check whose `run` throws leaves no error, only an
entry in `failedChecks`, so that request fails as unavailable.
:::

## Focusing the First Error

After a failed submit, focus moves to the first field on the page that has an error, or to the
error summary with `shouldFocusError: 'summary'`:

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

Focus finds the element of a field by its `id`, so a custom input, such as a group of
[radio buttons](/guide/binding-inputs#binding-radio-buttons), puts that `id` on the element that should
receive focus.

::: details Hidden Fields and Custom Focus
A field hidden on the page, such as one in a closed dialog, is skipped. To focus it instead, the
dialog can be opened in `onInvalid`, which runs before focus moves, and focus waits for the promise
it returns. `focusElement` determines how an element is focused, for example with smooth scrolling.
Every focus option can also be set once for every form in [App Setup](/guide/app-setup).
:::

## Submitting from a Button Outside the Form

A button placed outside the `<form>` element can still submit it through the HTML `form` attribute:

<div class="vue-only">

```vue
<template>
  <form id="delivery" novalidate @submit.prevent="submitDelivery">…</form>

  <footer>
    <button type="submit" form="delivery">Continue</button>
  </footer>
</template>
```

</div>

<div class="react-only">

```tsx
return (
  <>
    <form
      id="delivery"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        void submitDelivery()
      }}
    >
      …
    </form>

    <footer>
      <button type="submit" form="delivery">
        Continue
      </button>
    </footer>
  </>
)
```

</div>

<div class="javascript-only">

```html
<form id="delivery" novalidate>…</form>

<footer>
  <button type="submit" form="delivery">Continue</button>
</footer>
```

</div>

## Keeping the Button Enabled

FormTree provides no flag that disables the submit button while the form is invalid. Pressing an
enabled button shows every error and focuses the first one, whereas a disabled button gives no
indication of what is wrong. An edit form can disable Save until something changes, as
[Initial Values and Reset](/guide/initial-values#detecting-changes) shows.
