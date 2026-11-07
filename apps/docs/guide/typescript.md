# TypeScript

## Reading a Definition's Types

Read the types of a definition with `DraftOf`, `InputOf`, and `OutputOf` instead of writing them by
hand:

```ts twoslash
import type { DraftOf, InputOf, OutputOf } from '@formtree/core'
import { defineField } from '@formtree/core'
import { z } from 'zod'
// ---cut---
const birthdayField = defineField({
  schema: z.iso.date({ error: 'Enter a date' }).transform(text => new Date(text)),
})

type BirthdayDraft = DraftOf<typeof birthdayField>
//   ^?
type BirthdayInput = InputOf<typeof birthdayField>
//   ^?
type Birthday = OutputOf<typeof birthdayField>
//   ^?
```

The form holds the draft while the user types, the schema accepts the input, and a submit handler
receives the output. `DepsOf` reads a definition's dependencies the same way.

## Typed Paths

Paths passed to `field`, `group`, and `array` are checked as you type:

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

Write `schema` and `children` before the options that read them, because TypeScript types a
definition's callbacks in the order they are written:

```ts twoslash
// @noStaticSemanticInfo
import { defineField, defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'

const stateField = defineField({
  schema: z.string({ error: 'State is required' }),
})
// ---cut---
export const addressGroup = defineGroupWithDeps<{ countries: ReadonlyArray<string> }>()({
  schema: ({ deps }) =>
    z.object({
      street: z.string({ error: 'Street is required' }),
      country: z
        .string({ error: 'Country is required' })
        .refine(country => deps.countries.includes(country), { error: 'We do not ship to this country yet' }),
    }),
  children: { state: stateField },
  activeWhen: {
    state: ({ value }) => value.country == 'US',
  },
})
```

A schema that reads dependencies is a function too, and a callback written above it would see no
keys.

## Reading Hover Types

When a hover shows helper names such as `Simplify` instead of an object, declare a type for the part
you want to read:

```ts twoslash
import type { OutputOf } from '@formtree/core'
import { addressGroup } from './forms/delivery'
// ---cut---
type Address = OutputOf<typeof addressGroup>
//   ^?
```

For a node, hover one of its fields instead of the node itself.
