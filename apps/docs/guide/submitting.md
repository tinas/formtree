# Submitting

A form is rarely submitted only as a whole. In a checkout wizard, Continue submits the step the
customer is on, a cart row saves on its own, and only Place order submits the whole form. Each of
them calls `handleSubmit` on its own node. A submit validates that node's subtree, shows its
errors if there are any, and otherwise hands the node's output to the handler.

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

`handleSubmit` returns a function. Pass it straight to a submit listener, and it calls
`preventDefault()` on the event first. Calling it without an event works too. In Vue templates,
write `@submit.prevent` anyway, so the markup itself says the form never posts.

The second argument holds options for this submit alone, such as `onInvalid`, and
[`SubmitOptions`](/api/@formtree/core/interfaces/SubmitOptions) describes them. A submit runs the
same steps every time, and its outcome says where it stopped.
[Lifecycle](/guide/lifecycle#a-submit) lists the steps, and
[What a submit covers](/guide/lifecycle#what-a-submit-covers) shows which errors count.

## Submitting part of the form

A handler receives the output of the node it was called on.

```ts twoslash
import type { OutputOf } from '@formtree/core'
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'
import { deliveryGroup } from './forms/delivery'

declare const checkout: { next(): void }
declare function saveDelivery(delivery: OutputOf<typeof deliveryGroup>): Promise<void>
const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE'] },
})
// ---cut---
const continueFromDelivery = form.group('delivery').handleSubmit(async delivery => {
  await saveDelivery(delivery)
  checkout.next()
})

const applyPromoCode = form.field('promoCode').handleSubmit(code => {
  //                                                        ^?
})
```

The delivery step moves on only when the step is valid, and the promo code is applied on its own.
Errors elsewhere in the form are not shown and do not block either of them.

A [lens node](/guide/how-it-works#defined-nodes-and-lens-nodes), one that lives in its parent's
schema, submits its validated input, because part of a schema cannot run on its own.

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

`reset({ value })` makes a value the new initial value of a node. After a save, it marks the saved
subtree as clean and leaves the rest of the form as it was.

```ts twoslash
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/contact'

declare function saveContact(contact: { fullName: string; email: string }): Promise<{ fullName: string; email: string }>
// ---cut---
const form = createForm(contactGroup)

const save = form.handleSubmit(async contact => {
  const saved = await saveContact(contact)
  form.reset({ value: saved })
})
```

Without `value`, `reset()` returns the subtree to its current initial value, array items included.
[`ResetOptions`](/api/@formtree/core/interfaces/ResetOptions) describes what a reset can keep.

## A submit button outside the form

A footer button outside the `<form>` element can still submit it with the HTML `form` attribute,
once the form element has the node's id.

```vue
<form :id="delivery.id" novalidate @submit.prevent="continueFromDelivery">…</form>

<footer>
  <button type="submit" :form="delivery.id">Continue</button>
</footer>
```
