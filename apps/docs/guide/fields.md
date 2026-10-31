# Fields

A field is a leaf of the tree. It holds one value, which can be a string, a number, an object
picked from a list or an array of tags. It is still a full node: it validates, submits and
resets on its own.

## Defining a field

```ts twoslash
import { defineField } from '@formtree/core'
import { z } from 'zod'

export const priceField = defineField({
  schema: z.number({ error: 'Price is required' }).positive({ error: 'Price must be positive' }),
})
```

`schema` is the only required option, and [`DefineFieldOptions`](/api/@formtree/core/interfaces/DefineFieldOptions)
describes the others. A field that needs values from outside the form is defined with
`defineFieldWithDeps`, which [Dependencies](/guide/dependencies) explains.

## Empty values

A field starts as `undefined`, and writing `undefined` empties it. The library never makes up a
default. The schema decides whether an empty value is an error. With Zod, the `error` option of
`z.number()` and `z.string()` also covers `undefined`, which is where the "required" message
goes.

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

The form holds `number | undefined`, and the handler receives a `number`. A value that comes
from an API as `null` is turned into `undefined` where the API response becomes a draft, once,
at the edge of the form.

## Working with a field

```ts twoslash
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/checkout'

const form = createForm(contactGroup)
// ---cut---
const email = form.field('email')

email.setValue('ada@example')
email.blur()
email.state.errors
email.getAttributes()
email.reset({ value: 'ada@example.com' })
```

[`FieldNode`](/api/@formtree/core/interfaces/FieldNode) describes every member of a field node.

`state.errors` holds the errors that should be visible now, which depends on the
[display mode](/guide/validation#display-modes). `state.valid` reports every error, visible or
not.

## Asynchronous checks

Some rules are not rules at all but questions for a server: is this username taken, is this
promo code still valid. `validateAsync` asks them.

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
`debounceMs` how long it waits; [`AsyncValidationOptions`](/api/@formtree/core/interfaces/AsyncValidationOptions) gives
their values and defaults.

The check runs only once the schema passes, and it receives the output, so the server is asked
about the value that would be saved: trimmed and upper-cased here. Results are cached per value,
so going back to a code that was already checked does not ask again. A change aborts the
running check through `signal`. While a check runs, `state.validating` is `true`, and a submit
waits for it. A check that has not run yet runs at submit. A check that throws becomes an error
with the code `formtree.async_failed` instead of breaking the form.
[Promo Code](/examples/promo-code) shows a check live.

## A field as a form

Any definition can be the root of a form, a field included. An inline cell in a table creates
its own form from the same definition the edit page uses, so both apply the same rule.

```ts twoslash
import { createForm } from '@formtree/core'
import { priceField } from './forms/product'

declare function updatePrice(productId: number, price: number): Promise<number>
declare const product: { id: number; price: number }
// ---cut---
const cell = createForm(priceField, { id: `price-${product.id}`, initialValue: product.price })

const savePrice = cell.handleSubmit(async price => {
  cell.reset({ value: await updatePrice(product.id, price) })
})
```

[Inline Edit](/examples/inline-edit) shows this in a table.
