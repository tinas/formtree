import type { AsyncTrigger } from '../src'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { z } from 'zod'

import { arrayOf, createForm, defineField, defineGroup } from '../src'
import { nameChecks } from './fixtures/promotion'
import { createPromotionForm } from './fixtures/create-promotion-form'

const NETWORK_ERROR = new Error('Network error')

const offlineCheck = { run: () => Promise.reject(NETWORK_ERROR) }

const accountForm = defineGroup({
  schema: z.object({ plan: z.enum(['personal', 'business']) }),
  children: { vatId: defineField({ schema: z.string(), validateAsync: offlineCheck }) },
  activeWhen: { vatId: ({ value }) => value.plan == 'business' },
})

function createSignUpForm(on: AsyncTrigger) {
  const server = { calls: 0, down: true, taken: false }
  const usernameField = defineField({
    schema: z.string(),
    validateAsync: {
      on,
      debounceMs: 0,
      run: async () => {
        server.calls += 1
        if (server.down) {
          throw NETWORK_ERROR
        }
        return server.taken ? { code: 'This username is taken' } : undefined
      },
    },
  })
  const form = createForm(
    defineGroup({ children: { username: usernameField, email: defineField({ schema: z.string().optional() }) } }),
    { id: 'sign-up', mode: 'all' },
  )
  return { server, form, username: form.field('username') }
}

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

  test('a failed check is listed in failedChecks, not as an error', async () => {
    const { form, username } = createSignUpForm('change')

    username.setValue('alice')
    await vi.advanceTimersByTimeAsync(0)

    expect(username.state.errors).toEqual([])
    expect(username.state.failedChecks).toEqual([{ path: 'username', error: NETWORK_ERROR }])
    expect(username.state.valid).toBe(false)
    expect(username.attributes['aria-invalid']).toBe('false')
    expect(form.state.failedChecks).toEqual([{ path: 'username', error: NETWORK_ERROR }])
  })

  test('a failed check is not cached and runs again when its value comes back', async () => {
    const { server, username } = createSignUpForm('change')
    username.setValue('alice')
    await vi.advanceTimersByTimeAsync(0)

    server.down = false
    username.setValue('bob')
    await vi.advanceTimersByTimeAsync(0)
    username.setValue('alice')
    await vi.advanceTimersByTimeAsync(0)

    expect(server.calls).toBe(3)
    expect(username.state.failedChecks).toEqual([])
    expect(username.state.valid).toBe(true)
  })

  test('a submit runs a failed check again and is unchecked while it still fails', async () => {
    const { server, form, username } = createSignUpForm('change')
    const onValid = vi.fn()
    const onInvalid = vi.fn()
    username.setValue('alice')
    await vi.advanceTimersByTimeAsync(0)

    await expect(form.handleSubmit(onValid, { onInvalid })()).resolves.toBe('unchecked')
    expect(server.calls).toBe(2)
    expect(onValid).not.toHaveBeenCalled()
    expect(onInvalid).not.toHaveBeenCalled()

    server.down = false
    await expect(form.handleSubmit(onValid)()).resolves.toBe('success')
    expect(onValid).toHaveBeenCalledWith(expect.objectContaining({ username: 'alice' }))
  })

  test('validate runs a failed check again and reports it while it still fails', async () => {
    const { server, username } = createSignUpForm('change')
    username.setValue('alice')
    await vi.advanceTimersByTimeAsync(0)

    await expect(username.validate()).resolves.toEqual({
      valid: false,
      errors: [],
      failedChecks: [{ path: 'username', error: NETWORK_ERROR }],
    })

    server.down = false
    await expect(username.validate()).resolves.toEqual({ valid: true, value: 'alice' })
    expect(server.calls).toBe(3)
  })

  test('every validate call tries a failed check again', async () => {
    const { server, username } = createSignUpForm('change')
    username.setValue('alice')
    await vi.advanceTimersByTimeAsync(0)

    await username.validate()
    await username.validate()

    expect(server.calls).toBe(3)
  })

  test('ignoreCache asks again for a value whose answer is cached', async () => {
    const { server, username } = createSignUpForm('change')
    server.down = false
    username.setValue('alice')
    await vi.advanceTimersByTimeAsync(0)
    server.taken = true

    await expect(username.validate()).resolves.toMatchObject({ valid: true })
    await expect(username.validate({ ignoreCache: true })).resolves.toMatchObject({ valid: false })

    expect(server.calls).toBe(2)
    expect(username.state.errors).toEqual([expect.objectContaining({ code: 'This username is taken' })])
  })

  test('a submit with ignoreCache asks again before the handler', async () => {
    const { server, form, username } = createSignUpForm('change')
    const onValid = vi.fn()
    server.down = false
    username.setValue('alice')
    await vi.advanceTimersByTimeAsync(0)
    server.taken = true

    await expect(form.handleSubmit(onValid, { ignoreCache: true })()).resolves.toBe('invalid')

    expect(server.calls).toBe(2)
    expect(onValid).not.toHaveBeenCalled()
  })

  test('ignoreCache asks again when the schema of the checked value is asynchronous', async () => {
    const run = vi.fn(() => undefined)
    const codeField = defineField({
      schema: z.string().refine(async () => true),
      validateAsync: { debounceMs: 0, run },
    })
    const code = createForm(codeField, { initialValue: 'SAVE10' })
    await code.validate()

    await code.validate({ ignoreCache: true })

    expect(run).toHaveBeenCalledTimes(2)
  })

  test('a failed check that runs again is pending, not failed', async () => {
    const { username } = createSignUpForm('change')
    username.setValue('alice')
    await vi.advanceTimersByTimeAsync(0)

    const validation = username.validate()

    expect(username.state.validating).toBe(true)
    expect(username.state.failedChecks).toEqual([])
    await validation
  })

  test('a failed blur-triggered check runs again on the next blur', async () => {
    const { server, username } = createSignUpForm('blur')
    username.setValue('alice')
    username.blur()
    await vi.advanceTimersByTimeAsync(0)

    server.down = false
    username.blur()
    expect(username.state.validating).toBe(true)
    expect(username.state.failedChecks).toEqual([])
    await vi.advanceTimersByTimeAsync(0)

    expect(server.calls).toBe(2)
    expect(username.state.failedChecks).toEqual([])
  })

  test('a failed check does not run again while its value stays the same', async () => {
    const { server, form, username } = createSignUpForm('change')
    username.setValue('alice')
    await vi.advanceTimersByTimeAsync(0)

    form.field('email').setValue('alice@example.com')
    username.blur()
    await vi.advanceTimersByTimeAsync(0)

    expect(server.calls).toBe(1)
    expect(username.state.failedChecks).toHaveLength(1)
  })

  test('a submit with errors is invalid even when a check failed', async () => {
    const { form, username } = createSignUpForm('change')
    username.setValue('alice')
    await vi.advanceTimersByTimeAsync(0)
    form.field('email').setErrors([{ code: 'This email is already used' }])

    await expect(form.handleSubmit(vi.fn())()).resolves.toBe('invalid')
  })

  test('an unchecked submit focuses the field whose check failed', async () => {
    const { form, username } = createSignUpForm('change')
    username.setValue('alice')
    await vi.advanceTimersByTimeAsync(0)
    document.body.innerHTML = `<input id="sign-up:email" /><input id="sign-up:username" />`

    await form.handleSubmit(vi.fn())()

    expect(document.activeElement?.id).toBe('sign-up:username')
  })

  test('a check that throws synchronously fails like one that rejects', async () => {
    const lookupField = defineField({
      schema: z.string(),
      validateAsync: {
        on: 'submit',
        run: () => {
          throw NETWORK_ERROR
        },
      },
    })
    const lookup = createForm(lookupField, { initialValue: 'value' })

    await expect(lookup.handleSubmit(vi.fn())()).resolves.toBe('unchecked')

    expect(lookup.state.failedChecks).toEqual([{ path: '', error: NETWORK_ERROR }])
  })

  test('a failure from a run that a newer value replaced is ignored', async () => {
    const runs: Array<{ resolve: () => void; reject: (error: unknown) => void }> = []
    const lookupField = defineField({
      schema: z.string(),
      validateAsync: {
        debounceMs: 0,
        run: () =>
          new Promise<undefined>((resolve, reject) => {
            runs.push({ resolve: () => resolve(undefined), reject })
          }),
      },
    })
    const lookup = createForm(lookupField, { initialValue: 'initial' })
    lookup.setValue('a')
    await vi.advanceTimersByTimeAsync(0)
    lookup.setValue('b')
    await vi.advanceTimersByTimeAsync(0)

    runs[1].resolve()
    runs[0].reject(NETWORK_ERROR)
    await vi.advanceTimersByTimeAsync(0)

    expect(lookup.state.failedChecks).toEqual([])
    expect(lookup.state.valid).toBe(true)
  })

  test('removing a row clears the failed check of its value', async () => {
    const codesForm = defineGroup({
      children: { codes: arrayOf(defineField({ schema: z.string(), validateAsync: offlineCheck })) },
    })
    const form = createForm(codesForm, { initialValue: { codes: ['SAVE10'] } })
    await form.validate()
    expect(form.state.failedChecks).toHaveLength(1)

    form.array('codes').remove(0)

    expect(form.state.failedChecks).toEqual([])
  })

  test('a branch turned off clears its failed check', async () => {
    const form = createForm(accountForm, { initialValue: { plan: 'business', vatId: 'DE123' } })
    await form.validate()
    expect(form.state.failedChecks).toHaveLength(1)

    form.field('plan').setValue('personal')

    expect(form.state.failedChecks).toEqual([])
  })

  test('a reset that turns a branch off clears its failed check', async () => {
    const form = createForm(accountForm, { initialValue: { plan: 'personal' } })
    form.field('plan').setValue('business')
    form.field('vatId').setValue('DE123')
    await form.validate()
    expect(form.state.failedChecks).toHaveLength(1)

    form.reset()

    expect(form.state.failedChecks).toEqual([])
  })
})
