import { defineGroup } from '@formtree/core'
import { z } from 'zod'

import { requiredText } from './schemas'

export const PAYMENT_METHOD = {
  card: 'card',
  invoice: 'invoice',
} as const

export const DEFAULT_DUE_IN_DAYS = 30

export const cardGroup = defineGroup({
  schema: z.object({
    holder: requiredText('Cardholder name is required'),
    number: z
      .string({ error: 'Card number is required' })
      .regex(/^\d{16}$/, { error: 'Enter the 16 digits on the card' }),
  }),
})

export const invoiceGroup = defineGroup({
  schema: z.object({
    company: requiredText('Company name is required'),
    taxId: requiredText('Tax ID is required'),
    dueInDays: z
      .number()
      .int({ error: 'Enter whole days' })
      .positive({ error: 'Enter at least one day' })
      .default(DEFAULT_DUE_IN_DAYS),
  }),
})

export const paymentGroup = defineGroup({
  schema: z.object({
    method: z.enum(PAYMENT_METHOD, { error: 'Choose a payment method' }),
  }),
  children: { card: cardGroup, invoice: invoiceGroup },
  activeWhen: {
    card: ({ value }) => value.method === PAYMENT_METHOD.card,
    invoice: ({ value }) => value.method === PAYMENT_METHOD.invoice,
  },
})
