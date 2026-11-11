import { defineGroup } from '@formtree/core'
import { z } from 'zod'

export const contactForm = defineGroup({
  schema: z.object({
    name: z.string({ error: 'Enter your name' }).trim().min(1, {
      error: 'Enter your name',
    }),
    email: z.email({ error: 'Enter a valid email address' }),
    message: z.string({ error: 'Write a message' }).min(10, {
      error: 'Write at least 10 characters',
    }),
  }),
})
