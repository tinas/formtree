# Arrays

An array holds a list of rows that share one definition.

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
    quantity: z.number({ error: 'Quantity is required' }).int().positive({
      error: 'Quantity must be at least 1',
    }),
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

`form.array` returns the node of the list, which adds and removes rows:

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

`push({})` adds an empty row, because FormTree never invents a value.
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

The errors and the touched state of a row are kept under its `key` and move with it, so a rendered
list is keyed by `key`, not by the index.

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
    rows.flatMap((row, index) => {
      const firstIndex = rows.findIndex(other => other.sku == row.sku)
      if (row.sku == undefined || firstIndex == index) return []
      const path = `${index}.sku`
      return [{ path, code: 'This product is already in the cart' }]
    }),
})
```

The rule receives every row, and the path of each error starts with the index of the row.

::: tip Waiting for a Submit
Adding, removing, or moving a row marks the list as touched, so with the default mode the error of
the rule is shown at once. To wait for a submit, the page shows it only while
`form.state.submitCount` is above zero.
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
