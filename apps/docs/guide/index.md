# Introduction

formtree builds a form from definitions, the way a router builds an app from routes. A
definition is a typed unit with no state: a field, a group or an array, declared once at module
level. `createForm` turns a definition into a form whose state lives in one place, and every
position in that tree is a node you can read, write, validate and submit.

Each section below is a problem that forms built around one root schema run into, and what
formtree does instead.

## Saving part of a form

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

Submitting `delivery` validates the delivery step and nothing else. Errors in the payment step
stay hidden until that step is submitted. The same call works on a row, a card or a single field.

## The output of a part

A Standard Schema validates a value as a whole; it cannot run one branch of an object schema. A
library that holds one root schema can check the fields of a step, but it cannot hand the step
an output of its own, with trims and transforms applied.

formtree builds the tree from definitions, so a step with a definition runs its own schema, and
its submit handler receives its own output. [How It Works](/guide/how-it-works#defined-nodes-and-lens-nodes)
shows which nodes have one.

## Forms that change shape

A checkout asks for card details only when the customer pays by card. With one schema, the
required fields of each branch become conditions in a refinement, components watch the payment
method to reset the other branch, and the payload sends whatever was not reset.

In formtree a group decides which children take part with
[`activeWhen`](/guide/conditional-branches). An inactive branch is not validated and stays out
of the output, and its values are kept for a customer who switches back.

## Types for large and recursive forms

A typed path is usually checked against the union of every path in the form. The union grows
with the form and has no end for a recursive shape, so large forms end in "Type instantiation is
excessively deep", or their paths are not typed at all.

A formtree node takes its [type](/guide/types) from its own definition, and a path is checked
one segment at a time, as far as it is written. A component that renders an address knows the
address definition and nothing about the form around it.

## State tied to rendering

When a field registers on mount and unregisters on unmount, whether a value exists depends on
what is on screen. Leaving a wizard step can drop its data, and a field in a dialog can attach
itself to the nearest form, which may be the page behind it.

In formtree, mounting and unmounting change nothing. The tree exists from `createForm` on, and a
component finds its node by path or by [definition](/vue/node-context), never by proximity.

## Checks against a server

"Is this username taken" is a question for a server, not a schema rule. Wired by hand, it is a
watcher that sets an error, with no debounce, no cancellation and a submit that does not wait for
it.

In formtree the check is part of the definition. [`validateAsync`](/guide/fields#asynchronous-checks)
is debounced, cancelled by the next change, cached per value and awaited by a submit.

## Errors that overwrite each other

When all errors of a field share one slot, a server error disappears on the next schema run, and
an asynchronous result can hide a schema error.

In formtree every error has one [producer](/guide/validation#four-producers): a schema, a rule, a
check or the server. Each producer changes only its own errors.

These answers follow from ten [design rules](/guide/design-rules).
