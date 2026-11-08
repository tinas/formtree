import { describe, expect, test } from 'vite-plus/test'
import { z } from 'zod'

import { arrayOf, createForm, defineGroup } from '../src'

const contactForm = defineGroup({
  schema: z.object({
    name: z.string().min(1, { error: 'Enter your name' }),
    email: z.email({ error: 'Enter a valid email address' }),
    message: z.string().min(1, { error: 'Write a message' }),
  }),
})

const addressGroup = defineGroup({
  schema: z.object({ city: z.string().min(1, { error: 'Enter a city' }) }),
})

const orderForm = defineGroup({
  schema: z.object({ note: z.string().min(1, { error: 'Write a note' }) }),
  children: {
    shipping: addressGroup,
    billing: addressGroup,
    tags: arrayOf(z.string().min(1, { error: 'Enter a tag' })),
  },
})

describe('error order', () => {
  test('errors keep the order the schema reports them in', async () => {
    const form = createForm(contactForm)

    await form.handleSubmit(() => {})()

    expect(form.listErrors({ deep: true }).map(error => error.path)).toEqual(['name', 'email', 'message'])
  })

  test('a node lists its own errors first, then its children in declared order and its rows in list order', async () => {
    const form = createForm(orderForm, { initialValue: { tags: ['news', ''] } })
    form.array('tags').push('')

    await form.handleSubmit(() => {})()
    expect(form.listErrors({ deep: true }).map(error => error.path)).toEqual([
      'note',
      'shipping.city',
      'billing.city',
      'tags.1',
      'tags.2',
    ])

    form.array('tags').move(2, 0)
    expect(form.listErrors({ deep: true }).map(error => error.path)).toEqual([
      'note',
      'shipping.city',
      'billing.city',
      'tags.0',
      'tags.2',
    ])
  })

  test("a field's errors stay together, its own before those set from outside", async () => {
    const form = createForm(contactForm)
    form.setErrors([{ path: 'name', code: 'This name is taken' }])
    form.field('email').setValue('ada')

    await form.handleSubmit(() => {})()

    expect(form.listErrors({ deep: true }).map(error => `${error.path} ${error.source}`)).toEqual([
      'name schema',
      'name server',
      'email schema',
      'message schema',
    ])
    expect(form.field('name').state.errors.map(error => error.source)).toEqual(['schema', 'server'])
  })
})
