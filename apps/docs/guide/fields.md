# Fields

## Defining a Field

A value that needs rules of its own gets a definition of its own. Define it with `defineField`, and
add it to a group's `children`:

```ts twoslash
// @noStaticSemanticInfo
import { defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'
// ---cut---
export const priceField = defineField({
  schema: z.number({ error: 'Price is required' }).positive({
    error: 'Price must be positive',
  }),
})

export const productForm = defineGroup({
  schema: z.object({
    name: z.string({ error: 'Name is required' }).trim().min(1, {
      error: 'Name is required',
    }),
  }),
  children: {
    price: priceField,
  },
})
```

Every form that uses `priceField` checks the price with the same rule.
[`DefineFieldOptions`](/api/@formtree/core/interfaces/DefineFieldOptions) lists what else a field
definition can hold.

## Empty Values

A field starts as `undefined`, never as `0` or an empty string:

```ts twoslash
import { createForm, defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'

const priceField = defineField({
  schema: z.number({ error: 'Price is required' }).positive({
    error: 'Price must be positive',
  }),
})

const productForm = defineGroup({
  schema: z.object({
    name: z.string({ error: 'Name is required' }).trim().min(1, {
      error: 'Name is required',
    }),
  }),
  children: {
    price: priceField,
  },
})

const form = createForm(productForm)
// ---cut---
const price = form.field('price')
const value = price.state.value
//    ^?
```

The schema decides whether an empty value is an error.

## Changing a Value from Code

Input bindings write to a field for you. When a value comes from somewhere else, such as a button
that picks a price, call `setValue`, and call `blur` when the user is done with the control:

```ts twoslash
// @noStaticSemanticInfo
import { createForm, defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'

const priceField = defineField({
  schema: z.number({ error: 'Price is required' }).positive({
    error: 'Price must be positive',
  }),
})

const productForm = defineGroup({
  schema: z.object({
    name: z.string({ error: 'Name is required' }).trim().min(1, {
      error: 'Name is required',
    }),
  }),
  children: {
    price: priceField,
  },
})

const form = createForm(productForm)
// ---cut---
const price = form.field('price')

price.setValue(25)
price.blur()
```

## A Field as a Form

Any definition can be the root of a form, a field included. A form made from `priceField` edits
only the price:

<div class="vue-only">

```vue
<script setup lang="ts">
import type { Product } from './api'

import { useForm } from '@formtree/vue'
import { updatePrice } from './api'
import { priceField } from './forms/product'

const props = defineProps<{ product: Product }>()

const priceForm = useForm(priceField, { initialValue: props.product.price })

const savePrice = priceForm.handleSubmit(async price => {
  await updatePrice(props.product.id, price)
})
</script>
```

</div>

<div class="react-only">

```tsx
import type { Product } from './api'

import { useForm } from '@formtree/react'
import { updatePrice } from './api'
import { priceField } from './forms/product'

export function PriceCell({ product }: { product: Product }) {
  const priceForm = useForm(priceField, { initialValue: product.price })

  const savePrice = priceForm.handleSubmit(async price => {
    await updatePrice(product.id, price)
  })
}
```

</div>

<div class="javascript-only">

```ts twoslash
// @noStaticSemanticInfo
// @filename: api.ts
export interface Product {
  readonly id: number
  readonly price: number
}

export declare function updatePrice(productId: number, price: number): Promise<void>
// @filename: index.ts
// ---cut---
import type { Product } from './api'

import { createForm } from '@formtree/core'
import { updatePrice } from './api'
import { priceField } from './forms/product'

export function createPriceForm(product: Product) {
  const priceForm = createForm(priceField, { initialValue: product.price })

  const savePrice = priceForm.handleSubmit(async price => {
    await updatePrice(product.id, price)
  })

  return { priceForm, savePrice }
}
```

</div>

The form's value is the price itself, so `savePrice` receives a number.
[Inline Edit](/examples/inline-edit) shows a table of these forms.
