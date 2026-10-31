# Groups

A group is the skeleton of the tree. A checkout step, a settings card and the checkout itself
are groups. A group describes its own keys, nests other definitions and holds the rules that
relate them.

## Schema and children

```ts twoslash
import { defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'

const emailField = defineField({
  schema: z.email({ error: 'Enter a valid email address' }),
})

export const contactGroup = defineGroup({
  schema: z.object({
    fullName: z.string({ error: 'Name is required' }).trim().min(1, { error: 'Name is required' }),
    phone: z.string().optional(),
  }),
  children: { email: emailField },
})
```

`schema` describes the keys that belong to this group and nothing else. `children` nests
definitions that stand on their own: a field, a group, or an array made with `arrayOf`. A key
lives in one of the two, and declaring it in both is a type error.

In the draft, a child group is `{}` and a child array is `[]` from the start, and a child field
is `undefined` until something writes it. The group's output is the output of its schema, with
the output of each active child added under its key.

Keeping each schema small has a practical effect too: a refinement on a Zod object is skipped
while any key of that object is invalid, so a rule written on a large schema waits for unrelated
fields. A group's schema only waits for its own keys.

A group without a schema is a plain container.

```ts twoslash
import { defineGroup } from '@formtree/core'
import { contactGroup, paymentGroup } from './forms/checkout'

const orderGroup = defineGroup({
  children: { contact: contactGroup, payment: paymentGroup },
})
```

## Schema or children

A key starts in the schema. It is a node there too: it can be read, written, validated and
submitted. Move it into `children`, with a definition of its own, when it needs something a key
in a schema cannot have:

- to be turned on and off, because [`activeWhen`](/guide/conditional-branches) only accepts
  children;
- [dependencies](/guide/dependencies) of its own, or an
  [asynchronous check](/guide/fields#asynchronous-checks);
- an output of its own, with transforms, when that part is submitted alone;
- to be used in another form, or as the root of a small form such as a table cell;
- items that are nodes, with [`arrayOf`](/guide/arrays);
- to contain itself, as a [recursive definition](/guide/recursive-definitions).

## Moving down the tree

`field`, `group` and `array` return the node at a path. The path is relative to the node you
call it on, and it is typed one segment at a time.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
})
// ---cut---
const city = form.field('delivery.address.city')
//    ^?

const address = form.group('delivery').group('address')
address.field('city') === city // true
```

The accessor picks how you look at a value. An array of tag ids kept in a schema can be read as
one value with `field('tags')`, which suits a multi-select, or as a list with `array('tags')`,
which gives you its items and operations.

## Rules across keys

A rule that relates several values belongs to the group that holds them. `validate` receives the
full draft of the group, children included, and returns errors with paths relative to the group.

```ts twoslash
import { defineGroup } from '@formtree/core'
import { z } from 'zod'

export const passwordGroup = defineGroup({
  schema: z.object({
    password: z.string({ error: 'Password is required' }).min(8, { error: 'Use at least 8 characters' }),
    confirmPassword: z.string({ error: 'Repeat the password' }),
  }),
  validate: ({ value }) =>
    value.confirmPassword !== undefined && value.confirmPassword !== value.password
      ? { path: 'confirmPassword', code: 'Passwords do not match' }
      : undefined,
})
```

`validate` runs after every change inside the group, whether or not the schema passes, and
returns one error, a list of errors or `undefined`. An error without a `path` belongs to the
group itself. Its errors have the source `'validate'`, and its next result replaces them.

The value is a draft, so a key the user has not filled in yet is `undefined`: the rule above
checks `confirmPassword` before comparing it. The draft also holds inactive children, and an
error the rule places inside an inactive child is ignored until that child is active again.

Put a rule on the nearest group that holds every value it compares. A refinement in the schema
cannot see children, and it waits for every key of its object, as described above. A rule that
compares the items of a list goes on the array: see
[Rules across items](/guide/arrays#rules-across-items).

## The group's state

A group's state summarizes its subtree: `dirty` is true when any value inside differs from its
initial value, `valid` when nothing inside has an error, `validating` while a check inside runs.
A "Save" button that lights up only when its card has changes reads `card.state.dirty`.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
})
declare function saveContact(contact: { fullName: string; email: string }): Promise<{ fullName: string; email: string }>
// ---cut---
const contact = form.group('contact')

const saveContactCard = contact.handleSubmit(async value => {
  contact.reset({ value: await saveContact(value) })
})
```

After a save, `reset({ value })` makes the saved value the new initial value of that card alone.
The card is clean again, and other cards keep their unsaved changes.

## Option order

Write `schema` and `children` before the options whose callbacks read them, such as
[`activeWhen`](/guide/conditional-branches) and [`childDeps`](/guide/dependencies). TypeScript
infers an object literal from left to right, so the callbacks are typed from what comes before
them.
