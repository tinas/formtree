# Arrays

An array repeats a definition. Each item is a node with a stable key, so its errors, its touched
state and its pending checks stay with it when the list is reordered.

## Defining an array

```ts twoslash
import { arrayOf, defineGroup } from '@formtree/core'
import { z } from 'zod'

export const lineItemGroup = defineGroup({
  schema: z.object({
    sku: z.string({ error: 'Product is required' }).min(1, { error: 'Product is required' }),
    quantity: z.number({ error: 'Quantity is required' }).int().positive(),
  }),
})

export const cartGroup = defineGroup({
  children: { items: arrayOf(lineItemGroup) },
})
```

`arrayOf` takes the item in one of three forms:

| Item                     | Example                             | Each item is                                                        |
| ------------------------ | ----------------------------------- | ------------------------------------------------------------------- |
| a definition             | `arrayOf(lineItemGroup)`            | a node of that definition                                           |
| a function returning one | `arrayOf(() => conditionTreeGroup)` | the same, for [recursive definitions](/guide/recursive-definitions) |
| a Standard Schema        | `arrayOf(z.string().email())`       | a field with that schema                                            |

An array of plain values that the UI edits as one value, such as the ids of a multi-select, does
not need `arrayOf`. It can stay in the parent's schema and be read with `field()`.

## Items and operations

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
})
// ---cut---
const items = form.array('items')

items.push({ sku: 'MUG-01', quantity: 1 })
items.push({})
items.move(1, 0)
items.remove(0)

for (const item of items.items) {
  item.key
  item.index
  item.field('quantity').state.value
}
```

| Member                 | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `items`                | The item nodes, each with `key` and `index`.           |
| `push(draft)`          | Adds an item at the end. `push({})` adds an empty row. |
| `insert(index, draft)` | Adds an item at a position.                            |
| `remove(index)`        | Removes the item at a position.                        |
| `move(from, to)`       | Moves an item.                                         |
| `swap(first, second)`  | Swaps two items.                                       |
| `replace(drafts)`      | Replaces every item.                                   |

`key` identifies the item for as long as it exists, which makes it the right `key` for a `v-for`
or a React list and for caching DOM elements. `index` is where the item is now.

## Keys, not indexes

When an item moves, everything that belongs to it moves with it: its errors, whether it was
touched, its submit count and its cached asynchronous results. A node you hold for an item keeps
pointing at that item after a move.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
})
const items = form.array('items')
items.push({ sku: 'MUG-01', quantity: 1 })
items.push({ sku: 'TEE-02', quantity: 2 })
// ---cut---
const tee = items.items[1]!

items.move(1, 0)

tee.index // 0
tee.field('sku').state.value // 'TEE-02'
```

A dotted path with a number, such as `'items.1.sku'`, is accepted but not suggested, because it
points at whichever item is at that position now. Prefer holding the item node.

## Rules across items

A rule that compares items with each other goes on the array. `validate` receives the drafts of
all items, and error paths start with the item index.

```ts twoslash
import { arrayOf } from '@formtree/core'
import { lineItemGroup } from './forms/checkout'

export const lineItemsArray = arrayOf(lineItemGroup, {
  validate: rows =>
    rows.flatMap((row, index) =>
      rows.findIndex(other => other.sku === row.sku) < index
        ? [{ path: `${index}.sku`, code: 'This product is already in the cart' }]
        : [],
    ),
})
```

## Saving one row

Each item of a defined array is a full node, so a table that saves row by row submits the row.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'
import { saveLineItem } from './forms/api'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
})
form.array('items').push({ sku: 'MUG-01', quantity: 1 })
// ---cut---
const row = form.array('items').items[0]!

const saveRow = row.handleSubmit(async item => {
  row.reset({ value: await saveLineItem(item) })
})
```

The row validates alone, and `reset({ value })` makes the saved item the row's new initial value.
Only that row becomes clean. A row that was added and then saved joins the initial list, so the
list itself is clean once every row is saved. [Line Items](/examples/line-items) shows this.

Adding or removing an item marks the array as touched, so an error on the array itself, such as
an empty list, shows as soon as the list changes.
