import type { StepProps } from './step-props'

import { FormNodeProvider, useFormNode, useNodeState } from '@formtree/react'

import { COUNTRIES } from '../api'
import { SelectField } from '../components/select-field'
import { TextField } from '../components/text-field'
import { checkoutGroup, DELIVERY_METHOD } from '../forms/checkout'
import { StoreSelect } from './store-select'

const DELIVERY_OPTIONS = [
  { value: DELIVERY_METHOD.shipping, label: 'Ship to an address' },
  { value: DELIVERY_METHOD.pickup, label: 'Pick up in store' },
]

const COUNTRY_OPTIONS = COUNTRIES.map(country => {
  return {
    value: country.code,
    label: country.name,
  }
})

export function DeliveryStep({ onComplete }: StepProps) {
  const delivery = useFormNode(checkoutGroup).group('delivery')
  const isShipping = useNodeState(delivery.group('address')).active
  const needsState = useNodeState(delivery.field('address.state')).active
  const isPickup = useNodeState(delivery.field('store')).active
  const onSubmit = delivery.handleSubmit(() => onComplete())

  return (
    <FormNodeProvider node={delivery}>
      <form
        id={delivery.id}
        className="step"
        noValidate
        onSubmit={event => {
          event.preventDefault()
          void onSubmit()
        }}
      >
        <h2>Delivery</h2>
        <SelectField name="method" label="Method" options={DELIVERY_OPTIONS} />
        {isShipping && (
          <fieldset>
            <legend>Shipping address</legend>
            <TextField name="address.street" label="Street" />
            <TextField name="address.city" label="City" />
            <SelectField name="address.country" label="Country" options={COUNTRY_OPTIONS} />
            {needsState && <TextField name="address.state" label="State" />}
          </fieldset>
        )}
        {isPickup && <StoreSelect />}
      </form>
    </FormNodeProvider>
  )
}
