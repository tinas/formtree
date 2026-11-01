import { useField } from '@formtree/react'

import { STORES } from '../api'
import { FieldFrame } from '../components/field-frame'

interface StoreChoice {
  storeId?: string
  name?: string
}

export function StoreSelect() {
  const store = useField<StoreChoice>('store')
  return (
    <FieldFrame label="Pickup store" labelFor={store.id} errorId={store.errorId} error={store.errorMessage}>
      <select
        {...store.attrs}
        value={store.value?.storeId ?? ''}
        onChange={event => store.setValue(STORES.find(option => option.storeId == event.target.value))}
      >
        <option value="">Select a store…</option>
        {STORES.map(option => (
          <option key={option.storeId} value={option.storeId}>
            {option.name}
          </option>
        ))}
      </select>
    </FieldFrame>
  )
}
