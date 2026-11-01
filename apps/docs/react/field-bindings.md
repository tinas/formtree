# Field Bindings

`useField` turns a field node into the value, a way to write it and the attributes for the input
element.

## A generic input

```tsx
// text-field.tsx
import { useField } from '@formtree/react'

export function TextField({ name, label }: { name: string; label: string }) {
  const field = useField<string>(name)

  return (
    <div className="field">
      <label htmlFor={field.id}>{label}</label>
      <input {...field.attrs} value={field.value ?? ''} onChange={event => field.setValue(event.target.value)} />
      <p id={field.errorId}>{field.errorMessage}</p>
    </div>
  )
}
```

`useField(name)` finds the field at `name`, relative to the nearest provided node. A step renders
`<TextField name="address.city" label="City" />`, and the component never sees the form's types.
The component re-renders only when that field changes, not when its neighbours do.

`attrs` goes on the element. `value` and `setValue` are left to the component, because only the
component knows how its element represents the value.
[`FieldView`](/api/@formtree/react/interfaces/FieldView) describes every member.

## Translating errors

The generic input shows `errorMessage`, the field's first visible error as text. When codes are
translation keys, give the app one `formatError` that translates them, for example with
react-i18next.

```tsx
// app.tsx
import type { FormError } from '@formtree/react'
import { FormtreeProvider } from '@formtree/react'
import i18n from 'i18next'
import { Checkout } from './checkout'

export function App() {
  return (
    <FormtreeProvider formatError={formatError}>
      <Checkout />
    </FormtreeProvider>
  )
}

function formatError(error: FormError): string {
  return i18n.t(error.code, { ...error.params })
}
```

`errorMessage` runs `formatError` on every render. React re-renders the input when its field
changes, not when the language does, so call `useTranslation()` in the generic input to re-render
it on a language switch.

```tsx
// text-field.tsx
import { useField } from '@formtree/react'
import { useTranslation } from 'react-i18next'

export function TextField({ name, label }: { name: string; label: string }) {
  const field = useField<string>(name)
  useTranslation()

  return (
    <div className="field">
      <label htmlFor={field.id}>{label}</label>
      <input {...field.attrs} value={field.value ?? ''} onChange={event => field.setValue(event.target.value)} />
      <p id={field.errorId}>{field.errorMessage}</p>
    </div>
  )
}
```

[Translating errors](/guide/errors-and-focus#translating-errors) covers `params` and the messages a
schema library writes by default.

## Typed bindings

A business component that knows its definition can bind a typed node instead of a name.

```tsx
const delivery = useFormNode(deliveryGroup)

const method = useField(delivery.field('method'))
// method.value: 'shipping' | 'pickup' | undefined
```

The value is typed from the definition, and passing `setValue` a value the schema does not
accept is a type error.

## Values that are not strings

An `<input>` produces strings, and a draft holds `undefined` while empty. A number input converts
between the two.

```tsx
// number-field.tsx
import { useField } from '@formtree/react'

export function NumberField({ name, label }: { name: string; label: string }) {
  const field = useField<number>(name)

  return (
    <div className="field">
      <label htmlFor={field.id}>{label}</label>
      <input
        {...field.attrs}
        type="number"
        value={field.value == undefined ? '' : String(field.value)}
        onChange={event => field.setValue(event.target.value == '' ? undefined : Number(event.target.value))}
      />
      <p id={field.errorId}>{field.errorMessage}</p>
    </div>
  )
}
```

Clearing the input writes `undefined`, so the schema reports a missing value instead of `0`.
