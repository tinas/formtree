import { defineGroup } from '@formtree/core'
import { z } from 'zod'

export const signUpGroup = defineGroup({
  schema: z.object({
    name: z.string({ error: 'Enter your name' }).trim().min(1, { error: 'Enter your name' }),
    email: z.email({ error: 'Enter a valid email address' }),
  }),
})
