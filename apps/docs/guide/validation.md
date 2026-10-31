# Validation

Validation in formtree answers two separate questions: is this value valid, and should the user
see that it is not. The first is answered on every change. The second is answered by the display
mode.

## Four producers

Every error has one producer, and a producer only touches its own errors.

| Producer     | Where it is written                       | Source                 |
| ------------ | ----------------------------------------- | ---------------------- |
| Schema       | `schema` of a field or group              | `'schema'`             |
| Rule         | `validate` of a group or an array         | `'validate'`           |
| Asynchronous | `validateAsync` of a field or group       | `'async'`              |
| External     | `setErrors`, or a submit handler's return | `'server'` or your own |

An error a server returned is not wiped out the next time the schema runs, and a schema error is
not hidden by an asynchronous result. Each error shows its `source`, so the UI can tell them
apart.

## What happens on a change

1. The value is written, and the node is marked dirty if it differs from its initial value.
2. The scopes that contain the node are validated again: their schemas and `validate` rules.
   Results are cached by value and dependencies, so a subtree that did not change is not
   validated again.
3. Asynchronous checks that run on change are scheduled, with their debounce.
4. External errors whose `clearOn` is `'change'` are cleared for the changed node.
5. Subscribers are notified once.

Validation always runs. Nothing about it depends on what the user can see.

## Display modes

The display mode decides when an error becomes visible in `state.errors`. It never decides
whether a value is valid: `state.valid` is accurate from the first render.

| `mode`              | An error becomes visible                  |
| ------------------- | ----------------------------------------- |
| `onTouched` default | after the field is blurred once           |
| `onBlur`            | on blur                                   |
| `onChange`          | on the first change                       |
| `onSubmit`          | when a node that contains it is submitted |
| `all`               | at once                                   |

Once an error has been visible, `reValidateMode` takes over. With the default `onChange`, a new
error on that field also shows as the user types. With `onBlur` or `onSubmit`, a new error waits
for that trigger. A fixed error disappears at once in every mode.

```ts twoslash
import { createForm, defineField } from '@formtree/core'
import { z } from 'zod'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE'] },
  mode: 'onSubmit',
  reValidateMode: 'onBlur',
})

const quantityField = defineField({
  schema: z.number().int().positive(),
  mode: 'onChange',
})
```

Both options can be given to `createForm` and to any definition, and the nearest definition
wins. A quantity stepper can show its error as it changes while the rest of the form waits for a
blur.

Submitting reveals the errors of the submitted subtree only. Submitting the delivery step does
not reveal errors in the payment step.

## Reading errors without showing them

`validate()` settles every check in a subtree, including pending asynchronous ones, and returns
the result without making anything visible.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE'] },
})
// ---cut---
const result = await form.group('payment').validate()

if (result.valid) {
  result.value.method // 'card' | 'invoice'
} else {
  result.errors
}
```

`listErrors({ includeHidden: true })` lists every error of a node, visible or not, which is
useful in tests and for a summary that counts what is left to fix.

## Asynchronous checks

`validateAsync` runs after the schema passes, with the output and an `AbortSignal`. It is
debounced, cached per value, cancelled by the next change and awaited by a submit.
[Fields](/guide/fields#asynchronous-checks) describes its options, and
[Promo Code](/examples/promo-code) shows it live.
