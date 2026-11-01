# How It Works

formtree has three pieces, and the fourth one is yours.

| Piece      | Made with                               | What it is                                                                   |
| ---------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| Definition | `defineField`, `defineGroup`, `arrayOf` | A typed description of part of the form. Schema, rules, children. No state.  |
| Form       | `createForm(definition, options)`       | One immutable state for the whole tree, with subscriptions and dependencies. |
| Node       | `form.field()`, `.group()`, `.array()`  | A view of one position in the tree. Reads, writes, validates and submits.    |
| UI         | your components                         | Elements, layout and wording. The core knows none of it.                     |

## Definitions describe

A definition says what a part of the form looks like and which rules apply to it. It does not
hold a value, so the same definition can back a checkout step, a settings card and a table
cell at the same time.

```ts twoslash
import { defineGroup } from '@formtree/core'
import { z } from 'zod'
import { emailField } from './forms/checkout'

const contactGroup = defineGroup({
  schema: z.object({ fullName: z.string().trim().min(1) }),
  children: { email: emailField },
})
```

A group lists its own keys in `schema` and nests other definitions in `children`. An array
repeats a definition with `arrayOf`. That is the whole vocabulary.

## The form holds the state

`createForm` builds the tree a definition describes and keeps its state in one place.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
})

form.state.value
// { contact: {}, delivery: { address: {} }, payment: { card: {}, invoice: {} }, lineItems: [] }
```

The structure is there from the start: groups are `{}` and arrays are `[]`, because the
definitions say they exist. The values inside are a draft. Every value a schema describes is
`undefined` until something writes it.

Any definition can be the root of a form. A single field is a complete form too, which is how
an inline table cell gets the same rule as the full page.

```ts twoslash
import { createForm } from '@formtree/core'
import { priceField } from './forms/product'

const cell = createForm(priceField, { initialValue: 24.9 })
```

The root node also carries the controls of the form itself, such as `subscribe`, which calls a
listener once per change. [`FormControls`](/api/@formtree/core/interfaces/FormControls) describes them.

## Nodes are views

A node is one position in the tree. The root, a step, a row and a field are all nodes, and they
are read, written, validated and submitted the same way. A group can also move down the tree,
and an array can also change its items. The API reference describes each kind:
[`FieldNode`](/api/@formtree/core/interfaces/FieldNode), [`GroupNode`](/api/@formtree/core/interfaces/GroupNode) and
[`ArrayNode`](/api/@formtree/core/interfaces/ArrayNode).

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
})
// ---cut---
const delivery = form.group('delivery')
const city = delivery.field('address.city')

city === form.field('delivery.address.city') // true
```

There is one node object per position, so reaching the same position by another path returns
the same object. A node is a value you can pass around and compare.

## Three types per node

A node has three types, and each answers a different question.

| Type   | Helper                        | Question                                                            |
| ------ | ----------------------------- | ------------------------------------------------------------------- |
| Draft  | `DraftOf<typeof definition>`  | What does the form hold while the user types? Empty is `undefined`. |
| Input  | `InputOf<typeof definition>`  | What does the schema accept?                                        |
| Output | `OutputOf<typeof definition>` | What does the submit handler receive, after transforms?             |

```ts twoslash
import type { DraftOf, OutputOf } from '@formtree/core'
import { promoCodeField } from './forms/checkout'

type PromoCodeDraft = DraftOf<typeof promoCodeField>
//   ^?

type PromoCode = OutputOf<typeof promoCodeField>
//   ^?
```

The schema of `promoCodeField` trims and upper-cases the code. The form holds what the
customer typed, and the handler receives the transformed value.

## Defined nodes and lens nodes

Every key is a node, and every node validates and submits. What differs is where its type and
its rules come from.

|                     | Defined node                                 | Lens node                                          |
| ------------------- | -------------------------------------------- | -------------------------------------------------- |
| Comes from          | a definition in the parent's `children`      | a key in the parent's `schema`                     |
| Type                | its own definition                           | the parent's draft at that key                     |
| When empty          | groups `{}`, arrays `[]`, fields `undefined` | `undefined`                                        |
| Validated by        | its own schema, rules and children           | the nearest defined ancestor, filtered to its path |
| `handleSubmit` gets | its own output                               | its validated input                                |

`contact.fullName` above is a lens node: it lives in the schema of `contactGroup`. A lens node
cannot run part of a schema on its own, so its handler receives the validated input instead of
a transformed output. [Groups](/guide/groups#schema-or-children) explains when a part needs a
definition of its own.

A child always means a defined node: an entry of its parent's `children`. A key of the parent's
schema is a node of the tree as well, but it takes its rules from the parent, so these docs call
it a key, not a child.

## Ids

Each node has a DOM id built from the form id and its path, such as `checkout:contact.email`,
and ids derived from it: a field's error message and description, a group's or an array's error
summary. Pass `id` to `createForm` to choose the prefix; otherwise a counter is used, and the
adapters use `useId()`. These ids are the only link between the core and the DOM: they connect
labels, `aria-describedby` and error focus.
