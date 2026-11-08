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

  test('a key follows the answer its schema depends on', () => {
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
    const phone = form.field('phone')

    expect(form.field('contactBy').state.required).toBe(true)
    expect(phone.state.required).toBe(false)
    form.field('contactBy').setValue('phone')
    expect(phone.state.required).toBe(true)
    expect(form.field('email').state.required).toBe(false)
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

  test("a key's schema is asked again only when the value it owns changes", () => {
    const inputs: Array<unknown> = []
    const profileForm = defineGroup({
      children: {
        contact: defineGroup({ schema: recordedContactSchema(inputs) }),
        nickname: defineField({ schema: z.string().optional() }),
      },
    })
    const form = createForm(profileForm)
    const email = form.field('contact.email')

    expect(email.state.required).toBe(false)
    const runsAfterFirstRead = inputs.length
    form.field('nickname').setValue('Ada')
    expect(email.state.required).toBe(false)
    expect(inputs).toHaveLength(runsAfterFirstRead)
    form.field('contact.phone').setValue('555')
    expect(email.state.required).toBe(false)
    expect(inputs).toHaveLength(runsAfterFirstRead + 2)
  })
})
