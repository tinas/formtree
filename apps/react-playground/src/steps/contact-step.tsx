import type { StepProps } from './step-props'

import { FormNodeProvider, useFormNode } from '@formtree/react'

import { TextField } from '../components/text-field'
import { checkoutGroup } from '../forms/checkout'

export function ContactStep({ onComplete }: StepProps) {
  const contact = useFormNode(checkoutGroup).group('contact')
  const onSubmit = contact.handleSubmit(() => onComplete())

  return (
    <FormNodeProvider node={contact}>
      <form id={contact.id} className="step" noValidate onSubmit={onSubmit}>
        <h2>Contact</h2>
        <TextField name="fullName" label="Full name" />
        <TextField name="email" label="Email" />
      </form>
    </FormNodeProvider>
  )
}
