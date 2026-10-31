# Introduction

formtree builds a form from definitions, the way a router builds an app from routes. A
definition is a typed unit with no state: a field, a group or an array, declared once at module
level. `createForm` turns a definition into a form whose state lives in one place, and every
position in that tree is a node you can read, write, validate and submit.

Most form libraries validate and submit at the root. Saving one step of a checkout, one card of
a settings page or one row of a table then means checking its fields one by one:

```ts
const results = await Promise.all([
  validateField('delivery.method'),
  validateField('delivery.address.street'),
  validateField('delivery.address.city'),
])

if (results.every(result => result.valid)) {
  goToPayment()
}
```

In formtree the step is a node of the tree, and it submits the same way the whole form does:

```ts twoslash
declare function goToPayment(): void
// ---cut---
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
})

const delivery = form.group('delivery')
const submitDelivery = delivery.handleSubmit(() => goToPayment())
```

Submitting `delivery` validates the delivery step and nothing else. Its handler receives the
validated output of that step, and errors in the payment step stay hidden until that step is
submitted. The same call works on a row, a card or a single field.

## What you get

**Every node submits.** The root, a step, a card, a row and one field share the same surface:
`state`, `validate`, `handleSubmit` and `reset`. A node validates its own subtree and hands its
own output to the handler.

**Types come from definitions.** A node takes its type from its own definition, never from a
union of every path in the form. `form.field('contact.email')` is checked one segment at a time,
so a large or recursive form does not slow the type checker down.

**The shape follows the data.** A branch the data turns off, such as card details when the
customer pays by invoice, is not validated and stays out of the output. Its values are kept,
so a customer who switches back finds what they typed.

**State does not depend on rendering.** Mounting or unmounting a component never adds, removes
or resets a value. A checkout step that is not on screen still holds its data.

**Nothing is guessed.** Empty is `undefined`, a node is found by its path or its definition,
and every error has exactly one producer. [Design Rules](/guide/design-rules) lists these rules.

## What it covers

[Getting Started](/guide/getting-started) builds a first form. [How It Works](/guide/how-it-works)
explains definitions, forms and nodes, and the three types every node has. The building blocks
are [fields](/guide/fields), [groups](/guide/groups) and [arrays](/guide/arrays).
[Conditional branches](/guide/conditional-branches), [dependencies](/guide/dependencies) and
[recursive definitions](/guide/recursive-definitions) cover forms whose shape changes with the
data or with configuration from a server. [Validation](/guide/validation),
[Submitting](/guide/submitting) and [Errors and Focus](/guide/errors-and-focus) describe what
happens when a value changes and when a node is submitted.

The core works without a framework. The [Vue adapter](/vue/) adds reactivity, a node context
and `v-model` bindings.
