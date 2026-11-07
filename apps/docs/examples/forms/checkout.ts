import type { ShippingDeps } from './delivery'

import { defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'

import { contactGroup } from './contact'
import { deliveryGroup } from './delivery'
import { lineItemsArray } from './line-items'
import { paymentGroup } from './payment'
import { promoCodeField } from './promo-code'

export interface CheckoutDeps extends ShippingDeps {
  readonly cartId: string
}

export const checkoutForm = defineGroupWithDeps<CheckoutDeps>()({
  schema: z.object({
    acceptTerms: z.literal(true, { error: 'Accept the terms to place the order' }),
  }),
  children: {
    contact: contactGroup,
    delivery: deliveryGroup,
    payment: paymentGroup,
    lineItems: lineItemsArray,
    promoCode: promoCodeField,
  },
  childDeps: {
    delivery: ({ deps }) => ({ countries: deps.countries }),
    promoCode: ({ deps }) => ({ cartId: deps.cartId }),
  },
})
