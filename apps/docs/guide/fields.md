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
