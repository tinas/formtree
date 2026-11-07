import { defineFieldWithDeps, defineGroup } from '@formtree/core'
import { z } from 'zod'

export const ROLE = {
  member: 'member',
  admin: 'admin',
} as const

export const passwordField = defineFieldWithDeps<{ minLength: number }>()({
  schema: ({ deps }) =>
    z
      .string({ error: 'Password is required' })
      .min(deps.minLength, { error: `Use at least ${deps.minLength} characters` }),
})

export const accountForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
    role: z.enum(ROLE, { error: 'Choose a role' }),
    confirmPassword: z.string({ error: 'Repeat the password' }),
  }),
  children: { password: passwordField },
  childDeps: {
    password: ({ value }) => ({ minLength: value.role === ROLE.admin ? 12 : 8 }),
  },
  validate: ({ value }) =>
    value.confirmPassword !== undefined && value.confirmPassword !== value.password
      ? { path: 'confirmPassword', code: 'Passwords do not match' }
      : undefined,
})
