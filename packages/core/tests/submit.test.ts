import { describe, expect, test, vi } from 'vite-plus/test'
import { z } from 'zod'

import { createForm, defineField, defineGroup } from '../src'
import { promotionGroup, maxDiscountField, WRAPPING } from './fixtures/promotion'
import { PROMOTION_DEPS, createPromotionForm } from './fixtures/create-promotion-form'

describe('submit', () => {
  test('a step validates and submits only its own subtree', async () => {
    const form = createPromotionForm()
    const setup = form.group('setup')
    const onValid = vi.fn()
    setup.field('name').setValue('  Q4  ')
    setup.field('product').setValue({ productId: 7 })

    await expect(setup.handleSubmit(onValid)()).resolves.toBe('success')

    expect(onValid).toHaveBeenCalledWith({ product: { productId: 7 }, name: 'Q4' })
    expect(form.state.valid).toBe(false)
  })

  test('an invalid submit reveals errors inside the submitted subtree only', async () => {
    const form = createPromotionForm()

    await expect(form.group('setup').handleSubmit(vi.fn())()).resolves.toBe('invalid')

    expect(form.field('setup.name').state.errors).toHaveLength(1)
    expect(form.field('reward.type').state.errors).toEqual([])
  })

  test('the root receives the composed output without inactive branches', async () => {
    const form = createForm(promotionGroup, {
      deps: PROMOTION_DEPS,
      initialValue: {
        setup: { name: 'Q4', product: { productId: 7 } },
        reward: { type: 'FIXED', limits: { usage: 'ONCE' } },
        categoryIds: [1, 2],
        spending: { maxDiscount: 100, period: 'DAILY' },
        eligibility: { operator: 'AND', conditions: [{ attribute: 'orders', operator: 'GT', value: 2 }] },
      },
    })
    const onValid = vi.fn()

    await expect(form.handleSubmit(onValid)()).resolves.toBe('success')

    expect(onValid).toHaveBeenCalledWith({
      categoryIds: [1, 2],
      setup: { product: { productId: 7 }, name: 'Q4' },
      reward: { type: 'FIXED' },
      spending: { period: 'DAILY', maxDiscount: 100, slots: [] },
      eligibility: { operator: 'AND', conditions: [{ attribute: 'orders', operator: 'GT', value: 2 }], groups: [] },
    })
  })

  test('a schema default fills the output, never the draft', async () => {
    const packagingGroup = defineGroup({
      schema: z.object({ wrapping: z.enum(WRAPPING).default(WRAPPING.PAPER) }),
      children: { cardCount: defineField({ schema: z.number().int().default(1) }) },
    })
    const form = createForm(packagingGroup)
    const onValid = vi.fn()

    expect(form.state.valid).toBe(true)
    await expect(form.handleSubmit(onValid)()).resolves.toBe('success')

    expect(onValid).toHaveBeenCalledWith({ wrapping: WRAPPING.PAPER, cardCount: 1 })
    expect(form.state.value).toEqual({})
    expect(form.state.dirty).toBe(false)
  })

  test('a group schema that returns a class instance keeps its values in the output', async () => {
    class Address {
      city = ''
      street = ''
    }
    const addressGroup = defineGroup({
      schema: z
        .object({ city: z.string(), street: z.string() })
        .transform(value => Object.assign(new Address(), value)),
    })
    const form = createForm(defineGroup({ children: { address: addressGroup } }), {
      initialValue: { address: { city: 'Lisbon', street: 'Rua Augusta' } },
    })
    const onValid = vi.fn()

    await expect(form.handleSubmit(onValid)()).resolves.toBe('success')

    expect(onValid).toHaveBeenCalledWith({ address: { city: 'Lisbon', street: 'Rua Augusta' } })
  })

  test('a field submits on its own, like an inline edit', async () => {
    const maxDiscount = createPromotionForm().field('spending.maxDiscount')
    const onValid = vi.fn()
    maxDiscount.setValue(250)

    await expect(maxDiscount.handleSubmit(onValid)()).resolves.toBe('success')

    expect(onValid).toHaveBeenCalledWith(250)
  })

  test('a lens node submits its validated input', async () => {
    const categories = createPromotionForm().field('categoryIds')
    const onValid = vi.fn()

    await expect(categories.handleSubmit(onValid)()).resolves.toBe('invalid')
    categories.setValue([3])
    await expect(categories.handleSubmit(onValid)()).resolves.toBe('success')

    expect(onValid).toHaveBeenCalledWith([3])
  })

  test('errors the handler sets in the submitted node reject the submit', async () => {
    const form = createPromotionForm()
    const spending = form.group('spending')
    spending.field('maxDiscount').setValue(10)
    spending.field('period').setValue('DAILY')

    const outcome = await spending.handleSubmit(() => {
      spending.setErrors([{ path: 'maxDiscount', code: 'server.too_low' }])
    })()

    expect(outcome).toBe('rejected')
    expect(form.field('spending.maxDiscount').state.errors).toEqual([
      expect.objectContaining({ code: 'server.too_low', source: 'server' }),
    ])
  })

  test("the handler's return value is ignored, even one shaped like an error", async () => {
    const cell = createForm(maxDiscountField, { initialValue: 5 })

    const outcome = await cell.handleSubmit(async () => ({ code: 'saved' }))()

    expect(outcome).toBe('success')
    expect(cell.listErrors({ deep: true, includeHidden: true })).toEqual([])
  })

  test('a second submit while the first is running is skipped', async () => {
    const cell = createForm(maxDiscountField, { initialValue: 5 })
    const releases: Array<() => void> = []
    const onValid = vi.fn(() => new Promise<void>(resolve => releases.push(resolve)))
    const submit = cell.handleSubmit(onValid)

    const first = submit()
    await expect(submit()).resolves.toBe('skipped')
    await vi.waitFor(() => expect(onValid).toHaveBeenCalledTimes(1))
    releases.forEach(release => release())

    await expect(first).resolves.toBe('success')
    expect(cell.state.submitting).toBe(false)
    expect(cell.state.submitCount).toBe(1)
  })

  test('submitting an inactive branch is skipped without calling the handler', async () => {
    const form = createPromotionForm()
    form.field('reward.type').setValue('FIXED')
    const limits = form.group('reward.limits')
    const onValid = vi.fn()

    await expect(limits.handleSubmit(onValid)()).resolves.toBe('skipped')

    expect(onValid).not.toHaveBeenCalled()
    expect(limits.state.submitCount).toBe(0)
  })

  test('a root submit after a step submit reuses the results of the step', async () => {
    const validateStep = vi.fn(() => undefined)
    const checkStep = vi.fn(async () => undefined)
    const stepGroup = defineGroup({
      schema: z.object({ name: z.string() }),
      validate: validateStep,
      validateAsync: { on: 'submit', run: checkStep },
    })
    const form = createForm(defineGroup({ children: { step: stepGroup } }), {
      initialValue: { step: { name: 'Ada' } },
    })

    await form.group('step').handleSubmit(vi.fn())()
    validateStep.mockClear()
    await expect(form.handleSubmit(vi.fn())()).resolves.toBe('success')

    expect(validateStep).not.toHaveBeenCalled()
    expect(checkStep).toHaveBeenCalledTimes(1)
  })

  test('server errors from a step submit block a root submit until their value changes', async () => {
    const stepGroup = defineGroup({ schema: z.object({ name: z.string() }) })
    const form = createForm(defineGroup({ children: { step: stepGroup } }), {
      initialValue: { step: { name: 'Ada' } },
    })
    const step = form.group('step')
    await step.handleSubmit(() => {
      step.setErrors([{ path: 'name', code: 'server.taken' }])
    })()

    await expect(form.handleSubmit(vi.fn())()).resolves.toBe('invalid')
    form.field('step.name').setValue('Grace')
    await expect(form.handleSubmit(vi.fn())()).resolves.toBe('success')
  })

  test('onInvalid receives the errors and validate() reveals nothing', async () => {
    const form = createPromotionForm()
    const onInvalid = vi.fn()

    await expect(form.group('setup').validate()).resolves.toMatchObject({ valid: false })
    expect(form.field('setup.name').state.errors).toEqual([])
    await form.group('setup').handleSubmit(vi.fn(), { onInvalid })()

    expect(onInvalid).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ path: 'setup.name' })]))
  })

  test('the first invalid field on the page receives focus', async () => {
    const form = createPromotionForm()
    document.body.innerHTML = `
      <input id="promotion:setup.name" />
      <input id="promotion:setup.product" />
    `

    await form.group('setup').handleSubmit(vi.fn())()

    expect(document.activeElement?.id).toBe('promotion:setup.name')
  })

  test('focus skips an error whose element is hidden, such as one in a closed dialog', async () => {
    const form = createPromotionForm()
    document.body.innerHTML = `
      <dialog><input id="promotion:setup.product" /></dialog>
      <input id="promotion:setup.name" />
    `

    await form.group('setup').handleSubmit(vi.fn())()

    expect(document.activeElement?.id).toBe('promotion:setup.name')
  })

  test('onInvalid can open the dialog a field is in before focus moves', async () => {
    const form = createPromotionForm()
    document.body.innerHTML = `
      <dialog><input id="promotion:setup.product" /></dialog>
      <input id="promotion:setup.name" />
    `

    await form.group('setup').handleSubmit(vi.fn(), {
      onInvalid: () => document.querySelector('dialog')?.setAttribute('open', ''),
    })()

    expect(document.activeElement?.id).toBe('promotion:setup.product')
  })

  test('focus waits for onInvalid, so a field it renders can receive focus', async () => {
    const form = createPromotionForm()
    document.body.innerHTML = `<input id="promotion:setup.name" />`

    await form.group('setup').handleSubmit(vi.fn(), {
      onInvalid: async () => {
        await Promise.resolve()
        document.body.insertAdjacentHTML('afterbegin', '<input id="promotion:setup.product" />')
      },
    })()

    expect(document.activeElement?.id).toBe('promotion:setup.product')
  })

  test('focus moves once every check has answered, so a slow check above a sync error gets it', async () => {
    const signUpForm = defineGroup({
      children: {
        username: defineField({
          schema: z.string(),
          validateAsync: { debounceMs: 0, run: async () => ({ code: 'This username is taken' }) },
        }),
        email: defineField({ schema: z.email({ error: 'Enter a valid email address' }) }),
      },
    })
    const form = createForm(signUpForm, { id: 'sign-up', initialValue: { username: 'ada', email: 'ada' } })
    document.body.innerHTML = `
      <input id="sign-up:username" />
      <input id="sign-up:email" />
    `

    await form.handleSubmit(vi.fn())()

    expect(document.activeElement?.id).toBe('sign-up:username')
  })

  test('the summary receives focus when asked to', async () => {
    const form = createPromotionForm()
    document.body.innerHTML = `<div id="promotion:setup:summary" tabindex="-1"></div><input id="promotion:setup.name" />`

    await form.group('setup').handleSubmit(vi.fn(), { shouldFocusError: 'summary' })()

    expect(document.activeElement?.id).toBe('promotion:setup:summary')
  })

  test('focusElement decides how the first invalid field is focused', async () => {
    const focusElement = vi.fn()
    const form = createPromotionForm({ focusElement })
    document.body.innerHTML = `
      <input id="promotion:setup.product" />
      <input id="promotion:setup.name" />
    `

    await form.group('setup').handleSubmit(vi.fn())()

    expect(focusElement).toHaveBeenCalledExactlyOnceWith(document.getElementById('promotion:setup.product'))
    expect(document.activeElement).toBe(document.body)
  })

  test('a submit-level focusElement overrides the form option', async () => {
    const formFocus = vi.fn()
    const submitFocus = vi.fn()
    const form = createPromotionForm({ focusElement: formFocus })
    document.body.innerHTML = `<input id="promotion:setup.name" />`

    await form.group('setup').handleSubmit(vi.fn(), { focusElement: submitFocus })()

    expect(submitFocus).toHaveBeenCalledExactlyOnceWith(document.getElementById('promotion:setup.name'))
    expect(formFocus).not.toHaveBeenCalled()
  })

  test('the summary is focused through focusElement', async () => {
    const focusElement = vi.fn()
    const form = createPromotionForm({ focusElement, shouldFocusError: 'summary' })
    document.body.innerHTML = `<div id="promotion:setup:summary" tabindex="-1"></div>`

    await form.group('setup').handleSubmit(vi.fn())()

    expect(focusElement).toHaveBeenCalledExactlyOnceWith(document.getElementById('promotion:setup:summary'))
  })

  test('node.focus() goes through focusElement', () => {
    const focusElement = vi.fn()
    const form = createPromotionForm({ focusElement })
    document.body.innerHTML = `<input id="promotion:setup.name" />`

    form.field('setup.name').focus()

    expect(focusElement).toHaveBeenCalledExactlyOnceWith(document.getElementById('promotion:setup.name'))
  })
})
