# Node Context

A checkout page owns the form, and each step is a component of its own. The steps need their
part of the form, and their inputs need the step. `FormNodeProvider` and `useFormNode` pass nodes
down the component tree without props.

## FormNodeProvider

```tsx
// checkout-page.tsx
import { FormNodeProvider, useForm } from '@formtree/react'
import { checkoutGroup } from './forms/checkout'

export function CheckoutPage() {
  const form = useForm(checkoutGroup, { deps: { cartId: 'cart_42', countries: ['DE', 'NL'] } })

  return (
    <FormNodeProvider node={form}>
      <DeliveryStep />
    </FormNodeProvider>
  )
}
```

`FormNodeProvider` makes its `node` available to every descendant. Providing is always explicit:
`useForm` never provides by itself, so a form in a dialog cannot quietly replace the page's form
for the components below it.

Any node can be provided: the root, a step, an array item.

## useFormNode

```tsx
// delivery-step.tsx
import { FormNodeProvider, useFormNode } from '@formtree/react'
import { checkoutGroup } from './forms/checkout'

export function DeliveryStep({ onNext }: { onNext: () => void }) {
  const delivery = useFormNode(checkoutGroup).group('delivery')
  const submit = delivery.handleSubmit(() => onNext())

  return (
    <FormNodeProvider node={delivery}>
      <form id={delivery.id} noValidate onSubmit={submit}>
        <AddressFields />
      </form>
    </FormNodeProvider>
  )
}
```

`useFormNode(definition)` returns the nearest provided node of that definition, typed by it, and
re-renders the component when that node's state changes. If no ancestor provided one, it throws.
It does not fall back to another node.

A component deeper down can then ask for the delivery step by its own definition, without
knowing that it sits inside a checkout:

```tsx
const delivery = useFormNode(deliveryGroup)
```

`useFormNode()` without an argument returns the nearest provided node of any definition, with a
loose type.

## Lists

A row component receives its index, reads the list from its parent and provides its own item:

```tsx
// line-item-row.tsx
import { FormNodeProvider, useFormNode } from '@formtree/react'
import { checkoutGroup } from './forms/checkout'

export function LineItemRow({ index }: { index: number }) {
  const lineItems = useFormNode(checkoutGroup).array('lineItems')
  const row = lineItems.items[index]!

  return (
    <FormNodeProvider node={row}>
      <NumberField name="quantity" label="Quantity" />
    </FormNodeProvider>
  )
}
```

Inputs inside the row bind to `'sku'` and `'quantity'` by name, relative to the row. The list
renders one row per item with `key={lineItem.key}`, so a row keeps its component when items move.

## Why no node props

A node passed through props would make every component in between carry the form's types, and
the props would mirror state the form already holds. With a definition as the key, a component
knows exactly one thing about the form: the definition it renders.

| Component       | Receives                               |
| --------------- | -------------------------------------- |
| A step or card  | nothing; it reads its definition       |
| A generic input | a `name`, relative to the nearest node |
| A row           | an `index`                             |
