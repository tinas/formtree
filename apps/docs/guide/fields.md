# Fields

A field is a leaf of the tree. It holds one value, which can be a string, a number, an object
picked from a list or an array of tags. It is still a full node that validates, submits and resets
on its own.

## Defining a field

```ts twoslash
import { defineField } from '@formtree/core'
import { z } from 'zod'

export const priceField = defineField({
  schema: z.number({ error: 'Price is required' }).positive({ error: 'Price must be positive' }),
})
```

`schema` is the only required option, and
[`DefineFieldOptions`](/api/@formtree/core/interfaces/DefineFieldOptions) describes the others. A
field that needs values from outside the form is defined with `defineFieldWithDeps`, which
[Dependencies](/guide/dependencies) explains.

## Empty values

A field starts as `undefined`, and writing `undefined` empties it. The library never makes up a
default, and the schema decides whether an empty value is an error. With Zod, the `error` option of
`z.number()` and `z.string()` also covers `undefined`, which is where the "required" message goes.

```ts twoslash
import type { DraftOf, InputOf, OutputOf } from '@formtree/core'
import { priceField } from './forms/product'

type Draft = DraftOf<typeof priceField>
//   ^?

type Input = InputOf<typeof priceField>
//   ^?

type Output = OutputOf<typeof priceField>
//   ^?
```

The form holds `number | undefined`, and the handler receives a `number`. A value that comes from an
API as `null` is turned into `undefined` once, where the API response becomes a draft.

## Starting values and schema defaults

A value the user should see when the form opens belongs in the draft. `initialValue` writes it for
the form, `push({ quantity: 1 })` for a new row and `reset({ value })` after a save. The input
shows it, and `dirty` and `reset` measure from it.

A default in the schema answers another question, what to send when a value is left empty. The
library never fills the draft from a schema, so the input stays empty and the value is valid while
it is. The schema puts the default into the output, which the submit handler and `validateAsync`
receive.

```ts twoslash
import type { OutputOf } from '@formtree/core'
import { createForm } from '@formtree/core'
import { invoiceGroup } from './forms/payment'

declare function sendInvoice(invoice: OutputOf<typeof invoiceGroup>): Promise<void>
// ---cut---
const invoice = createForm(invoiceGroup, { initialValue: { company: 'Acme GmbH', taxId: 'DE123456789' } })

const sendOrder = invoice.handleSubmit(async order => {
  await sendInvoice(order)
})
```

The draft holds the company and the tax ID but no due date, and `sendInvoice` receives
`dueInDays: 30`. The output type has no `undefined` there, because it comes from the schema.

A default replaces `undefined` only. A text input that is typed into and cleared writes `''`, which
the schema keeps, so a text value with a default needs an input that writes `undefined` when it is
empty, as the number input of the examples does. A group's `validate` receives the draft, so it
sees `undefined` where the output will hold the default, as
[Rules across keys](/guide/groups#rules-across-keys) explains.

Choose by what the user should see. A value they start from goes into the draft. An empty value
that stands for a value goes into the schema, and the empty input says what will be sent, for
example with a placeholder. With both, the draft value is sent, and the default applies once the
value is `undefined` again. [Checkout Branches](/examples/) shows a default in a number input,
next to the draft and the output, and [Line Items](/examples/line-items) starts each new row with a
quantity of 1.

## Working with a field

```ts twoslash
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/contact'

const form = createForm(contactGroup)
// ---cut---
const email = form.field('email')

email.setValue('ada@example')
email.blur()

const { errors, valid } = email.state
```

`state.errors` holds the errors that should be visible now, which depends on the
[display mode](/guide/validation#display-modes). `state.valid` counts every error, visible or not.
[`FieldNode`](/api/@formtree/core/interfaces/FieldNode) describes every member of a field node.

## Asynchronous checks

Some rules are questions for a server, such as whether a username is taken or a promo code is still
valid. `validateAsync` asks them.

```ts twoslash
import { defineFieldWithDeps } from '@formtree/core'
import { z } from 'zod'
import { checkPromoCode } from './forms/api'

export const promoCodeField = defineFieldWithDeps<{ cartId: string }>()({
  schema: z.string().trim().toUpperCase().optional(),
  validateAsync: {
    on: 'blur',
    debounceMs: 300,
    run: async (code, { signal, deps }) => {
      if (code === undefined || code === '') {
        return undefined
      }
      const valid = await checkPromoCode({ code, cartId: deps.cartId }, signal)
      return valid ? undefined : { code: 'This code is not valid' }
    },
  },
})
```

`run` returns an error, a list of errors or `undefined`. `on` picks what starts the check and
`debounceMs` how long it waits, and
[`AsyncValidationOptions`](/api/@formtree/core/interfaces/AsyncValidationOptions) gives their values
and defaults.

The check waits until the schema passes and no rule of a parent has put an error on the field, as
[Which check runs first](/guide/validation#which-check-runs-first) shows. It receives the output,
so the server is asked about the value that would be saved, trimmed and upper-cased here.

Results are cached per value, so going back to a code that was already checked does not ask again.
A change aborts the running check through `signal`. While a check runs, `state.validating` is
`true`, and a submit waits for it or runs it if it has not run yet. A check that throws becomes an
error with the code `formtree.async_failed` instead of breaking the form.
[Promo Code](/examples/promo-code) shows a check live.

## A field as a form

Any definition can be the root of a form, a field included. A price edited in place gets its own
form from the definition the product page uses, so both apply the same rule.

```ts twoslash
import { createForm } from '@formtree/core'
import { priceField } from './forms/product'

declare function updatePrice(productId: number, price: number): Promise<number>
declare const product: { id: number; price: number }
// ---cut---
const priceForm = createForm(priceField, { id: `price-${product.id}`, initialValue: product.price })

const savePrice = priceForm.handleSubmit(async price => {
  priceForm.reset({ value: await updatePrice(product.id, price) })
})
```

[Inline Edit](/examples/inline-edit) shows this in a table.
