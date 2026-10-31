import type { ChoiceOption } from './choice-options'

import { useField } from '@formtree/react'

import { FieldFrame } from './field-frame'

interface SelectFieldProps {
  readonly name: string
  readonly label: string
  readonly options: ReadonlyArray<ChoiceOption>
}

export function SelectField({ name, label, options }: SelectFieldProps) {
  const field = useField<string>(name)
  return (
    <FieldFrame label={label} labelFor={field.id} errorId={field.errorId} error={field.state.errors[0]?.code}>
      <select
        {...field.attrs}
        value={field.value ?? ''}
        onChange={event => field.setValue(event.target.value == '' ? undefined : event.target.value)}
      >
        <option value="">Select…</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  )
}
