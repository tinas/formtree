# Groups

A group describes one part of a form, with a schema for its values and other definitions as its
children.

## Splitting a Form into Parts

A part of a form is defined with `defineGroup` and added to the `children` of the form:

```ts twoslash
// @noStaticSemanticInfo
import { defineGroup } from '@formtree/core'
import { z } from 'zod'
// ---cut---
export const addressGroup = defineGroup({
  schema: z.object({
    street: z.string({ error: 'Street is required' }).trim().min(1, {
      error: 'Street is required',
    }),
    city: z.string({ error: 'City is required' }).trim().min(1, {
      error: 'City is required',
    }),
  }),
})

export const checkoutForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
  }),
  children: {
    address: addressGroup,
  },
})
```

The values of the address sit under `address`, and any other form can reuse `addressGroup`.

## Choosing Between a Key and a Child

A value can live in two places, as a key of the schema of its group, like `email`, or as a child
with a definition of its own, like `address`. A key is the default. A value becomes a child once it
needs rules of its own:

- **It applies only after a certain answer.** `activeWhen` activates only children, so a value that
  comes and goes has a definition of its own, as [Conditional Fields](/guide/conditional-fields)
  shows.
- **It is checked with the server.** A server check belongs to the definition of the value it
  checks, as [Async Validation](/guide/async-validation) shows.
