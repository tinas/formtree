import { useField } from '@formtree/react'

import { FieldFrame } from './field-frame'

interface NumberFieldProps {
  readonly name: string
  readonly label: string
}

export function NumberField({ name, label }: NumberFieldProps) {
  const field = useField<number>(name)
  return (
    <FieldFrame label={label} labelFor={field.id} errorId={field.errorId} error={field.state.errors[0]?.code}>
      <input
        {...field.attrs}
        type="number"
        value={field.value == undefined ? '' : String(field.value)}
        onChange={event => field.setValue(event.target.value == '' ? undefined : Number(event.target.value))}
      />
    </FieldFrame>
  )
}
