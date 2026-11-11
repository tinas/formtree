import { defineGroup } from '@formtree/core'
import { z } from 'zod'

export const DRINK = {
  tea: 'tea',
  coffee: 'coffee',
} as const

export const MILK = {
  oat: 'oat',
  whole: 'whole',
} as const

export const drinkOrderForm = defineGroup({
  schema: z.object({
    drink: z.enum(DRINK, { error: 'Choose a drink' }),
    milk: z.enum(MILK).optional(),
  }),
})