- **It reads dependencies of its own.** A value that needs data from its parent is defined with
  `defineFieldWithDeps`, as [Fields](/guide/fields#defining-a-field-with-dependencies) shows.
- **It is shared.** A value used in several groups is one definition that each of them adds as a
  child.

A single value becomes a child with `defineField`, as [Fields](/guide/fields) shows. A key is still a
node, with its own value and errors, so it is read and bound like a child. Because its rules come
from the schema of the group, it is called a lens node, not a child.

## Accessing a Part

`form.group` finds the node of a part by its name, and `field` and `group` on that node look inside
the part:

```ts twoslash
// @noStaticSemanticInfo
import { createForm, defineGroup } from '@formtree/core'
import { z } from 'zod'

const addressGroup = defineGroup({
  schema: z.object({
    street: z.string({ error: 'Street is required' }).trim().min(1, {
      error: 'Street is required',
    }),
    city: z.string({ error: 'City is required' }).trim().min(1, {
      error: 'City is required',
    }),
  }),
})

const checkoutForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
  }),
  children: {
    address: addressGroup,
  },
})

const form = createForm(checkoutForm)
// ---cut---
const address = form.group('address')
const city = address.field('city')
```

::: tip Full Paths
Passing the full path from the root, as in `form.field('address.city')`, returns the same node.
:::

## Reading the Validity of a Part

The state of a part covers everything inside it, so `state.valid` is `true` only once every value
in the address is valid, and a list of steps can mark it as complete:

<div class="vue-only">

```vue
<script setup lang="ts">
import { useForm } from '@formtree/vue'
import { checkoutForm } from './forms/checkout'

const form = useForm(checkoutForm)
const address = form.group('address')
</script>

<template>
  <li :class="{ complete: address.state.valid }">Address</li>
</template>
```

</div>

<div class="react-only">

```tsx
import { useForm, useNodeState } from '@formtree/react'
import { checkoutForm } from './forms/checkout'

export function CheckoutSteps() {
  const form = useForm(checkoutForm)
  const address = form.group('address')
  const addressValid = useNodeState(address, node => node.state.valid)

  return <li className={addressValid ? 'complete' : undefined}>Address</li>
}
```

`useNodeState` re-renders the component only when the value it reads changes, here when the address
becomes valid or invalid.

</div>

<div class="javascript-only">

```ts twoslash
// @noStaticSemanticInfo
// @filename: forms/checkout.ts
import { defineGroup } from '@formtree/core'
import { z } from 'zod'

const addressGroup = defineGroup({
  schema: z.object({
    street: z.string({ error: 'Street is required' }).trim().min(1, {
      error: 'Street is required',
    }),
    city: z.string({ error: 'City is required' }).trim().min(1, {
      error: 'City is required',
    }),
  }),
})

export const checkoutForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
  }),
  children: {
    address: addressGroup,
  },
})
// @filename: index.ts
// ---cut---
import { createForm } from '@formtree/core'
import { checkoutForm } from './forms/checkout'

const form = createForm(checkoutForm)
const address = form.group('address')
const addressStep = document.querySelector<HTMLLIElement>('#address-step')!

address.subscribe(() => {
  addressStep.classList.toggle('complete', address.state.valid)
})
```

</div>

The other flags in [`NodeState`](/api/@formtree/core/interfaces/NodeState), such as `dirty`,
describe the whole part in the same way.

## Defining a Group with Dependencies

Rules that need data from outside the form, such as the countries a shop delivers to, read it from
dependencies. `defineGroupWithDeps` takes the type of that data:

```ts twoslash
// @noStaticSemanticInfo
import { defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'
// ---cut---
export interface ShippingDeps {
  readonly countries: ReadonlyArray<string>
}

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
})
```

Every function in the options receives `deps`.

## Providing the Data

The form receives the data through its `deps` option:

<div class="vue-only">

```vue
<script setup lang="ts">
import { useForm } from '@formtree/vue'
import { ref } from 'vue'
import { fetchShippingCountries } from './api'
import { addressGroup } from './forms/address'

const countries = ref<ReadonlyArray<string>>([])

const form = useForm(addressGroup, {
  deps: () => ({ countries: countries.value }),
})

fetchShippingCountries().then(list => {
  countries.value = list
})
</script>
```

</div>

<div class="react-only">

```tsx
import { useForm } from '@formtree/react'
import { useEffect, useState } from 'react'
import { fetchShippingCountries } from './api'
import { addressGroup } from './forms/address'

export function AddressForm() {
  const [countries, setCountries] = useState<ReadonlyArray<string>>([])
  const form = useForm(addressGroup, { deps: { countries } })

  useEffect(() => {
    fetchShippingCountries().then(setCountries)
  }, [])
}
```

</div>

<div class="javascript-only">

```ts twoslash
// @noStaticSemanticInfo
// @filename: api.ts
export declare function fetchShippingCountries(): Promise<Array<string>>
// @filename: forms/address.ts
export { addressGroup } from './delivery'
// @filename: index.ts
// ---cut---
import { createForm } from '@formtree/core'
import { fetchShippingCountries } from './api'
import { addressGroup } from './forms/address'

const form = createForm(addressGroup, { deps: { countries: [] } })

fetchShippingCountries().then(countries => {
  form.setDeps({ countries })
})
```

</div>

When the data changes, the rules and checks that read it run again. Values are kept, so a country
that is no longer on the list becomes invalid.

## Passing Data to a Child

A group passes dependencies to its children with `childDeps`:

```ts twoslash
// @noStaticSemanticInfo
import type { ShippingDeps } from './forms/delivery'

import { defineGroupWithDeps } from '@formtree/core'
import { addressGroup } from './forms/delivery'
// ---cut---
export const deliveryGroup = defineGroupWithDeps<ShippingDeps>()({
  children: { address: addressGroup },
  childDeps: {
    address: ({ deps }) => deps,
  },
})
```

`childDeps` is required for every child that needs dependencies.

## Deriving Data from an Answer

`childDeps` can also build the dependencies of a child from the values of the group. Here the chosen
role determines the minimum length of `passwordField`, the field with dependencies from
[Fields](/guide/fields#defining-a-field-with-dependencies):

```ts twoslash
// @noStaticSemanticInfo
import { defineFieldWithDeps, defineGroup } from '@formtree/core'
import { z } from 'zod'

const passwordField = defineFieldWithDeps<{ minLength: number }>()({
  schema: ({ deps }) =>
    z.string({ error: 'Password is required' }).min(deps.minLength, {
      error: `Use at least ${deps.minLength} characters`,
    }),
})
// ---cut---
export const accountForm = defineGroup({
  schema: z.object({
    role: z.enum(['member', 'admin'], { error: 'Choose a role' }),
  }),
  children: { password: passwordField },
  childDeps: {
    password: ({ value }) => ({ minLength: value.role == 'admin' ? 12 : 8 }),
  },
})
```

Switching the role to admin rebuilds the password rule with the new length.
[Rules Based on a Role](/examples/role-based-rules) shows it live.

## Sharing a Value Between Siblings

Dependencies flow only from a parent to its children. A value that two siblings need belongs in the
schema of their parent, which passes it to both:

```ts twoslash
// @noStaticSemanticInfo
import { defineFieldWithDeps, defineGroup, defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'

interface CountryDeps {
  readonly country: string | undefined
}

declare function isPostalCodeOf(country: string | undefined, postalCode: string): boolean
declare function storesIn(country: string | undefined): ReadonlyArray<string>

const addressGroup = defineGroupWithDeps<CountryDeps>()({
  schema: ({ deps }) =>
    z.object({
      street: z.string({ error: 'Street is required' }),
      postalCode: z
        .string({ error: 'Postal code is required' })
        .refine(postalCode => isPostalCodeOf(deps.country, postalCode), { error: 'Check the postal code' }),
    }),
})

const storeField = defineFieldWithDeps<CountryDeps>()({
  schema: ({ deps }) =>
    z
      .string({ error: 'Choose a store' })
      .refine(store => storesIn(deps.country).includes(store), { error: 'Choose a store in this country' }),
})
// ---cut---
export const deliveryGroup = defineGroup({
  schema: z.object({
    country: z.string({ error: 'Choose a country' }),
  }),
  children: { address: addressGroup, store: storeField },
  childDeps: {
    address: ({ value }) => ({ country: value.country }),
    store: ({ value }) => ({ country: value.country }),
  },
})
```
