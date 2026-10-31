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
definitions that stand on their own. A key lives in one of the two, and declaring it in both is
a type error.

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

`validate` runs on every change, whatever the schema says, and it can return one error, a list
of errors or `undefined`. An error without a `path` belongs to the group itself.

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

Write `schema` and `children` before the options that read them: `activeWhen`, `childDeps` and
`validate`. TypeScript infers an object literal from left to right, so the callbacks are typed
from what comes before them.

The rest of the group options change the shape of the tree. [Conditional
branches](/guide/conditional-branches) turn children on and off with `activeWhen`, and
[Dependencies](/guide/dependencies) pass values from outside the form down with `childDeps`.
