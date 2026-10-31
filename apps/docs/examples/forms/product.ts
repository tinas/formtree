import { defineField } from '@formtree/core'
import { z } from 'zod'

export const priceField = defineField({
  schema: z.number({ error: 'Price is required' }).positive({ error: 'Price must be positive' }),
})
