import { FormNodeProvider, useFormNode, useNodeState } from '@formtree/react'

import { PRODUCTS, saveLineItem } from '../api'
import { NumberField } from '../components/number-field'
import { SelectField } from '../components/select-field'
import { cartGroup } from '../forms/checkout'

interface LineItemRowProps {
  readonly index: number
}

interface RowProgress {
  readonly isSubmitting: boolean
  readonly isSaved: boolean
  readonly isDirty: boolean
}

const PRODUCT_OPTIONS = PRODUCTS.map(product => {
  return {
    value: product.sku,
    label: product.name,
  }
})

export function LineItemRow({ index }: LineItemRowProps) {
  const lineItems = useFormNode(cartGroup).array('lineItems')
  const row = lineItems.items[index]
  const progress = useNodeState(row, node => ({
    isSubmitting: node.state.submitting,
    isSaved: node.state.value.id != undefined,
    isDirty: node.state.dirty,
  }))
  const save = row.handleSubmit(async lineItem => {
    row.reset({ value: await saveLineItem(lineItem) })
  })

  return (
    <FormNodeProvider node={row}>
      <div className="line-item">
        <SelectField name="sku" label="Product" options={PRODUCT_OPTIONS} />
        <NumberField name="quantity" label="Quantity" />
        <div className="row-actions">
          <button type="button" aria-disabled={progress.isSaved && !progress.isDirty} onClick={() => save()}>
            Save
          </button>
          <button type="button" className="secondary" onClick={() => lineItems.remove(row.index)}>
            Remove
          </button>
          <span className="hint">{rowStatus(progress)}</span>
        </div>
      </div>
    </FormNodeProvider>
  )
}

function rowStatus({ isSubmitting, isSaved, isDirty }: RowProgress): string {
  if (isSubmitting) {
    return 'Saving…'
  }
  if (!isSaved) {
    return 'Not saved'
  }
  return isDirty ? 'Unsaved changes' : 'Saved'
}
