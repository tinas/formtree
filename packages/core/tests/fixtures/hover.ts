import type { DraftOf, NodeOf, OutputOf } from '../../src'

import { z } from 'zod'

import { arrayOf, defineField, defineGroup } from '../../src'

const addressGroup = defineGroup({
  schema: z.object({ street: z.string(), city: z.string() }),
  children: {
    postalCode: defineField({ schema: z.string() }),
  },
})

const lineItemsArray = arrayOf(
  defineGroup({
    schema: z.object({ name: z.string(), quantity: z.number() }),
  }),
)

const checkoutForm = defineGroup({
  schema: z.object({ isGift: z.boolean() }),
  children: {
    email: defineField({ schema: z.string() }),
    address: addressGroup,
    lineItems: lineItemsArray,
    coupons: arrayOf(z.string()),
    giftMessage: defineField({ schema: z.string() }),
  },
  activeWhen: {
    giftMessage: ({ value }) => value.isGift == true,
  },
})

export type CheckoutDraft = DraftOf<typeof checkoutForm>

export type CheckoutOutput = OutputOf<typeof checkoutForm>

export type AddressNode = NodeOf<typeof addressGroup>

export type LineItemsNode = NodeOf<typeof lineItemsArray>
