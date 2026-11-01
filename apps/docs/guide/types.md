# Types

A node's type comes from its own definition. The type of the whole form is never carried into a
component, and no union of every path is computed. The
[Types](/api/@formtree/core/#types) section of the API reference lists every type helper.

## The draft type

```ts twoslash
import type { DraftOf } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

type CheckoutDraft = DraftOf<typeof checkoutGroup>
// {
//   acceptTerms?: true
//   contact: { fullName?: string, email?: string }
//   delivery: { method?: 'shipping' | 'pickup', address: { … }, store?: string }
//   payment: { method?: 'card' | 'invoice', card: { … }, invoice: { … } }
//   lineItems: Array<{ id?: number, sku?: string, quantity?: number }>
//   promoCode?: string
// }
```

Groups and arrays that a definition declares are always in the draft, so `contact` is `{}` and
`lineItems` is `[]` before anything is typed. Values are optional. This is the type of what the
user is in the middle of typing, and the output type is what remains once it is valid.

## Paths

`field`, `group` and `array` take one key or a dotted path. A dotted path is checked one segment
at a time, and each segment suggests the keys of the level before it.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE'] },
})
// ---cut---
// @errors: 2345
form.field('delivery.adress.city')
```

Libraries that check a path against the union of every path in the form compute that union for
each check. It grows with the size of the form, has no end for recursive shapes and eventually
produces "Type instantiation is excessively deep". Walking the written path costs as much as the
path is long.

## Components know their definition

A component that renders an address needs the address node and nothing about the form around it.

```ts twoslash
import type { NodeOf } from '@formtree/core'
import { addressGroup } from './forms/delivery'

function renderAddress(address: NodeOf<typeof addressGroup>) {
  address.field('city').state.value
  //                          ^?
}
```

The same component works in a checkout, in an account page and in a returns form, as long as
the address comes from `addressGroup`. In Vue and React, `useFormNode(addressGroup)` gives the
component this node without a prop, as Node Context shows for [Vue](/vue/node-context) and
[React](/react/node-context).

## Trade-offs

**Suggestions come one level at a time.** Typing `'delivery.'` suggests the keys of `delivery`.
The full list of paths is never offered at once, because it is never computed.

**Reading a value includes `undefined`.** A draft value may be empty, so an input binds
`value ?? ''`. The output type, which a handler receives, has no `undefined` where the schema
requires a value.

**A recursive definition needs one annotation.** TypeScript cannot infer the type of a constant
that refers to itself, as [Recursive Definitions](/guide/recursive-definitions) shows.

**Definitions with dependencies take two calls.** `defineGroupWithDeps<Deps>()({ ... })` lets you
write the dependency type and still have the rest inferred.

**Option order matters.** `schema` and `children` come before `activeWhen`, `childDeps` and
`validate`, so the callbacks are typed from them.

**`activeWhen` and `childDeps` see the group's own schema only.** They cannot read a child's
value. A value a decision depends on lives in the parent's schema.

**Node types are invariant.** A `FieldNode<'card' | 'invoice'>` is not a `FieldNode<string>`.
A generic text input could otherwise write any string into a field that only accepts two.

**`items[i]` is a runtime index.** With `noUncheckedIndexedAccess`, it may be `undefined`.
Prefer holding an item node over indexing again.
