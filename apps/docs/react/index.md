# React

`@formtree/react` connects the core to React's rendering and lifecycle. It adds no behaviour of
its own, so validation, visibility and submitting work exactly as in the [guide](/guide/).

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
import { saveContact } from './api'
import { contactGroup } from './forms/contact'

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

## App defaults

How errors become text and how focus moves are usually the same for every form of an app. Give
them once with `FormtreeProvider`.

```tsx
// app.tsx
import type { FormError } from '@formtree/react'
import { FormtreeProvider } from '@formtree/react'
import i18n from 'i18next'
import { Checkout } from './checkout'

export function App() {
  return (
    <FormtreeProvider formatError={formatError} focusElement={focusSmoothly}>
      <Checkout />
    </FormtreeProvider>
  )
}

function formatError(error: FormError): string {
  return i18n.t(error.code, { ...error.params })
}

function focusSmoothly(element: HTMLElement): void {
  element.focus({ preventScroll: true })
  element.scrollIntoView({ block: 'center' })
}
```

Every form created with `useForm` below the provider starts from these defaults. An option passed
to `useForm` wins, and one left `undefined` falls back to the default. A form reads them once,
when it is created, like its other options.
[`FormtreeProviderProps`](/api/@formtree/react/interfaces/FormtreeProviderProps) lists what the
provider takes.

## Reading node state

A component re-renders for the nodes it subscribed to, and only for those. `useForm` subscribes to
the root, `useFormNode` to the node it returns, `useField` to its field and `useNodeState(node)` to
any node you pass it.

The root's state changes whenever a value changes, so values read from `form.state` are always
current. The state of another node can change while the root's does not, for example when an error
appears on a field or a branch becomes active. Read that state through `useNodeState`.

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

A new object on every render is fine. Dependencies equal key by key to the current ones change
nothing, and nothing is validated again or re-rendered.
