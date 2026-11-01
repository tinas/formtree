# Groups

A group is the skeleton of the tree. A checkout step, a settings card and the checkout itself are
groups. A group describes its own keys, nests other definitions and holds the rules that relate
them.

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
definitions that stand on their own, such as a field, a group or an array made with `arrayOf`. A
key lives in one of the two, and declaring it in both is a type error. Both kinds of key are nodes,
but only the entries of `children` are the group's children. A key of the schema has no definition
of its own and takes its rules from the group.

In the draft, a child group is `{}` and a child array is `[]` from the start, and a child field is
`undefined` until something writes it. The group's output is the output of its schema, with the
output of each active child added under its key.

A group without a schema is a plain container.

```ts twoslash
import { defineGroup } from '@formtree/core'
import { contactGroup } from './forms/contact'
import { paymentGroup } from './forms/payment'

const orderGroup = defineGroup({
  children: { contact: contactGroup, payment: paymentGroup },
})
```

## Schema or children

A key starts in the schema, where it can already be read, written, validated and submitted. Move it
into `children`, with a definition of its own, when it needs one of these.

- Turning on and off, because [`activeWhen`](/guide/conditional-branches) only accepts children.
- [Dependencies](/guide/dependencies) of its own, or an
  [asynchronous check](/guide/fields#asynchronous-checks).
- An output of its own, with transforms, when that part is submitted alone.
- Use in another form, or as the root of a form of its own.
- Items that are nodes, with [`arrayOf`](/guide/arrays).
- Containing itself, as a [recursive definition](/guide/recursive-definitions).

## Moving down the tree

`field`, `group` and `array` return the node at a path. The path is relative to the node you call
it on, and it is typed one segment at a time.

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

The accessor picks how you look at a value. An array of tag ids kept in a schema can be read as one
value with `field('tags')`, which suits a multi-select, or as a list with `array('tags')`, which
gives you its items and operations.

## Rules across keys

A sign-up asks for the password twice, and the two must match. The rule compares two keys, so it
belongs to the group that holds both. `validate` receives the full draft of the group, children
included, and returns errors with paths relative to the group.

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

`validate` runs after every change inside the group, whether or not the schema passes, and returns
one error, a list of errors or `undefined`. An error without a `path` belongs to the group itself.
Its errors have the source `'validate'`, and its next result replaces them.

The value is a draft, so a key the user has not filled in yet is `undefined`, which is why the rule
above checks `confirmPassword` first. The draft also holds inactive children, and an error the rule
places inside an inactive child is ignored until that child is active again.

Put a rule on the nearest group that holds every value it compares. A rule that compares the items
of a list goes on the array, as [Rules across items](/guide/arrays#rules-across-items) shows.

### Why not a refinement

Zod can write the same rule with `refine` on the object schema, and formtree accepts it, as the next
section shows. `validate` covers two cases a refinement cannot.

- **It sees children.** A refinement receives only the keys of its own schema. Once a key moves
  into `children`, to be turned off, to get dependencies or a server check, or to be reused, a
  refinement can no longer read it. In [Role-based Rules](/examples/role-based-rules) the password
  is a child, because its minimum length depends on the role, so the repeated password is checked by
  `validate`.
- **It does not wait for other keys.** Zod runs an object's refinement only once every required key
  holds a value, so its error waits for keys the rule does not compare. `validate` reports a
  mismatch as soon as the compared values disagree.

### The same rule in the schema

A rule that compares keys of one schema can also stay in that schema, written with Zod's `refine`.
The issue's `path` puts the error on a key, where it is stored like any schema error, with the
source `'schema'`. Below, a user repeats the password before typing it.

```ts twoslash
// @noStaticSemanticInfo
import { createForm, defineGroup } from '@formtree/core'
import { z } from 'zod'

export const passwordGroup = defineGroup({
  schema: z
    .object({
      password: z.string({ error: 'Password is required' }).min(8, { error: 'Use at least 8 characters' }),
      confirmPassword: z.string({ error: 'Repeat the password' }),
    })
    .refine(value => value.confirmPassword === value.password, {
      path: ['confirmPassword'],
      error: 'Passwords do not match',
    }),
})

const form = createForm(passwordGroup)
const password = form.field('password')
const confirmPassword = form.field('confirmPassword')

confirmPassword.setValue('long-secret')
password.setValue('short')
password.setValue('long-secret')
```

1. After the repeated password, `password` is still `undefined`. Zod skips the refinement, and the
   group reports only "Password is required".
2. After `'short'`, both keys hold a string, so the refinement runs next to `min(8)`. The group
   reports "Use at least 8 characters" and "Passwords do not match".
3. After `'long-secret'`, both pass.

Step 1 is the wait. Zod skips an object's refinement while a required key is `undefined` or of the
wrong type, unless its `when` option says otherwise. A refinement also receives the parsed value,
with transforms applied.

`superRefine` reports several errors from one function, each with its own path.

```ts twoslash
// @noStaticSemanticInfo
import { defineGroup } from '@formtree/core'
import { z } from 'zod'

export const changePasswordGroup = defineGroup({
  schema: z
    .object({
      currentPassword: z.string({ error: 'Enter your current password' }),
      newPassword: z.string({ error: 'Enter a new password' }).min(8, { error: 'Use at least 8 characters' }),
      confirmPassword: z.string({ error: 'Repeat the new password' }),
    })
    .superRefine((value, context) => {
      if (value.newPassword === value.currentPassword) {
        context.addIssue({ code: 'custom', path: ['newPassword'], message: 'Choose a new password' })
      }
      if (value.confirmPassword !== value.newPassword) {
        context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' })
      }
    }),
})
```

Keep the rule in the schema when it compares keys of that schema only and the schema should be
complete on its own, for example because the server parses the same one.

## The group's state

A group's state summarizes its subtree. `dirty` is true when any value inside differs from its
initial value, `valid` when nothing inside has an error, and `validating` while a check inside
runs. A "Save" button that lights up only when its card has changes reads `card.state.dirty`.

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
