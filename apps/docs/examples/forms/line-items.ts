import { arrayOf, defineGroup } from '@formtree/core'
import { z } from 'zod'

import { requiredText } from './schemas'

export const lineItemGroup = defineGroup({
  schema: z.object({
    id: z.number().int().positive().optional(),
    sku: requiredText('Product is required'),
    quantity: z.number({ error: 'Quantity is required' }).int().positive({
      error: 'Quantity must be at least 1',
    }),
  }),
})

export const lineItemsArray = arrayOf(lineItemGroup, {
  validate: rows => duplicateProducts(rows),
})

interface LineItemDraft {
  readonly sku?: string
}

function duplicateProducts(rows: ReadonlyArray<LineItemDraft>) {
  const seen = new Set<string>()
  return rows.flatMap((row, index) => {
    if (row.sku == undefined || row.sku == '') {
      return []
    }
    if (seen.has(row.sku)) {
      return [
        {
          path: `${index}.sku`,
          code: 'This product is already in the cart',
          params: { sku: row.sku },
        },
      ]
    }
    seen.add(row.sku)
    return []
  })
}
