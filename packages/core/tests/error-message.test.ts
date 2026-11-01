import { describe, expect, test } from 'vite-plus/test'
import { z } from 'zod'

import { createForm, defineField, defineGroup } from '../src'

const accountGroup = defineGroup({
  schema: z.object({
    name: z.string({ error: 'name.required' }).min(1, { error: 'name.required' }),
    password: z.string({ error: 'password.required' }).min(8, { error: 'password.too_short' }),
  }),
})

describe('errorMessage', () => {
  test('is the code of the first visible error, and undefined while the error is hidden', () => {
    const form = createForm(accountGroup)
    const name = form.field('name')

    expect(name.errorMessage).toBeUndefined()

    name.blur()

    expect(name.errorMessage).toBe('name.required')
  })

  test('is text from the formatError of the form', () => {
    const form = createForm(accountGroup, {
      formatError: error => `${error.code} (${error.source})`,
    })
    const password = form.field('password')

    password.setValue('short')
    password.blur()

    expect(password.errorMessage).toBe('password.too_short (schema)')
  })

  test('is read again on every access, so the formatter can change what it returns', () => {
    const messages = new Map([['name.required', 'Enter your name']])
    const form = createForm(accountGroup, { formatError: error => messages.get(error.code) ?? error.code })
    const name = form.field('name')
    name.blur()

    messages.set('name.required', 'Adınızı girin')

    expect(name.errorMessage).toBe('Adınızı girin')
  })

  test('is also the message of a field that is the root of a form', () => {
    const priceField = defineField({ schema: z.number({ error: 'price.required' }) })
    const form = createForm(priceField, { mode: 'all' })

    expect(form.errorMessage).toBe('price.required')
  })
})

describe('formatError', () => {
  test('turns any listed error into text, for an error summary', () => {
    const form = createForm(accountGroup, { mode: 'all', formatError: error => error.code.toUpperCase() })

    const summary = form.listErrors({ deep: true }).map(error => form.formatError(error))

    expect(summary).toEqual(['NAME.REQUIRED', 'PASSWORD.REQUIRED'])
  })
})
