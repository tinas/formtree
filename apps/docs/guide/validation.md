# Validation

Validation in formtree answers two separate questions, whether a value is valid and whether the user
should see that it is not. The first is answered on every change, the second by the display mode.

## Four producers

Every error has one producer, and a producer only touches its own errors.

| Producer     | Where it is written                                                      | Source                 |
| ------------ | ------------------------------------------------------------------------ | ---------------------- |
| Schema       | `schema` of a field or group                                             | `'schema'`             |
| Rule         | `validate` of a group or an array                                        | `'validate'`           |
| Asynchronous | [`validateAsync`](/guide/fields#asynchronous-checks) of a field or group | `'async'`              |
| External     | `setErrors`, or a submit handler's return                                | `'server'` or your own |

An error a server returned is not wiped out the next time the schema runs, and a schema error is not
hidden by an asynchronous result. Each error shows its `source`, so the UI can tell them apart.

## Which check runs first

The address step of a checkout has three kinds of checks. The schema checks each key on its own,
such as whether the street is filled in and a country is chosen. A rule compares keys, because a
German postal code has five digits and a Dutch one four digits and two letters. A server check asks
whether the address exists.

Run all three together and the server is asked about every half-typed postal code. Run them one
after another and the customer fixes the street before learning that the postal code is wrong too.
formtree runs the schema and the rule together and asks the server last.

```ts twoslash
import { defineGroup } from '@formtree/core'
import { z } from 'zod'
import { verifyAddress } from './forms/api'
import { requiredText } from './forms/schemas'

const POSTAL_CODE_FORMATS = { DE: /^\d{5}$/, NL: /^\d{4}[A-Z]{2}$/ }

export const addressGroup = defineGroup({
  schema: z.object({
    street: requiredText('Street is required'),
    postalCode: z.string({ error: 'Postal code is required' }),
    country: z.enum(['DE', 'NL'], { error: 'Choose a country' }),
  }),
  validate: ({ value }) =>
    value.country !== undefined &&
    value.postalCode !== undefined &&
    !POSTAL_CODE_FORMATS[value.country].test(value.postalCode)
      ? { path: 'postalCode', code: 'Check the postal code' }
      : undefined,
  validateAsync: {
    on: 'change',
    run: async (address, { signal }) =>
      (await verifyAddress(address, signal)) ? undefined : { code: 'We cannot find this address' },
  },
})
```

A customer in Germany types a postal code with a digit missing, fills in the street, then fixes the
postal code.

```ts twoslash
import { createForm, defineGroup } from '@formtree/core'
import { z } from 'zod'
import { verifyAddress } from './forms/api'
import { requiredText } from './forms/schemas'

const POSTAL_CODE_FORMATS = { DE: /^\d{5}$/, NL: /^\d{4}[A-Z]{2}$/ }

const addressGroup = defineGroup({
  schema: z.object({
    street: requiredText('Street is required'),
    postalCode: z.string({ error: 'Postal code is required' }),
    country: z.enum(['DE', 'NL'], { error: 'Choose a country' }),
  }),
  validate: ({ value }) =>
    value.country !== undefined &&
    value.postalCode !== undefined &&
    !POSTAL_CODE_FORMATS[value.country].test(value.postalCode)
      ? { path: 'postalCode', code: 'Check the postal code' }
      : undefined,
  validateAsync: {
    on: 'change',
    run: async (address, { signal }) =>
      (await verifyAddress(address, signal)) ? undefined : { code: 'We cannot find this address' },
  },
})
// ---cut---
const form = createForm(addressGroup, { initialValue: { country: 'DE' } })
const street = form.field('street')
const postalCode = form.field('postalCode')

postalCode.setValue('1011')
street.setValue('Main Street 5')
postalCode.setValue('10115')
```

1. After `'1011'`, the address has two errors at once. The schema reports the missing street, and
   the rule reports the postal code. The server is not asked.
2. After the street, the schema passes. The postal code error remains, and the server is still not
   asked.
3. After `'10115'`, the schema and the rule pass. `state.validating` turns `true`, and after the
   debounce the server is asked about the output of the group. An address it cannot find gets an
   error with the source `'async'`.

The schema and the rule run on every change inside their node, before `setValue` returns, and
neither waits for the other. A rule that waited would hold its error back until every key passed,
and the customer would meet the mistakes one at a time. For the same reason the rule receives the
draft, since an output exists only once everything inside the node is valid, and it checks that
`country` and `postalCode` are filled in before reading them. Each keeps its own errors, so the
order between them never changes a result.

The server check runs last and receives the output, the value that would be saved. A request costs a
round trip, so the check waits as long as a schema or rule error sits on its node or anywhere below
it. Once none is left, its [`on`](/api/@formtree/core/interfaces/AsyncValidationOptions) option
decides what starts it.

A check on one key belongs in the schema. A rule that compares values belongs in `validate` of the
nearest group that holds them, as in [Rules across keys](/guide/groups#rules-across-keys), or in a
refinement of that group's schema, as in
[The same rule in the schema](/guide/groups#the-same-rule-in-the-schema). A question only a server
can answer belongs in `validateAsync`. A field has no `validate`, because its own rule goes into its
schema and a rule that compares it with another value goes on its parent.

### A rule on a parent holds a child's check

Promo codes apply to card payments only. The rule compares two values, so it sits on the group that
holds both and places its error on the promo code.

```ts twoslash
import { defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'
import { promoCodeField } from './forms/promo-code'

export const orderGroup = defineGroupWithDeps<{ cartId: string }>()({
  schema: z.object({
    paymentMethod: z.enum(['card', 'invoice'], { error: 'Choose a payment method' }),
  }),
  children: { promoCode: promoCodeField },
  childDeps: {
    promoCode: ({ deps }) => deps,
  },
  validate: ({ value }) =>
    value.paymentMethod === 'invoice' && value.promoCode !== undefined && value.promoCode !== ''
      ? { path: 'promoCode', code: 'Promo codes apply to card payments only' }
      : undefined,
})
```

While invoice is selected, the promo code has the rule's error and its server check does not run,
so the server is never asked about a code the order cannot use. Switching to card removes the error,
and the check runs at its next trigger, which is the next blur or the submit here. A check waits for
every schema or rule error on its node or below it, whichever node produced the error.

[Lifecycle](/guide/lifecycle#a-change) follows a change through the whole tree, step by step.

## Display modes

The display mode decides when an error becomes visible in `state.errors`. It never decides whether a
value is valid, and `state.valid` is accurate from the first render.

| `mode`              | An error becomes visible                  |
| ------------------- | ----------------------------------------- |
| `onTouched` default | after the field is blurred once           |
| `onBlur`            | on blur                                   |
| `onChange`          | on the first change                       |
| `onSubmit`          | when a node that contains it is submitted |
| `all`               | at once                                   |

Once an error has been visible, `reValidateMode` takes over. With the default `onChange`, a new
error on that field also shows as the user types. With `onBlur` or `onSubmit`, a new error waits for
that trigger. A fixed error disappears at once in every mode.

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

Both options can be given to `createForm` and to any definition, and the nearest definition wins. A
quantity stepper can show its error as it changes while the rest of the form waits for a blur.

A submit reveals the errors of the submitted subtree only, so submitting the delivery step does not
reveal errors in the payment step.

## Reading errors without showing them

`validate()` settles every check in a subtree, including pending asynchronous ones, and returns the
result without making anything visible.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE'] },
})
// ---cut---
const result = await form.group('payment').validate()

const remaining = result.valid ? 0 : result.errors.length
```

`listErrors({ includeHidden: true })` lists every error of a node, visible or not, for tests and for
a summary that counts what is left to fix.
