# Arrays

## Defining a List

A part that repeats, like the rows of a cart, is defined once for one row and wrapped in `arrayOf`:

```ts twoslash
// @noStaticSemanticInfo
import { arrayOf, defineGroup } from '@formtree/core'
import { z } from 'zod'
// ---cut---
const lineItemGroup = defineGroup({
  schema: z.object({
    sku: z.string({ error: 'Product is required' }),
    quantity: z.number({ error: 'Quantity is required' }).int().positive({ error: 'Quantity must be at least 1' }),
  }),
})

const cartForm = defineGroup({
  children: { lineItems: arrayOf(lineItemGroup) },
})
```

Each row is a node of `lineItemGroup`, and a new form starts with an empty list.

::: tip Lists of Single Values
For a list of single values, pass a schema instead, as in `arrayOf(z.email())`.
:::

## Adding and Removing Rows

`form.array` returns the list's node, which adds and removes rows:

```ts twoslash
// @noStaticSemanticInfo
import { createForm, defineGroup } from '@formtree/core'
import { lineItemsArray } from './forms/line-items'

const cartForm = defineGroup({ children: { lineItems: lineItemsArray } })
const form = createForm(cartForm)
// ---cut---
const lineItems = form.array('lineItems')

lineItems.push({})
lineItems.remove(0)
```

`push({})` adds an empty row, because formtree fills in nothing for you.
[`ArrayNode`](/api/@formtree/core/interfaces/ArrayNode) lists every operation.

## Keeping Track of Rows

Each row in `items` has a `key` that stays the same when rows move, and an `index` that follows its
position:

```ts twoslash
// @noStaticSemanticInfo
import { createForm, defineGroup } from '@formtree/core'
import { lineItemsArray } from './forms/line-items'

const cartForm = defineGroup({ children: { lineItems: lineItemsArray } })
const form = createForm(cartForm)
const lineItems = form.array('lineItems')
lineItems.push({ sku: 'MUG-01', quantity: 1 })
lineItems.push({ sku: 'TEE-02', quantity: 2 })
// ---cut---
const row = lineItems.items[1]!

lineItems.move(1, 0)

console.log(row.index) // 0
```

A row's errors and touched state are kept under its `key` and move with it, so use `key`, not the
index, when you render the list.

## Rules Across Rows

A rule that compares rows, such as one against repeated products, goes in the `validate` option of
`arrayOf`:

```ts twoslash
// @noStaticSemanticInfo
import { arrayOf } from '@formtree/core'
import { lineItemGroup } from './forms/line-items'
// ---cut---
const lineItemsArray = arrayOf(lineItemGroup, {
  validate: rows =>
    rows.flatMap((row, index) =>
      row.sku != undefined && rows.findIndex(other => other.sku == row.sku) < index
        ? [{ path: `${index}.sku`, code: 'This product is already in the cart' }]
        : [],
    ),
})
```

The rule receives every row, and each error's path starts with the row's index.

::: tip Showing It After a Submit
Adding, removing, or moving a row marks the list as touched, so with the default display mode the
rule's error shows at once. To wait for a submit, show it only while `form.state.submitCount` is
above zero.
:::

## Saving One Row

Each row is a node, so it can be submitted on its own, such as from a Save button on the row:

```ts twoslash
// @noStaticSemanticInfo
import { createForm, defineGroup } from '@formtree/core'
import { saveLineItem } from './forms/api'
import { lineItemsArray } from './forms/line-items'

const cartForm = defineGroup({ children: { lineItems: lineItemsArray } })
const form = createForm(cartForm)
const lineItems = form.array('lineItems')
lineItems.push({ sku: 'MUG-01', quantity: 1 })
// ---cut---
const row = lineItems.items[0]!

const saveRow = row.handleSubmit(async lineItem => {
  await saveLineItem(lineItem)
})
```

`saveRow` validates only its own row. [Line Items](/examples/line-items) shows a list that saves row
by row.
