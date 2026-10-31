# Dependencies

Some rules need values that are not part of the form. The countries a store ships to come from a
server. A promo code is checked against a cart id. An admin needs a longer password than a
member. These values are dependencies, `deps` for short: the form does not edit them, but its
rules read them.

Dependencies work like the parameters of a function. A definition declares what it takes, and
the place that uses it passes it in: `createForm` for the root, the parent's `childDeps` for a
child. A value belongs in dependencies when the form reads it, the user never edits it and it
is not part of the output. A value the user edits belongs in a schema.

## Declaring what a definition needs

A definition that reads dependencies says so in its type, with the `WithDeps` variant of its
function:

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

`defineGroupWithDeps<Deps>()` and `defineFieldWithDeps<Deps>()` take the type of the dependencies
first and the options in a second call. TypeScript cannot take one type argument from you and
infer the others, so the dependencies get a call of their own, and the schema and the rules are
still inferred. A definition without dependencies uses the plain `defineGroup` or `defineField`.

The definition does not know where its dependencies come from. It only states what it needs, so
it can be used in any form that provides them.

## Where dependencies are read

Every function in the options of `defineFieldWithDeps` and `defineGroupWithDeps` receives the
definition's `deps`.

## Passing dependencies down

Dependencies flow from the root down, one level at a time. A group gives each child that needs
dependencies what it needs with `childDeps`:

```ts twoslash
import { defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'
import { addressGroup } from './forms/checkout'

export const deliveryGroup = defineGroupWithDeps<{ countries: ReadonlyArray<string> }>()({
  schema: z.object({ method: z.enum(['shipping', 'pickup']) }),
  children: { address: addressGroup },
  activeWhen: { address: ({ value }) => value.method === 'shipping' },
  childDeps: {
    address: ({ deps }) => ({ countries: deps.countries }),
  },
})
```

`childDeps` has one entry per child that needs dependencies. Each entry is a function that
receives `{ value, deps }` and returns that child's dependencies, typed by what the child
declared:

- `deps` holds the group's own dependencies. A group can only pass on what it has, so
  `deliveryGroup` declares `countries` although only its address reads them. A child that needs
  exactly the group's dependencies gets them with `({ deps }) => deps`.
- `value` is the draft of the group's own schema, without its children, as in `activeWhen`.

`childDeps` is required as soon as a child needs dependencies, and it lists exactly those
children. Leaving it out is a type error, so a definition cannot end up in a form that forgets to
provide what it needs. Children without dependencies are not listed.

The functions run again after every change, for active children only. A result equal key by key
to the previous one keeps the previous object, so a function that returns a new object each time
rebuilds nothing below it.

For an array, the entry in `childDeps` gives the same dependencies to every item. An item cannot
get dependencies of its own: a value that differs per item belongs in the item's schema. The
array's own `validate` receives none; a rule that needs them goes on the parent group.

## Dependencies from the parent's value

A parent can turn one of its values into a dependency of a child, which keeps the child unaware
of where the value came from.

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
dependencies of its own: it supplies the child's from its value. Choosing `admin` rebuilds the
password schema, and an 8-character password becomes invalid at once.
[Role-based Rules](/examples/role-based-rules) shows it live.

## Giving the root its dependencies

The root's dependencies are an option of `createForm`. It is required when the root needs
dependencies and not accepted otherwise.

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

In Vue, `useForm` accepts a ref or a getter and calls `setDeps` when it changes. See
[Vue](/vue/#dependencies).

## When dependencies change

`setDeps` replaces the root's dependencies, and every `childDeps` below runs again. A node whose
new dependencies equal the previous ones key by key keeps the previous object, so a function
that returns a new object each time rebuilds nothing. For a node whose dependencies did change:

- a schema built from them is rebuilt, and the node is validated again with it;
- `activeWhen` decides again which children take part;
- an asynchronous check drops its cached results and its error, and runs again: at once for a
  check on change, otherwise on its next trigger or at submit.

Values are never touched. A dependency can make a value invalid, as the role does to the
password above, but it does not change it.

## One direction

Dependencies flow from a parent to its children, never between siblings and never upwards. A
value that two siblings both need moves into their parent's schema, and the parent passes it to
each of them. Reading a definition's options then tells you everything its rules depend on.

## Types

```ts twoslash
import type { DepsOf } from '@formtree/core'
import { passwordField } from './forms/account'

type PasswordDeps = DepsOf<typeof passwordField>
//   ^?
```

`accountGroup` from the example above has no dependencies of its own, because it supplies its
child's from its value: `DepsOf<typeof accountGroup>` is `undefined`, and `createForm(accountGroup)`
takes no `deps` option.
