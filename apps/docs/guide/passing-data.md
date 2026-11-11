# Passing Data to Rules

## Declaring Dependencies

A rule that needs data from outside the form, such as countries loaded from the server, declares
that data as dependencies. Define it with `defineGroupWithDeps` and the type of the data:

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

::: tip Fields
`defineFieldWithDeps` does the same for a field.
:::

## Providing the Data

Pass the data with the `deps` option, and give the form the new data when it changes:

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

Rules and checks that read the data run again with the new data. Values are kept, so a country that
is no longer on the list turns invalid.

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

`childDeps` can also build a child's dependencies from the group's own values:

```ts twoslash
// @noStaticSemanticInfo
import { defineFieldWithDeps, defineGroup } from '@formtree/core'
import { z } from 'zod'
// ---cut---
export const passwordField = defineFieldWithDeps<{ minLength: number }>()({
  schema: ({ deps }) =>
    z.string({ error: 'Password is required' }).min(deps.minLength, {
      error: `Use at least ${deps.minLength} characters`,
    }),
})

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
[Role-based Rules](/examples/role-based-rules) shows it live.

## Sharing a Value Between Siblings

Dependencies flow only from a parent to its children, so siblings cannot pass data to each other.
Put the value in their parent's schema, and pass it to both:

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

## Typing Dependencies

`DepsOf` reads the dependency type from a definition, for example for a function that loads the
data:

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

[TypeScript](/guide/typescript) covers the other types formtree reads from a definition.
