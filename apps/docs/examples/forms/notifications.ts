import { defineGroup } from '@formtree/core'
import { z } from 'zod'

export const CHANNEL = {
  email: 'email',
  sms: 'sms',
  push: 'push',
} as const

export const notificationsForm = defineGroup({
  schema: z.object({
    channels: z
      .array(z.enum(CHANNEL), { error: 'Choose at least one channel' })
      .min(1, { error: 'Choose at least one channel' }),
  }),
})
