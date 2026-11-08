import { useFormNode, useNodeState } from '@formtree/react'

import { checkoutGroup } from './forms/checkout'

export function FormStatePanel() {
  const checkout = useFormNode(checkoutGroup)
  const { valid, dirty, value } = useNodeState(checkout, node => ({
    valid: node.state.valid,
    dirty: node.state.dirty,
    value: node.state.value,
  }))

  return (
    <>
      <h2>Form state</h2>
      <pre>{JSON.stringify({ valid, dirty, value }, null, 2)}</pre>
    </>
  )
}
