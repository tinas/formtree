# formtree

[![npm](https://img.shields.io/npm/v/@formtree/core)](https://www.npmjs.com/package/@formtree/core)
[![CI](https://github.com/tinas/formtree/actions/workflows/ci.yml/badge.svg)](https://github.com/tinas/formtree/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/tinas/formtree)](LICENSE)

A headless form library for TypeScript. You describe what a form holds and which rules it follows in a definition, and formtree keeps track of the values, validates them, and hands the valid result to your submit function. It renders nothing, so the markup stays yours.

**[Read the documentation](https://form-tree.netlify.app/guide/)**

## A Form Built from Parts

Forms are made of parts, so a definition can hold a smaller definition for each part, each with its own rules. That nesting is the tree in formtree's name. When you create a form from a definition, every part becomes a node with its own value and errors, and each node can be validated and submitted on its own.

```ts
import { createForm, defineGroup } from '@formtree/core'
import { z } from 'zod'
import { saveDelivery, submitOrder } from './api'

const deliveryGroup = defineGroup({
  schema: z.object({
    street: z.string().trim().min(1, { error: 'Enter a street' }),
    city: z.string().trim().min(1, { error: 'Enter a city' }),
  }),
})

const paymentGroup = defineGroup({
  schema: z.object({ method: z.enum(['card', 'invoice'], { error: 'Choose a payment method' }) }),
})

const checkoutForm = defineGroup({ children: { delivery: deliveryGroup, payment: paymentGroup } })

const form = createForm(checkoutForm)
const continueToPayment = form.group('delivery').handleSubmit(saveDelivery)
const placeOrder = form.handleSubmit(submitOrder)
```

The button of the delivery step checks only that step, so the user is not stopped by a payment they have not reached, and the order button checks the whole checkout. The same idea covers a row of a list that saves on its own, a part that applies only after a certain answer, and a value only the server can check.

## Packages

| Package                             | For                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| [`@formtree/vue`](packages/vue)     | Vue 3.5 or later, with fields for `v-model` and Vue Devtools                      |
| [`@formtree/react`](packages/react) | React 18.3 or later, with hooks that re-render a component only for what it reads |
| [`@formtree/core`](packages/core)   | Plain TypeScript, and the engine both adapters build on                           |

Each adapter includes the core, so an app installs one package. formtree validates with any [Standard Schema](https://standardschema.dev) library and needs TypeScript 5.4 or later.

## Contributing

Questions, bug reports, and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) explains how to set up the repository and what a pull request needs.

## License

[MIT](LICENSE)
