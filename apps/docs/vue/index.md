# Vue

`@formtree/vue` connects the core to Vue's reactivity and lifecycle. It adds no behaviour of its
own: validation, visibility and submitting work exactly as in the [guide](/guide/).

::: code-group

```sh [pnpm]
pnpm add @formtree/vue zod
```

```sh [npm]
npm install @formtree/vue zod
```

```sh [yarn]
yarn add @formtree/vue zod
```

:::

The package re-exports the core, so definitions and types are imported from `@formtree/vue` as
well.

## useForm

```vue
<script setup lang="ts">
import { useForm } from '@formtree/vue'
import { contactGroup } from './forms/checkout'

const form = useForm(contactGroup)

const submit = form.handleSubmit(async contact => {
  await saveContact(contact)
})
</script>

<template>
  <form :id="form.id" novalidate @submit.prevent="submit">
    <p v-if="form.state.dirty">Unsaved changes</p>
    <button type="submit" :aria-busy="form.state.submitting">Save</button>
  </form>
</template>
```

`useForm` takes the same arguments as `createForm` and returns the same form, with nodes whose
`state` is reactive. Read `node.state` in a template or a `computed` and it updates when that
node changes.

| Behaviour  | Description                                                                               |
| ---------- | ----------------------------------------------------------------------------------------- |
| Reactivity | One subscription per form. A component re-renders only when a node it read has changed.   |
| Ids        | Inside a component, the form id comes from `useId()`, so server and client render agree.  |
| Lifecycle  | When the component's scope ends, the subscription stops and pending checks are cancelled. |
| Context    | `useForm` provides nothing. See [Node Context](/vue/node-context).                        |

`useForm` also works in an `effectScope` or a Pinia setup store, wherever there is an active
scope to clean up with.

## App defaults

Install `createFormtree` once to give every form of the app the same defaults, such as how errors
are translated and how focus moves, and to see the forms in Vue Devtools while developing:

```ts
createApp(App).use(createFormtree()).mount('#app')
```

[App Defaults](/vue/app-defaults) covers each option and the devtools.

## Dependencies

The `deps` option accepts a plain value, a ref or a getter. When it is a ref or a getter, the
form follows it with `setDeps`.

```ts
const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: fetchShippingCountries })

const form = useForm(checkoutGroup, {
  deps: () => ({ cartId: cart.value.id, countries: countriesQuery.data.value ?? [] }),
})
```

Schemas built from dependencies are rebuilt only when the values they read change, so a getter
that returns a new object on every run does not cause extra validation.
