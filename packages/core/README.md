# @formtree/core

[![npm](https://img.shields.io/npm/v/@formtree/core)](https://www.npmjs.com/package/@formtree/core)
[![CI](https://github.com/tinas/formtree/actions/workflows/ci.yml/badge.svg)](https://github.com/tinas/formtree/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@formtree/core)](https://github.com/tinas/formtree/blob/main/LICENSE)

The framework-agnostic engine of [formtree](https://form-tree.netlify.app/guide/?framework=javascript), a headless form library for TypeScript. You describe what a form holds and which rules it follows in a definition, and every part of the form, from a wizard step to a single field, validates and submits on its own. It has no runtime dependencies and runs without a DOM, so the same definition also validates a request on the server.

Vue and React apps install [`@formtree/vue`](https://www.npmjs.com/package/@formtree/vue) or [`@formtree/react`](https://www.npmjs.com/package/@formtree/react) instead. Each includes this package.

## Installation

```sh
pnpm add @formtree/core zod
```

The examples use [Zod](https://zod.dev), and any [Standard Schema](https://standardschema.dev) library works in its place.

## A Checkout in Steps

Each part of a form can be a definition of its own, and every node of the form validates and submits on its own:

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

`continueToPayment` validates only the delivery step and passes its parsed values to `saveDelivery`, so the user is not stopped by a payment they have not reached. `placeOrder` validates the whole checkout.

Every node has a `state` with its value, errors, and flags, and `subscribe` calls a listener when that state changes, which is how inputs stay in sync without a framework. [Quick Start](https://form-tree.netlify.app/guide/quick-start?framework=javascript) binds a form to plain inputs step by step.

## Requirements

TypeScript 5.4 or later. The package is published as ES modules.

## License

MIT
