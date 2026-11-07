import { defineFieldWithDeps } from '@formtree/core'
import { z } from 'zod'

import { checkPromoCode } from './api'

export const promoCodeField = defineFieldWithDeps<{ cartId: string }>()({
  schema: z.string().trim().toUpperCase().optional(),
  validateAsync: {
    on: 'blur',
    run: async (code, { signal, deps }) => {
      if (code == undefined || code == '') {
        return undefined
      }
      const valid = await checkPromoCode({ code, cartId: deps.cartId }, signal)
      return valid ? undefined : { code: 'This code is not valid' }
    },
  },
})
