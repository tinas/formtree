# React

`@formtree/react` connects the core to React's rendering and lifecycle. It adds no behaviour of
its own: validation, visibility and submitting work exactly as in the [guide](/guide/).

::: code-group

```sh [pnpm]
pnpm add @formtree/react zod
```

```sh [npm]
npm install @formtree/react zod
```

```sh [yarn]
yarn add @formtree/react zod
```

:::

The package re-exports the core, so definitions and types are imported from `@formtree/react` as
well. It needs React 18.3 or later.

## useForm

```tsx
// contact-card.tsx
import { useForm } from '@formtree/react'
import { contactGroup } from './forms/checkout'

export function ContactCard() {
  const form = useForm(contactGroup)
  const submit = form.handleSubmit(async contact => {
    await saveContact(contact)
  })

  return (
    <form id={form.id} noValidate onSubmit={submit}>
      {form.state.dirty && <p>Unsaved changes</p>}
      <button type="submit" aria-busy={form.state.submitting}>
        Save
      </button>
    </form>
  )
}
```

`useForm` takes the same arguments as `createForm` and returns the same form. It creates the form
once, on the first render, and keeps it for the life of the component.

| Behaviour | Description                                                                                                                               |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Rendering | The component re-renders when the root's state changes. See [below](#reading-node-state).                                                 |
| Ids       | The form id comes from `useId()`, so server and client render agree.                                                                      |
| Lifecycle | When the component unmounts, pending checks are cancelled. Under `StrictMode`, the form keeps working after React runs its effects twice. |
| Context   | `useForm` provides nothing. See [Node Context](/react/node-context).                                                                      |

## Reading node state

A component re-renders for the nodes it subscribed to, and only for those:

- `useForm` subscribes to the root,
- `useFormNode` to the node it returns,
- `useField` to its field,
- `useNodeState(node)` to any node you pass it.

The root's state changes whenever a value changes, so values read from `form.state` are always
current. The state of another node can change while the root's does not: an error appears on a
field, or a branch becomes active. Read that state through `useNodeState`:

```tsx
const form = useForm(checkoutGroup, { deps })
const isPickup = useNodeState(form.field('delivery.store')).active
```

Reading `form.field('delivery.store').state` directly shows the state of the last render, which
may be out of date.

## Dependencies

Write `deps` inline, as a plain value. When it changes, the form receives it through `setDeps`.

```tsx
const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: fetchShippingCountries })

const form = useForm(checkoutGroup, {
  deps: { cartId: cart.id, countries: countriesQuery.data ?? [] },
})
```

A new object on every render is fine: dependencies equal key by key to the current ones change
nothing, so nothing is validated again and nothing re-renders.
