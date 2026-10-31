import { useField } from '@formtree/react'

import { FieldFrame } from './field-frame'

interface TextFieldProps {
  readonly name: string
  readonly label: string
}

export function TextField({ name, label }: TextFieldProps) {
  const field = useField<string>(name)
  return (
    <FieldFrame label={label} labelFor={field.id} errorId={field.errorId} error={field.state.errors[0]?.code}>
      <input
        {...field.attrs}
        value={field.value ?? ''}
        onChange={event => field.setValue(event.target.value)}
        autoComplete="off"
      />
    </FieldFrame>
  )
}
