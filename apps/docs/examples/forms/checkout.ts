import { arrayOf, defineField, defineFieldWithDeps, defineGroup, defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'

import { checkPromoCode } from './api'
import { requiredText } from './schemas'

export const DELIVERY_METHOD = {
  shipping: 'shipping',
  pickup: 'pickup',
} as const

export const PAYMENT_METHOD = {
  card: 'card',
  invoice: 'invoice',
} as const

export interface ShippingDeps {
  readonly countries: ReadonlyArray<string>
}

export interface CheckoutDeps extends ShippingDeps {
  readonly cartId: string
}

export const emailField = defineField({
  schema: z.email({ error: 'Enter a valid email address' }),
})

export const contactGroup = defineGroup({
  schema: z.object({
    fullName: requiredText('Name is required'),
  }),
  children: { email: emailField },
})

const stateField = defineField({
  schema: requiredText('State is required'),
})

export const addressGroup = defineGroupWithDeps<ShippingDeps>()({
  schema: ({ deps }) =>
    z.object({
      street: requiredText('Street is required'),
      city: requiredText('City is required'),
      country: z
        .string({ error: 'Country is required' })
        .refine(country => deps.countries.includes(country), { error: 'We do not ship to this country yet' }),
    }),
  children: { state: stateField },
  activeWhen: {
    state: ({ value }) => value.country === 'US',
  },
})

const storeField = defineField({
  schema: z.string({ error: 'Choose a store' }),
})

export const deliveryGroup = defineGroupWithDeps<ShippingDeps>()({
  schema: z.object({
    method: z.enum(DELIVERY_METHOD, { error: 'Choose a delivery method' }),
  }),
  children: { address: addressGroup, store: storeField },
  activeWhen: {
    address: ({ value }) => value.method === DELIVERY_METHOD.shipping,
    store: ({ value }) => value.method === DELIVERY_METHOD.pickup,
  },
  childDeps: {
    address: ({ deps }) => deps,
  },
})

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

export const lineItemGroup = defineGroup({
  schema: z.object({
    id: z.number().int().positive().optional(),
    sku: requiredText('Product is required'),
    quantity: z.number({ error: 'Quantity is required' }).int().positive({ error: 'Quantity must be at least 1' }),
  }),
})

export const lineItemsArray = arrayOf(lineItemGroup, {
  validate: rows => duplicateProducts(rows),
})

export const promoCodeField = defineFieldWithDeps<{ cartId: string }>()({
  schema: z.string().trim().toUpperCase().optional(),
  validateAsync: {
    on: 'blur',
    run: async (code, { signal, deps }) => {
      if (code === undefined || code === '') {
        return undefined
      }
      const valid = await checkPromoCode({ code, cartId: deps.cartId }, signal)
      return valid ? undefined : { code: 'This code is not valid' }
    },
  },
})

export const checkoutGroup = defineGroupWithDeps<CheckoutDeps>()({
  schema: z.object({
    acceptTerms: z.literal(true, { error: 'Accept the terms to place the order' }),
  }),
  children: {
    contact: contactGroup,
    delivery: deliveryGroup,
    payment: paymentGroup,
    items: lineItemsArray,
    promoCode: promoCodeField,
  },
  childDeps: {
    delivery: ({ deps }) => ({ countries: deps.countries }),
    promoCode: ({ deps }) => ({ cartId: deps.cartId }),
  },
})

interface LineItemDraft {
  readonly sku?: string
}

function duplicateProducts(rows: ReadonlyArray<LineItemDraft>) {
  const seen = new Set<string>()
  return rows.flatMap((row, index) => {
    if (row.sku === undefined || row.sku === '') {
      return []
    }
    if (seen.has(row.sku)) {
      return [{ path: `${index}.sku`, code: 'This product is already in the cart', params: { sku: row.sku } }]
    }
    seen.add(row.sku)
    return []
  })
}
