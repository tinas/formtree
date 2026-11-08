import type { StandardSchemaV1 } from '../src'

import { type } from 'arktype'
import * as v from 'valibot'
import { describe, expect, test } from 'vite-plus/test'
import { z } from 'zod'

import { createForm, defineField, defineGroup } from '../src'

interface Address {
  street: string
  unit?: string
  region: { city: string; district?: string }
}

interface SchemaLibrary {
  readonly name: string
  readonly addressSchema: StandardSchemaV1<Address>
  readonly nameSchema: StandardSchemaV1<string>
  readonly nicknameSchema: StandardSchemaV1<string | undefined>
}

const SCHEMA_LIBRARIES: ReadonlyArray<SchemaLibrary> = [
  {
    name: 'Zod',
    addressSchema: z.object({
      street: z.string(),
      unit: z.string().optional(),
      region: z.object({ city: z.string(), district: z.string().optional() }),
    }),
    nameSchema: z.string(),
    nicknameSchema: z.string().optional(),
  },
  {
    name: 'Valibot',
    addressSchema: v.object({
      street: v.string(),
      unit: v.exactOptional(v.string()),
      region: v.object({ city: v.string(), district: v.exactOptional(v.string()) }),
    }),
    nameSchema: v.string(),
    nicknameSchema: v.optional(v.string()),
  },
  {
    name: 'ArkType',
    addressSchema: type({ street: 'string', 'unit?': 'string', region: { city: 'string', 'district?': 'string' } }),
    nameSchema: type('string'),
    nicknameSchema: type('string | undefined'),
  },
]

describe.each(SCHEMA_LIBRARIES)('$name', ({ addressSchema, nameSchema, nicknameSchema }) => {
  const contactForm = defineGroup({
    schema: addressSchema,
    children: {
      name: defineField({ schema: nameSchema }),
      nickname: defineField({ schema: nicknameSchema }),
    },
  })

  test('an error lands on the field or key it belongs to', () => {
    const form = createForm(contactForm, { initialValue: { region: {} }, mode: 'all' })

    expect(form.field('name').state.errors).toHaveLength(1)
    expect(form.field('street').state.errors).toHaveLength(1)
    expect(form.field('region.city').state.errors).toHaveLength(1)
    expect(form.listErrors({ deep: true }).map(error => error.path)).toEqual(
      expect.arrayContaining(['name', 'street', 'region.city']),
    )
  })

  test('a cleared optional key leaves the value valid', async () => {
    const form = createForm(contactForm, {
      initialValue: { name: 'Ada', street: 'Rua Augusta', unit: '4B', region: { city: 'Lisbon', district: 'Baixa' } },
    })

    form.field('unit').setValue(undefined)
    form.field('region.district').setValue(undefined)

    expect(form.state.value).not.toHaveProperty('unit')
    expect(await form.validate()).toEqual({
      valid: true,
      value: { name: 'Ada', street: 'Rua Augusta', region: { city: 'Lisbon' } },
    })
  })

  test('a node is required when its schema rejects an empty value', () => {
    const form = createForm(contactForm)

    expect(form.field('name').state.required).toBe(true)
    expect(form.field('nickname').state.required).toBe(false)
    expect(form.field('street').state.required).toBe(true)
    expect(form.field('unit').state.required).toBe(false)
    expect(form.field('region.city').state.required).toBe(true)
    expect(form.field('region.district').state.required).toBe(false)
  })
})
