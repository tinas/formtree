import { defineField, defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'

import { requiredText } from './schemas'

export const DELIVERY_METHOD = {
  shipping: 'shipping',
  pickup: 'pickup',
} as const

export interface ShippingDeps {
  readonly countries: ReadonlyArray<string>
}

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
