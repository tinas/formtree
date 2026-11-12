import { defineGroup } from '@formtree/vue'
import { z } from 'zod'

export const checkoutForm = defineGroup({
  schema: z.object({
    fullName: z.string({ error: 'Enter your name' }).trim().min(1, {
      error: 'Enter your name',
    }),
    email: z.email({ error: 'Enter a valid email address' }),
  }),
})
