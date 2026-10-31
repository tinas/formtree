import { z } from 'zod'

export function requiredText(message: string) {
  return z.string({ error: message }).trim().min(1, { error: message })
}
