# Dependencies

Some rules need values that are not part of the form. The countries a store ships to come from a
server. A promo code is checked against a cart id. An admin needs a longer password than a
member. These values are dependencies, `deps` for short: the form does not edit them, but its
rules read them.

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

| Option              | Receives                     | Use                                                 |
| ------------------- | ---------------------------- | --------------------------------------------------- |
| `schema`            | `{ deps }`                   | build the schema from configuration                 |
| `validate`          | `{ value, deps }`            | rules that compare values with configuration        |
| `validateAsync.run` | `(output, { signal, deps })` | ask a server about the value, with ids from outside |
| `activeWhen`        | `{ value, deps }`            | branches that exist only for some configurations    |
| `childDeps`         | `{ value, deps }`            | pass dependencies down to children                  |

A schema built from dependencies is rebuilt only when those dependencies change, compared key by
key, so a function that returns a new object each time does not rebuild it. The nodes it covers
are validated again with the new schema.

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

`childDeps` is required as soon as a child needs dependencies, and it lists exactly those
children. Leaving it out is a type error, so a definition cannot end up in a form that forgets to
provide what it needs. Children without dependencies are not listed.

For an array, the entry in `childDeps` gives the same dependencies to every item.

## Dependencies from the parent's value

`childDeps` also receives the parent's own draft. A parent can turn one of its values into a
dependency of a child, which keeps the child unaware of where the value came from.

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

`setDeps` replaces the root's dependencies and recomputes `childDeps` down the tree. In Vue,
`useForm` accepts a ref or a getter and calls `setDeps` when it changes. See [Vue](/vue/#dependencies).

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
