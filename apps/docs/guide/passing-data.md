# Dependencies

Some rules read values the user never edits. The countries a store ships to come from a server, a
promo code is checked against the current cart, and an admin needs a longer password than a member.
These values are dependencies, `deps` for short. The form does not hold them, but its rules read
them.

Dependencies work like the parameters of a function. A definition declares what it takes, and the
place that uses it passes it in. A value belongs in dependencies when rules read it, the user never
edits it and it is not part of the output. A value the user edits belongs in a schema.

## A rule that needs data from the server

The store ships to a few countries, and the list comes from an API so that adding a country does
not need a release. The address step has to reject a country that is not on the list.

The list is not known at module level, where definitions are written. Building the schema later,
inside the screen that loads the list, ties the rule to that screen, and the address can no longer
be declared once and imported by every form that asks for one.

A definition that needs outside values declares them in its type, with the `WithDeps` variant of
its function.

```ts twoslash
import { defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'

export const addressGroup = defineGroupWithDeps<{ countries: ReadonlyArray<string> }>()({
  schema: ({ deps }) =>
    z.object({
      street: z.string({ error: 'Street is required' }),
      country: z
        .string({ error: 'Country is required' })
        .refine(country => deps.countries.includes(country), { error: 'We do not ship to this country yet' }),
    }),
})
```

`addressGroup` still lives at module level. It states that it needs a list of countries and does
not know where the list comes from, so any form that provides one can use it. Every function in the
options of a `WithDeps` definition receives the same `deps`.

`defineGroupWithDeps<Deps>()` and `defineFieldWithDeps<Deps>()` take the type of the dependencies
first and the options in a second call. TypeScript cannot take one type argument from you and infer
the others, so the dependencies get a call of their own while the schema and the rules are still
inferred. A definition without dependencies uses the plain `defineGroup` or `defineField`.

## Passing data to a nested part

The address sits in the delivery step, which sits in the checkout, and only the checkout is created
with the list of countries. The address must not reach up for it, or it could only be used inside
this checkout. A group hands dependencies to the children that need them with `childDeps`.

```ts twoslash
import { defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'
import { addressGroup } from './forms/delivery'

export const deliveryGroup = defineGroupWithDeps<{ countries: ReadonlyArray<string> }>()({
  schema: z.object({ method: z.enum(['shipping', 'pickup']) }),
  children: { address: addressGroup },
  activeWhen: { address: ({ value }) => value.method === 'shipping' },
  childDeps: {
    address: ({ deps }) => ({ countries: deps.countries }),
  },
})
```

`deliveryGroup` declares `countries` although only its address reads them, because a group can only
pass on what it has. Each level states what it needs and what it passes, so the definitions alone
show the path of the list from the checkout down to the country check.

`childDeps` has one entry per child that needs dependencies. Each entry receives `{ value, deps }`
and returns that child's dependencies, typed by what the child declared. `deps` holds the group's
own dependencies, so a child that needs exactly those gets them with `({ deps }) => deps`. `value`
is the draft of the group's own schema, without its children, as in `activeWhen`.

`childDeps` is required as soon as a child needs dependencies, and it lists exactly those children.
Leaving it out is a type error, so a definition cannot end up in a form that forgets to provide what
it needs.

The functions run again after every change, for active children only. A result equal key by key to
the previous one keeps the previous object, so a function that returns a new object each time
rebuilds nothing below it.

For an array, the entry in `childDeps` gives the same dependencies to every item. A value that
differs per item belongs in the item's schema, not in dependencies. The array's own `validate`
receives none, so a rule that needs them goes on the parent group.

## A rule that depends on another answer

An account form asks for a role and a password. Admins need at least 12 characters, members 8. The
role is in the same form, so the password rule depends on the user's own answer.

Written as a refinement on the whole account object, the rule moves away from the password. The
password can no longer be used without the role next to it, and Zod runs the refinement only once
every key of the object has a value.

A parent can turn one of its values into a dependency of a child instead.

```ts twoslash
import { defineFieldWithDeps, defineGroup } from '@formtree/core'
import { z } from 'zod'

export const passwordField = defineFieldWithDeps<{ minLength: number }>()({
  schema: ({ deps }) =>
    z
      .string({ error: 'Password is required' })
      .min(deps.minLength, { error: `Use at least ${deps.minLength} characters` }),
})

export const accountGroup = defineGroup({
  schema: z.object({
    role: z.enum(['member', 'admin'], { error: 'Choose a role' }),
  }),
  children: { password: passwordField },
  childDeps: {
    password: ({ value }) => ({ minLength: value.role === 'admin' ? 12 : 8 }),
  },
})
```

`passwordField` knows about a minimum length and nothing about roles. `accountGroup` needs no
dependencies of its own, because it supplies the child's from its value. A 10-character password is
valid for a member. Switching the role to admin rebuilds the password schema, and the same password
is invalid at once, without a watcher and without touching the value.
[Role-based Rules](/examples/role-based-rules) shows it live.

Use this when the child owns the rule and only a parameter of it comes from the parent. A rule that
compares two values, such as a repeated password, is a
[`validate`](/guide/groups#rules-across-keys) rule on the group instead.

## Data that arrives after the form

The checkout renders at once, while the request for the countries is still running. The form does
not wait. It is created with what is known and given the list when it arrives.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

declare function fetchShippingCountries(): Promise<Array<string>>
// ---cut---
const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: [] },
})

fetchShippingCountries().then(countries => {
  form.setDeps({ cartId: 'cart_42', countries })
})
```

The root's dependencies are an option of `createForm`, required when the root needs dependencies
and not accepted otherwise. The adapters call `setDeps` for you. In Vue, `useForm` follows a ref or
a getter ([Vue](/vue/#dependencies)), and in React it receives each new `deps` value
([React](/react/#dependencies)).

`setDeps` replaces the root's dependencies, and every `childDeps` below runs again. For a node whose
dependencies changed, three things happen.

- A schema built from them is rebuilt, and the node is validated again with it.
- `activeWhen` decides again which children take part.
- An asynchronous check drops its cached results and its error, and runs again, at once for a check
  on change and otherwise on its next trigger or at submit.

Values are never touched. When a later list drops a country the customer already picked, the
country stays and turns invalid instead of disappearing.

## A value two siblings need

Pickup stores depend on the country too. In the delivery step, the address and the store are
siblings, and the store cannot read the country out of the address, because dependencies flow from
a parent to its children, never between siblings and never upwards.

The value moves to where both can be reached from. Ask for the country in the delivery step's own
schema, and pass it to the address and to the store with `childDeps`. A definition's options then
show everything its rules depend on.

## Types

```ts twoslash
import type { DepsOf } from '@formtree/core'
import { passwordField } from './forms/account'

type PasswordDeps = DepsOf<typeof passwordField>
//   ^?
```

`accountGroup` from the example above supplies its child's dependencies from its value and has none
of its own. `DepsOf<typeof accountGroup>` is `undefined`, and `createForm(accountGroup)` takes no
`deps` option.
