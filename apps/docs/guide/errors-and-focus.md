# Errors and Focus

## The error object

```ts twoslash
import type { FormError } from '@formtree/core'

declare const error: FormError
// ---cut---
error.path // 'delivery.address.city'
error.code // 'City is required'
error.params // the rest of the schema issue, such as Zod's own code
error.source // 'schema' | 'validate' | 'async' | 'server' | your own
```

An error carries a `code`, not a sentence the library wrote. For a schema error, the code is the
message the schema reports, so it can be a readable message or a translation key. The UI decides
how to show it.

## Setting and clearing errors yourself

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE'] },
})
// ---cut---
const delivery = form.group('delivery')

delivery.setErrors([{ path: 'address.street', code: 'This street could not be found' }])
delivery.setErrors([{ code: 'Delivery is not available today' }], { clearOn: 'submit' })
delivery.clearErrors({ source: 'server' })
```

| Option of `setErrors` | Default    | Description                                                  |
| --------------------- | ---------- | ------------------------------------------------------------ |
| `source`              | `'server'` | Who produced the errors. `clearErrors` can clear one source. |
| `clearOn`             | `'change'` | `'change'`, `'submit'` or `'never'`.                         |

Paths are relative to the node you call it on. Errors set this way are visible at once, whatever
the display mode, because something outside the form wants the user to see them.
`clearErrors` removes external errors only. A schema error goes away when the value is fixed.

## Ids and ARIA

A field gives its input everything it needs to be described by its error:

```ts twoslash
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/checkout'

const form = createForm(contactGroup, { id: 'checkout' })
// ---cut---
const email = form.field('email')

email.getAttributes()
// { id: 'checkout:email', name: 'email', 'aria-invalid': 'false', 'aria-describedby': null }

email.errorId // 'checkout:email:error'
email.descriptionId // 'checkout:email:description'
```

Give the error message element `errorId`. While an error is visible, `aria-describedby` points at
it and `aria-invalid` is `'true'`. A `null` attribute is one to remove. The Vue adapter maps it to
`undefined` for you.

## Error summary

A summary at the top of a step lists what is left to fix and links to each field. `listErrors`
with `deep: true` returns the visible errors of a subtree, each with the DOM id of the element it
belongs to.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE'] },
})
// ---cut---
const delivery = form.group('delivery')

const links = delivery.listErrors({ deep: true }).map(error => ({
  href: `#${error.targetId}`,
  text: error.code,
}))
```

Give the summary element the node's `summaryId` and `tabindex="-1"`, and submit with
`shouldFocusError: 'summary'` to move focus to it instead of to the first field.

## Focus after a failed submit

With `shouldFocusError: true`, the default, a failed submit moves focus to the first invalid
element of the subtree. First means first in the document, not first in the schema, which is the
order a user reads in a form with conditional sections. `'summary'` focuses the summary, and
`false` leaves focus alone.

How the element is focused is a separate option. `focusElement` receives the element and focuses
it. The default calls `element.focus()`.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'
// ---cut---
const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE'] },
  focusElement: element => {
    element.focus({ preventScroll: true })
    element.scrollIntoView({
      block: 'center',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  },
})
```

The same function is used for the summary and for `node.focus()`, so smooth scrolling is defined
once. A single submit can pass its own `focusElement`, for example to focus the real input inside
a custom component whose id sits on a wrapper:

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE'] },
})
// ---cut---
const submit = form.group('payment').handleSubmit(() => {}, {
  focusElement: element => (element.querySelector('input') ?? element).focus(),
})
```

Two cases need no API. A sticky header that covers the focused field is handled in CSS with
`scroll-margin-top` on the inputs. A field that is not rendered, such as one on another step,
has no element to focus, so nothing is focused; moving to that step is a job for `onInvalid`.

Without a `document`, in Node or in tests, focusing does nothing. It is the only place where the
core touches the DOM.
