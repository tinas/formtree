import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { z } from 'zod'

import { ASYNC_FAILED_CODE, createForm, defineField, defineGroup } from '../src'
import { nameChecks } from './fixtures/promotion'
import { createPromotionForm } from './fixtures/create-promotion-form'

describe('async validation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    nameChecks.length = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('a blur-triggered check is debounced and receives the output and deps', async () => {
    const name = createPromotionForm().field('setup.name')

    name.setValue('  Q4  ')
    expect(nameChecks).toHaveLength(0)
    name.blur()
    expect(name.state.validating).toBe(true)
    await vi.advanceTimersByTimeAsync(300)

    expect(nameChecks).toEqual([expect.objectContaining({ name: 'Q4', storeId: 42 })])
    expect(name.state.validating).toBe(false)
  })

  test('a check does not run while the schema fails', async () => {
    const name = createPromotionForm().field('setup.name')

    name.setValue('   ')
    name.blur()
    await vi.advanceTimersByTimeAsync(300)

    expect(nameChecks).toHaveLength(0)
  })

  test('a check waits while a parent rule puts an error on its node', async () => {
    const checkedCodes: Array<string> = []
    const promoCodeField = defineField({
      schema: z.string(),
      validateAsync: {
        on: 'change',
        run: async code => {
          checkedCodes.push(code)
          return undefined
        },
      },
    })
    const orderGroup = defineGroup({
      schema: z.object({ paymentMethod: z.enum(['card', 'invoice']) }),
      children: { promoCode: promoCodeField },
      validate: ({ value }) =>
        value.paymentMethod == 'invoice' && value.promoCode != undefined
          ? { path: 'promoCode', code: 'Promo codes apply to card payments only' }
          : undefined,
    })
    const form = createForm(orderGroup, { initialValue: { paymentMethod: 'invoice' } })

    form.field('promoCode').setValue('WELCOME10')
    await vi.advanceTimersByTimeAsync(300)
    expect(checkedCodes).toEqual([])

    form.field('paymentMethod').setValue('card')
    await vi.advanceTimersByTimeAsync(300)
    expect(checkedCodes).toEqual(['WELCOME10'])
  })

  test('results become async errors and are cached per value', async () => {
    const name = createPromotionForm().field('setup.name')

    name.setValue('Taken')
    name.blur()
    await vi.advanceTimersByTimeAsync(300)
    expect(name.state.errors).toEqual([expect.objectContaining({ code: 'This name is already used', source: 'async' })])

    name.setValue('Other')
    expect(name.state.errors).toEqual([])
    name.blur()
    await vi.advanceTimersByTimeAsync(300)

    name.setValue('Taken')
    expect(name.state.errors).toEqual([expect.objectContaining({ code: 'This name is already used' })])
    expect(nameChecks).toHaveLength(2)
  })

  test('submit runs a check that has not run yet and waits for it', async () => {
    const form = createPromotionForm()
    const setup = form.group('setup')
    setup.field('name').setValue('Taken')
    setup.field('product').setValue({ productId: 7 })

    await expect(setup.handleSubmit(vi.fn())()).resolves.toBe('invalid')

    expect(nameChecks).toHaveLength(1)
  })

  test('a change-triggered check is aborted by the next change', async () => {
    const signals: Array<AbortSignal> = []
    const lookupField = defineField({
      schema: z.string(),
      validateAsync: {
        on: 'change',
        debounceMs: 100,
        run: (_value, { signal }) => {
          signals.push(signal)
          return new Promise<undefined>(() => undefined)
        },
      },
    })
    const lookup = createForm(lookupField, { initialValue: 'initial' })

    expect(signals).toHaveLength(0)
    lookup.setValue('a')
    await vi.advanceTimersByTimeAsync(100)
    expect(signals).toHaveLength(1)
    lookup.setValue('b')

    expect(signals[0].aborted).toBe(true)
  })

  test('a failing check becomes an error instead of throwing', async () => {
    const lookupField = defineField({
      schema: z.string(),
      validateAsync: {
        on: 'submit',
        run: () => Promise.reject(new Error('offline')),
      },
    })
    const lookup = createForm(lookupField, { initialValue: 'value' })

    await expect(lookup.handleSubmit(vi.fn())()).resolves.toBe('invalid')

    expect(lookup.state.errors).toEqual([expect.objectContaining({ code: ASYNC_FAILED_CODE, source: 'async' })])
  })
})
