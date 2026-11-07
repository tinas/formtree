import type { StepProps } from './step-props'

import { FormNodeProvider, useFormNode, useNodeState } from '@formtree/react'

import { TextField } from '../components/text-field'
import { checkoutGroup } from '../forms/checkout'
import { LineItemRow } from './line-item-row'

export function CartStep({ onComplete }: StepProps) {
  const cart = useFormNode(checkoutGroup).group('cart')
  const lineItems = cart.array('lineItems')
  useNodeState(lineItems)
  const isCheckingCode = useNodeState(cart.field('promoCode')).validating
  const onSubmit = cart.handleSubmit(() => onComplete())

  return (
    <FormNodeProvider node={cart}>
      <form
        id={cart.id}
        className="step"
        noValidate
        onSubmit={event => {
          event.preventDefault()
          void onSubmit()
        }}
      >
        <h2>Cart</h2>
        <div className="line-items">
          <p className="hint">Each row saves on its own. Saved rows stay clean until they change.</p>
          {lineItems.items.map(lineItem => (
            <LineItemRow key={lineItem.key} index={lineItem.index} />
          ))}
          <p className="error">{lineItems.errorMessage}</p>
          <button type="button" className="secondary" onClick={() => lineItems.push({ quantity: 1 })}>
            Add product
          </button>
        </div>
        <TextField name="promoCode" label="Promo code" />
        <p className="hint">{isCheckingCode ? 'Checking code…' : 'Try welcome10 or freeship.'}</p>
      </form>
    </FormNodeProvider>
  )
}
