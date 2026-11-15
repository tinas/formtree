# TypeScript

## Reading the Types of a Definition

`DraftOf`, `InputOf`, and `OutputOf` read the types of a definition, so they are never written by
hand:

```ts twoslash
import type { DraftOf, InputOf, OutputOf } from '@formtree/core'
import { defineField } from '@formtree/core'
import { z } from 'zod'
// ---cut---
const birthdayField = defineField({
  schema: z.iso.date({ error: 'Enter a date' }).transform(text => {
    return new Date(text)
  }),
})

type BirthdayDraft = DraftOf<typeof birthdayField>
//   ^?
type BirthdayInput = InputOf<typeof birthdayField>
//   ^?
type Birthday = OutputOf<typeof birthdayField>
//   ^?
```

The form holds the draft while the user types, the schema accepts the input, and a submit handler
receives the output.

## Typing Dependencies

`DepsOf` reads the type of the dependencies from a definition, for example for a function that loads
the data:

```ts twoslash
// @noStaticSemanticInfo
import type { DepsOf } from '@formtree/core'
import { checkoutForm } from './forms/checkout'

declare function fetchShippingCountries(): Promise<Array<string>>
// ---cut---
type CheckoutDeps = DepsOf<typeof checkoutForm>

async function loadCheckoutDeps(cartId: string): Promise<CheckoutDeps> {
  return { cartId, countries: await fetchShippingCountries() }
}
```

## Typed Paths

TypeScript checks the paths passed to `field`, `group`, and `array`:

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutForm } from './forms/checkout'

const form = createForm(checkoutForm, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
})
// ---cut---
// @errors: 2345
const city = form.field('delivery.adress.city')
```

::: tip Large Forms
TypeScript follows the path one key at a time and never builds a list of every path, so large and
[recursive](/guide/recursive-forms) forms stay fast to check.
:::

## Typing a Component

A component that reads its node by definition is typed by that definition alone:

<div class="vue-only">

```vue [address-fields.vue]
<script setup lang="ts">
import { useFormNode } from '@formtree/vue'
import { addressGroup } from './forms/delivery'

const address = useFormNode(addressGroup)
const city = address.field('city')
</script>
```

</div>

<div class="react-only">

```tsx [address-fields.tsx]
import { useFormNode } from '@formtree/react'
import { addressGroup } from './forms/delivery'

export function AddressFields() {
  const address = useFormNode(addressGroup)
  const city = address.field('city')
}
```

</div>

<div class="javascript-only">

```ts twoslash [address-fields.ts]
import type { NodeOf } from '@formtree/core'

import { addressGroup } from './forms/delivery'

export function renderAddress(address: NodeOf<typeof addressGroup>) {
  const city = address.field('city')
  //    ^?
}
```

</div>

It works in any form that holds an `addressGroup`. [Splitting into Components](/guide/components)
shows how a component finds its node.

## Ordering Options

When the `schema` of a definition reads dependencies, it is written before the callbacks, because
TypeScript types functions in the order they are written:

```ts twoslash
// @noStaticSemanticInfo
import type { ShippingDeps } from './forms/delivery'

import { defineField, defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'

const stateField = defineField({
  schema: z.string({ error: 'State is required' }),
})
// ---cut---
export const addressGroup = defineGroupWithDeps<ShippingDeps>()({
  schema: ({ deps }) => {
    const shipsTo = (country: string) => deps.countries.includes(country)
    return z.object({
      street: z.string({ error: 'Street is required' }),
      country: z.string({ error: 'Country is required' }).refine(shipsTo, {
        error: 'We do not ship to this country yet',
      }),
    })
  },
  children: { state: stateField },
  activeWhen: {
    state: ({ value }) => value.country == 'US',
  },
})
```

A callback written above the schema function would see none of its keys. A schema that is not a
function and `children` can go anywhere, since TypeScript reads plain values before any function.
