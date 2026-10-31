# Submitting

Every node submits: the whole form, a step, a card, a row and a single field. A submit validates
the node's subtree, shows its errors if there are any, and otherwise hands its output to your
handler.

## handleSubmit

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

declare function placeOrder(order: unknown): Promise<void>
const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE'] },
})
// ---cut---
const submit = form.handleSubmit(
  async order => {
    await placeOrder(order)
  },
  {
    onInvalid: errors => console.log(errors.length, 'errors'),
    shouldFocusError: true,
  },
)

const outcome = await submit()
//    ^?
```

`handleSubmit` returns a function. Pass it straight to a submit listener: when it receives an
event, it calls `preventDefault()` first. Calling it without an event works too. In Vue
templates, write `@submit.prevent` anyway, so the markup itself says the form never posts.

The second argument holds options for this submit alone, such as `onInvalid`;
[`SubmitOptions`](/api/@formtree/core/interfaces/SubmitOptions) describes them.

## The pipeline

A submit runs the same steps every time, and its outcome says where it stopped:
[Lifecycle](/guide/lifecycle#a-submit) lists them in order, and
[What a submit covers](/guide/lifecycle#what-a-submit-covers) shows which errors count.

## Submitting part of the form

The output a handler receives is the output of the node it was called on.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

declare const checkout: { next(): void }
const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE'] },
})
// ---cut---
const nextFromDelivery = form.group('delivery').handleSubmit(delivery => {
  delivery.address?.city
  checkout.next()
})

const applyPromoCode = form.field('promoCode').handleSubmit(code => {
  //                                                        ^?
})
```

A checkout step moves on only when that step is valid, and a promo code is applied on its own.
Errors elsewhere in the form are not shown and do not block it.

A [lens node](/guide/how-it-works#defined-nodes-and-lens-nodes), one that lives in its parent's
schema, submits its validated input, because a part of a schema cannot be run on its own.

## Errors from the server

A handler can return the errors a server sent back, with paths relative to the submitted node.
They are stored with the source `'server'`, shown at once and cleared when the value at that path
changes.

```ts twoslash
import type { ErrorInput } from '@formtree/core'
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

declare function saveAddress(address: unknown): Promise<{ errors?: Array<{ field: string; message: string }> }>
const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE'] },
})
// ---cut---
const address = form.group('delivery.address')

const saveAddressCard = address.handleSubmit(async value => {
  const response = await saveAddress(value)
  return response.errors?.map((error): ErrorInput => ({ path: error.field, code: error.message }))
})
```

The paths are relative to `address`, so the server response does not have to be translated into
paths of the whole form. A rejected submit resolves to `'rejected'`.

## After a save

`reset({ value })` makes a value the new initial value of a node. After a save, it marks the
saved subtree as clean and leaves the rest of the form as it was.

```ts twoslash
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/checkout'

declare function saveContact(contact: { fullName: string; email: string }): Promise<{ fullName: string; email: string }>
// ---cut---
const form = createForm(contactGroup)

const save = form.handleSubmit(async contact => {
  const saved = await saveContact(contact)
  form.reset({ value: saved })
})
```

Without `value`, `reset()` returns the subtree to its current initial value, array items
included. [`ResetOptions`](/api/@formtree/core/interfaces/ResetOptions) describes what a reset can keep.

## A submit button outside the form

A footer button that is not inside the `<form>` element can still submit it with the HTML `form`
attribute. Give the form element the node's id:

```vue
<form :id="delivery.id" novalidate @submit.prevent="nextFromDelivery">…</form>

<footer>
  <button type="submit" :form="delivery.id">Continue</button>
</footer>
```
