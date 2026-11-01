<script setup>
import LifecycleTimeline from '../.vitepress/components/lifecycle-timeline.vue'
import LifecycleTree from '../.vitepress/components/lifecycle-tree.vue'
</script>

# Lifecycle

This page follows one field of the checkout, `delivery.address.city`, through a change, a blur and
a submit of the step that holds it.

```ts twoslash
import { createForm } from '@formtree/core'
import { checkoutGroup } from './forms/checkout'

declare function saveDelivery(delivery: unknown): Promise<void>
// ---cut---
const form = createForm(checkoutGroup, {
  deps: { cartId: 'cart_42', countries: ['DE', 'NL'] },
  initialValue: {
    delivery: { method: 'shipping', address: { country: 'DE' } },
    payment: { method: 'card' },
  },
})
const city = form.field('delivery.address.city')

city.setValue('Berlin')
city.blur()
await form.group('delivery').handleSubmit(saveDelivery)()
```

<LifecycleTimeline />

## A change

`setValue` runs these steps, in this order, before it returns.

1. **Write the draft.** The value is written without mutating the old one, so `city`, `address`,
   `delivery` and the root get new objects, and every other branch keeps its own. Writing the value
   a field already holds stops here. Errors set with `clearOn: 'change'` on the field are removed.
2. **Walk the tree.** From the root down, `activeWhen` decides which children take part and
   `childDeps` gives each one its dependencies. Inactive branches are skipped, and the errors
   their schemas and rules produced are dropped.
3. **Run schemas and rules.** Every defined node whose value or dependencies changed runs its
   schema and its `validate` rule, a parent before its children. A node whose value and
   dependencies are the same objects as before keeps its result. Each run replaces only the errors
   it produced before, so the order never changes a result.
4. **Hold or start asynchronous checks.** A `validateAsync` check whose node changed waits while a
   schema or rule error sits on its node or below it, whichever node produced the error. Once none
   is left, it reuses a cached result for the same output, starts after its debounce when it runs
   on change, or waits for a blur or a submit.
   [Which check runs first](/guide/validation#which-check-runs-first) shows this on one group.
5. **Notify subscribers,** once. Inside `batch`, once for all of its writes.

<LifecycleTree />

`city` is a key of the schema of `address`, so the schema of `address` reports its errors. The
schemas and rules of `delivery` and of the root run again as well, because their values are new
objects. The other branches keep their results, and the branches the data turned off are not
validated at all.

## A blur

`blur` marks the field as touched, which is when the default display mode starts showing its
errors. Checks that run on blur and belong to the field or to one of its ancestors start after
their debounce. Values are not validated again; the change already did that.

## A submit

The function `handleSubmit` returns runs the same steps every time.

1. If the node is already submitting or is in an inactive branch, return `'skipped'` without
   calling the handler. A double click or an Enter key that lands together with a click submits
   once, and a branch the data turned off never hands over an output.
2. Mark the node as submitting, count the submit, and remove the errors set with
   `clearOn: 'submit'` inside it. Validate the form, start the checks inside the subtree that have
   not run yet without waiting for their debounce, and wait for every check inside it.
3. If an error inside the subtree remains, reveal the errors of the subtree, move focus to the
   first one, call `onInvalid` and return `'invalid'`.
4. Call the handler with the output of the node.
5. If the handler returns errors, store them as server errors relative to the node, move focus to
   the first one and return `'rejected'`.
6. Otherwise return `'success'`.

`state.submitting` is `true` from step 2 until the end, and `state.submitCount` counts the submits
that got past step 1. If the handler throws, `submitting` ends and the error is thrown from the
submit function.

## What a submit covers

A submit covers its node and everything below it, and nothing above or beside it. In the tree
above, submitting `delivery` checks the delivery method and the address; `store` and `state` are
inactive, so they do not count.

- **Every error inside the subtree counts,** whoever produced it. A rule on the root that puts an
  error on `delivery.address.city` blocks a submit of `delivery`, of `address` and of `city`.
- **Errors outside the subtree do not.** The root's `acceptTerms` error does not block the
  delivery step, and it stays hidden until the field is touched or the root is submitted.
- **Checks of ancestors do not run.** Step 2 runs the checks inside the subtree; a check that
  belongs to the root runs when the root is submitted.

The handler receives the output of the submitted node. For a node in its parent's schema, such as
`city`, that is its validated input, because a part of a schema cannot run on its own.

## Submitting a part, then the whole

A wizard submits each step as the user moves on, and the last step submits the root. The root's
submit runs a validation pass like any other, but a node whose value and dependencies have not
changed since keeps its results, and a check that already ran for the same output keeps its
answer, so only what changed after the step's submit runs again.

Two things carry over from the step's submit.

- **Errors its handler returned stay** until their value changes, so they block the root's
  submit too. The server's answer still stands until the user edits the value.
- **Errors set with `clearOn: 'submit'` go** at the start of every submit that contains them, the
  root's included.
