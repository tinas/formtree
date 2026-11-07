import type { StepProps } from './step-props'

import { FormNodeProvider, useField, useFormNode, useNodeState } from '@formtree/react'

import { SelectField } from '../components/select-field'
import { TextField } from '../components/text-field'
import { checkoutGroup, PAYMENT_METHOD } from '../forms/checkout'

const PAYMENT_OPTIONS = [
  { value: PAYMENT_METHOD.card, label: 'Card' },
  { value: PAYMENT_METHOD.invoice, label: 'Invoice' },
]

export function PaymentStep({ onComplete }: StepProps) {
  const checkout = useFormNode(checkoutGroup)
  const payment = checkout.group('payment')
  const acceptTerms = useField(checkout.field('acceptTerms'))
  const isCard = useNodeState(payment.group('card')).active
  const isInvoice = useNodeState(payment.group('invoice')).active
  const onSubmit = payment.handleSubmit(() => onComplete())

  return (
    <FormNodeProvider node={payment}>
      <form
        id={payment.id}
        className="step"
        noValidate
        onSubmit={event => {
          event.preventDefault()
          void onSubmit()
        }}
      >
        <h2>Payment</h2>
        <SelectField name="method" label="Method" options={PAYMENT_OPTIONS} />
        {isCard && (
          <fieldset>
            <legend>Card</legend>
            <TextField name="card.holder" label="Cardholder" />
            <TextField name="card.number" label="Card number" />
          </fieldset>
        )}
        {isInvoice && (
          <fieldset>
            <legend>Invoice</legend>
            <TextField name="invoice.company" label="Company" />
            <TextField name="invoice.taxId" label="Tax ID" />
          </fieldset>
        )}
        <label className="choice">
          <input
            type="checkbox"
            {...acceptTerms.attrs}
            checked={acceptTerms.value == true}
            onChange={event => acceptTerms.setValue(event.target.checked ? true : undefined)}
          />
          I accept the terms of sale
        </label>
        <p id={acceptTerms.errorId} className="error">
          {acceptTerms.errorMessage}
        </p>
      </form>
    </FormNodeProvider>
  )
}
