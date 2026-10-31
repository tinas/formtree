import { z } from 'zod'

import { defineGroup, defineGroupWithDeps } from '../../src'

export const addressGroup = defineGroup({
  schema: z.object({
    city: z.string({ error: 'city.required' }).min(1, { error: 'city.required' }),
  }),
})

export const profileGroup = defineGroupWithDeps<{ minAge: number }>()({
  schema: ({ deps }) =>
    z.object({
      name: z.string({ error: 'name.required' }).min(1, { error: 'name.required' }),
      age: z.number({ error: 'age.required' }).min(deps.minAge, { error: 'age.too_young' }),
    }),
  children: { address: addressGroup },
})

export const PROFILE_DEPS = { minAge: 18 }
