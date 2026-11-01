import { defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'

import { requiredText } from './schemas'

export const emailField = defineField({
  schema: z.email({ error: 'Enter a valid email address' }),
})

export const contactGroup = defineGroup({
  schema: z.object({
    fullName: requiredText('Name is required'),
  }),
  children: { email: emailField },
})
