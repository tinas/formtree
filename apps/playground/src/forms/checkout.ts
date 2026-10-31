import { arrayOf, defineField, defineFieldWithDeps, defineGroup, defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'

import { checkPromoCode } from '../api'

export const DELIVERY_METHOD = {
  shipping: 'shipping',
  pickup: 'pickup',
} as const

export const PAYMENT_METHOD = {
  card: 'card',
  invoice: 'invoice',
} as const

export const NOTIFICATION_CHANNEL = {
  email: 'email',
  sms: 'sms',
  push: 'push',
} as const

export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL]

export interface ShippingDeps {
  readonly countries: ReadonlyArray<string>
}

export interface CartDeps {
  readonly cartId: string
}

export const lineItemGroup = defineGroup({
  schema: z.object({
    id: z.number().int().positive().optional(),
    sku: requiredText('Choose a product'),
    quantity: z.number({ error: 'Quantity is required' }).int().positive({ error: 'Quantity must be at least 1' }),
  }),
})

const promoCodeField = defineFieldWithDeps<CartDeps>()({
  schema: z.string().trim().toUpperCase().optional(),
  validateAsync: {
    on: 'blur',
    debounceMs: 300,
    run: async (code, { signal, deps }) => {
      if (code == undefined || code == '') {
        return undefined
      }
      return (await checkPromoCode({ code, cartId: deps.cartId }, signal))
        ? undefined
        : { code: 'This code is not valid' }
    },
  },
})

export const cartGroup = defineGroupWithDeps<CartDeps>()({
  children: {
    items: arrayOf(lineItemGroup, {
      validate: rows => duplicateProducts(rows),
    }),
    promoCode: promoCodeField,
  },
  childDeps: {
    promoCode: ({ deps }) => ({ cartId: deps.cartId }),
  },
  validate: ({ value }) => (value.items.length == 0 ? { path: 'items', code: 'Add at least one product' } : undefined),
})

const emailField = defineField({
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

const addressGroup = defineGroupWithDeps<ShippingDeps>()({
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
    state: ({ value }) => value.country == 'US',
  },
})

const storeField = defineField({
  schema: z.object({ storeId: z.string(), name: z.string() }, { error: 'Choose a store' }),
})

export const deliveryGroup = defineGroupWithDeps<ShippingDeps>()({
  schema: z.object({
    method: z.enum(DELIVERY_METHOD, { error: 'Choose a delivery method' }),
  }),
  children: { address: addressGroup, store: storeField },
  activeWhen: {
    address: ({ value }) => value.method == DELIVERY_METHOD.shipping,
    store: ({ value }) => value.method == DELIVERY_METHOD.pickup,
  },
  childDeps: {
    address: ({ deps }) => deps,
  },
})

const cardGroup = defineGroup({
  schema: z.object({
    holder: requiredText('Cardholder name is required'),
    number: z.string({ error: 'Card number is required' }).regex(/^\d{16}$/, { error: 'Enter the 16 digits' }),
  }),
})

const invoiceGroup = defineGroup({
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
    card: ({ value }) => value.method == PAYMENT_METHOD.card,
    invoice: ({ value }) => value.method == PAYMENT_METHOD.invoice,
  },
})

export const checkoutGroup = defineGroupWithDeps<CartDeps & ShippingDeps>()({
  schema: z.object({
    notifyBy: z
      .array(z.enum(NOTIFICATION_CHANNEL), { error: 'Choose at least one channel' })
      .min(1, { error: 'Choose at least one channel' }),
    acceptTerms: z.literal(true, { error: 'Accept the terms to place the order' }),
  }),
  children: {
    cart: cartGroup,
    contact: contactGroup,
    delivery: deliveryGroup,
    payment: paymentGroup,
  },
  childDeps: {
    cart: ({ deps }) => ({ cartId: deps.cartId }),
    delivery: ({ deps }) => ({ countries: deps.countries }),
  },
})

function requiredText(message: string) {
  return z.string({ error: message }).trim().min(1, { error: message })
}

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
      return [{ path: `${index}.sku`, code: 'This product is already in the cart' }]
    }
    seen.add(row.sku)
    return []
  })
}
