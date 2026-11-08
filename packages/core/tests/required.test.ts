import type { StandardSchemaV1 } from '../src'

import { describe, expect, test } from 'vite-plus/test'
import { z } from 'zod'

import { arrayOf, createForm, defineField, defineFieldWithDeps, defineGroup, defineGroupWithDeps } from '../src'

function recordedNameSchema(inputs: Array<unknown>): StandardSchemaV1<string | undefined, string> {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate: value => {
        inputs.push(value)
        return typeof value == 'string' ? { value } : { issues: [{ message: 'Enter a name' }] }
      },
    },
  }
}

function recordedContactSchema(inputs: Array<unknown>): StandardSchemaV1<Record<string, string | undefined>> {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate: value => {
        inputs.push(value)
        return { value: value as Record<string, string | undefined> }
      },
    },
  }
}

describe('required', () => {
  test('a field is required when its schema rejects an empty value', () => {
    const contactForm = defineGroup({
      children: {
        name: defineField({ schema: z.string() }),
        nickname: defineField({ schema: z.string().optional() }),
      },
    })
    const form = createForm(contactForm)

    expect(form.field('name').state.required).toBe(true)
    expect(form.field('name').attributes['aria-required']).toBe('true')
    expect(form.field('nickname').state.required).toBe(false)
    expect(form.field('nickname').attributes['aria-required']).toBeNull()
  })

  test('a schema key, a nested one included, is required when its schema rejects it empty', () => {
    const addressForm = defineGroup({
      schema: z.object({
        street: z.string(),
        unit: z.string().optional(),
        region: z.object({ city: z.string(), district: z.string().optional() }),
      }),
    })
    const form = createForm(addressForm)

    expect(form.field('street').state.required).toBe(true)
    expect(form.field('unit').state.required).toBe(false)
    expect(form.field('region.city').state.required).toBe(true)
    expect(form.field('region.district').state.required).toBe(false)
  })

  test('a key of a list in the schema is asked about an empty item at its place', () => {
    const tagsForm = defineGroup({
      schema: z.object({ tags: z.array(z.string()).min(1), notes: z.array(z.string().optional()).optional() }),
    })
    const form = createForm(tagsForm)

    expect(form.field('tags').state.required).toBe(true)
    expect(form.field('tags.2').state.required).toBe(true)
    expect(form.field('notes').state.required).toBe(false)
    expect(form.field('notes.0').state.required).toBe(false)
  })

  test('a key that another answer in its schema requires is not marked', () => {
    const contactForm = defineGroup({
      schema: z
        .object({
          contactBy: z.enum(['email', 'phone']),
          email: z.email().optional(),
          phone: z.string().optional(),
        })
        .refine(contact => contact.contactBy != 'phone' || contact.phone != undefined, {
          path: ['phone'],
          error: 'Enter a phone number',
        }),
    })
    const form = createForm(contactForm)

    expect(form.field('contactBy').state.required).toBe(true)
    form.field('contactBy').setValue('phone')
    expect(form.field('phone').state.required).toBe(false)
    expect(form.listErrors({ deep: true, includeHidden: true }).map(error => error.path)).toContain('phone')
  })

  test('a schema built from dependencies follows them', () => {
    const contactForm = defineGroupWithDeps<{ needsPhone: boolean }>()({
      schema: ({ deps }) => z.object({ phone: deps.needsPhone ? z.string() : z.string().optional() }),
      children: {
        email: defineFieldWithDeps<{ needsPhone: boolean }>()({
          schema: ({ deps }) => (deps.needsPhone ? z.email().optional() : z.email()),
        }),
      },
      childDeps: { email: ({ deps }) => deps },
    })
    const form = createForm(contactForm, { deps: { needsPhone: false } })

    expect(form.field('phone').state.required).toBe(false)
    expect(form.field('email').state.required).toBe(true)
    form.setDeps({ needsPhone: true })
    expect(form.field('phone').state.required).toBe(true)
    expect(form.field('email').state.required).toBe(false)
  })

  test('groups, arrays and parts that are turned off are never required', () => {
    const deliveryForm = defineGroup({
      schema: z.object({ method: z.enum(['shipping', 'pickup']) }),
      children: {
        address: defineGroup({ schema: z.object({ street: z.string() }) }),
        stops: arrayOf(defineField({ schema: z.string() })),
      },
      activeWhen: { address: ({ value }) => value.method == 'shipping' },
    })
    const form = createForm(deliveryForm, { initialValue: { method: 'pickup' } })

    expect(form.array('stops').state.required).toBe(false)
    expect(form.field('address.street').state.required).toBe(false)
    form.field('method').setValue('shipping')
    expect(form.field('address.street').state.required).toBe(true)
    expect(form.group('address').state.required).toBe(false)
  })

  test('a schema that answers asynchronously makes nothing required', () => {
    const asyncSchema: StandardSchemaV1<string | undefined, string> = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: async value => (typeof value == 'string' ? { value } : { issues: [{ message: 'Enter a name' }] }),
      },
    }
    const form = createForm(defineGroup({ children: { name: defineField({ schema: asyncSchema }) } }))

    expect(form.field('name').state.required).toBe(false)
  })

  test("a field's schema is asked about an empty value once while the schema stays the same", () => {
    const inputs: Array<unknown> = []
    const form = createForm(defineGroup({ children: { name: defineField({ schema: recordedNameSchema(inputs) }) } }), {
      initialValue: { name: 'Ada' },
    })
    const name = form.field('name')

    expect(name.state.required).toBe(true)
    name.setValue('Grace')
    expect(name.state.required).toBe(true)
    expect(inputs.filter(input => input == undefined)).toHaveLength(1)
  })

  test('one run of a schema with the form empty answers all of its keys, and a change asks nothing again', () => {
    const inputs: Array<unknown> = []
    const form = createForm(defineGroup({ schema: recordedContactSchema(inputs) }))
    const keys = ['email', 'phone', 'street', 'city', 'country']
    const runsBeforeReading = inputs.length

    expect(keys.map(key => form.field(key).state.required)).toEqual([false, false, false, false, false])
    expect(inputs).toHaveLength(runsBeforeReading + 1)
    form.field('email').setValue('ada@example.com')
    form.field('phone').setValue('555 0100')
    expect(keys.map(key => form.field(key).state.required)).toEqual([false, false, false, false, false])
    expect(inputs).toHaveLength(runsBeforeReading + 3)
  })
})
