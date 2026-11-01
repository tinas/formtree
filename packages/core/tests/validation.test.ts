import { describe, expect, test, vi } from 'vite-plus/test'
import { z } from 'zod'

import { createForm, defineFieldWithDeps, defineGroup } from '../src'
import { maxDiscountField } from './fixtures/promotion'
import { PROMOTION_DEPS, createPromotionForm } from './fixtures/create-promotion-form'

describe('schema, validate and display modes', () => {
  test('errors stay hidden until the field is touched, then follow every change', () => {
    const name = createPromotionForm().field('setup.name')

    expect(name.state.valid).toBe(false)
    expect(name.state.errors).toEqual([])
    name.blur()
    expect(name.state.errors).toEqual([
      expect.objectContaining({ path: 'setup.name', code: 'Enter a name', source: 'schema' }),
    ])
    name.setValue('Q4')
    expect(name.state.errors).toEqual([])
    expect(name.state.valid).toBe(true)
  })

  test('onSubmit mode shows errors only after a submit that covers them', async () => {
    const cell = createForm(maxDiscountField, { mode: 'onSubmit' })

    cell.blur()
    expect(cell.state.errors).toEqual([])
    await expect(cell.handleSubmit(vi.fn())()).resolves.toBe('invalid')
    expect(cell.state.errors).toEqual([expect.objectContaining({ code: 'Enter a maximum discount' })])
  })

  test('a group validate rule writes to a relative path', () => {
    const form = createPromotionForm()

    expect(form.array('eligibility.conditions').listErrors({ includeHidden: true })).toEqual([
      expect.objectContaining({
        path: 'eligibility.conditions',
        code: 'Add a condition or a group',
        source: 'validate',
      }),
    ])
  })

  test('a group validate rule runs on the draft while the schema fails', () => {
    const rangeGroup = defineGroup({
      schema: z.object({
        label: z.string({ error: 'Enter a label' }),
        min: z.number(),
        max: z.number(),
      }),
      validate: ({ value }) =>
        value.min != undefined && value.max != undefined && value.min > value.max
          ? { path: 'max', code: 'Max is below min' }
          : undefined,
    })
    const form = createForm(rangeGroup, { initialValue: { min: 5, max: 1 } })

    expect(form.field('label').listErrors({ includeHidden: true })).toEqual([
      expect.objectContaining({ code: 'Enter a label', source: 'schema' }),
    ])
    expect(form.field('max').listErrors({ includeHidden: true })).toEqual([
      expect.objectContaining({ code: 'Max is below min', source: 'validate' }),
    ])
  })

  test('an array validate rule relates rows to each other', () => {
    const slots = createPromotionForm().array('spending.slots')

    slots.push({ amount: 1, dates: ['2026-11-01'] })
    slots.push({ amount: 2, dates: ['2026-11-01'] })

    expect(slots.listErrors({ deep: true, includeHidden: true })).toEqual([
      expect.objectContaining({
        path: 'spending.slots.1.dates',
        code: 'This date is already used',
        params: { date: '2026-11-01' },
      }),
    ])
  })

  test('external errors show at once and clear when the value changes', () => {
    const form = createPromotionForm()
    const maxDiscount = form.field('spending.maxDiscount')
    maxDiscount.setValue(10)

    form.group('spending').setErrors([{ path: 'maxDiscount', code: 'server.too_low' }])
    expect(maxDiscount.state.errors).toEqual([
      { path: 'spending.maxDiscount', code: 'server.too_low', source: 'server' },
    ])
    maxDiscount.setValue(11)
    expect(maxDiscount.state.errors).toEqual([])
  })

  test('clearErrors removes external errors and leaves schema errors to their schema', () => {
    const form = createPromotionForm()
    const name = form.field('setup.name')
    name.blur()
    name.setErrors([{ code: 'server.locked' }], { clearOn: 'never' })

    name.clearErrors()

    expect(name.state.errors.map(error => error.code)).toEqual(['Enter a name'])
  })
})

describe('shapes', () => {
  test('inactive branches are neither validated nor part of the output, and keep their values', async () => {
    const reward = createPromotionForm().group('reward')

    reward.field('type').setValue('FIXED')
    expect(reward.state.valid).toBe(true)
    expect(reward.group('limits').state.active).toBe(false)

    reward.field('type').setValue('PERCENT')
    expect(reward.state.valid).toBe(false)
    reward.group('limits').setValue({ usage: 'ONCE', scope: 'CART' })
    await expect(reward.validate()).resolves.toEqual({
      valid: true,
      value: { type: 'PERCENT', limits: { usage: 'ONCE', scope: 'CART' } },
    })

    reward.field('type').setValue('FIXED')
    await expect(reward.validate()).resolves.toEqual({ valid: true, value: { type: 'FIXED' } })
    expect(reward.group('limits').state.value).toEqual({ usage: 'ONCE', scope: 'CART' })
  })

  test('nested activation follows its own parent', () => {
    const form = createPromotionForm()
    const gift = form.group('reward.gift')

    gift.field('delivery').setValue('SEPARATE')
    expect(gift.field('wrapping').state.active).toBe(false)
    form.field('reward.type').setValue('GIFT')
    gift.field('delivery').setValue('WITH_ORDER')
    expect(gift.field('wrapping').state.active).toBe(false)
    gift.field('delivery').setValue('SEPARATE')
    expect(gift.field('wrapping').state.active).toBe(true)
    expect(gift.field('wrapping').state.valid).toBe(false)
  })

  test('childDeps derived from the parent value rebuild the child schema', () => {
    const passwordField = defineFieldWithDeps<{ minLength: number }>()({
      schema: ({ deps }) => z.string().min(deps.minLength),
    })
    const accountGroup = defineGroup({
      schema: z.object({ role: z.enum(['member', 'admin']) }),
      children: { password: passwordField },
      childDeps: { password: ({ value }) => ({ minLength: value.role == 'admin' ? 12 : 8 }) },
    })
    const form = createForm(accountGroup, { initialValue: { role: 'member', password: 'ten chars!' } })

    expect(form.field('password').state.valid).toBe(true)
    form.field('role').setValue('admin')
    expect(form.field('password').state.valid).toBe(false)
  })

  test('deps rebuild schemas that depend on them', () => {
    const form = createPromotionForm()
    const conditions = form.array('eligibility.conditions')

    conditions.push({ attribute: 'spend', operator: 'GT', value: 1 })
    expect(conditions.items[0].state.valid).toBe(false)
    form.setDeps({ ...PROMOTION_DEPS, attributes: [{ id: 'spend' }] })
    expect(conditions.items[0].state.valid).toBe(true)
  })

  test('recursive definitions validate at every depth', () => {
    const form = createPromotionForm()
    const groups = form.array('eligibility.groups')

    groups.push({ operator: 'OR' })
    const nested = groups.items[0]

    expect(nested.array('conditions').listErrors({ includeHidden: true })).toEqual([
      expect.objectContaining({ path: 'eligibility.groups.0.conditions', code: 'Add a condition or a group' }),
    ])
    nested.array('conditions').push({ attribute: 'orders', operator: 'LT', value: 3 })
    expect(nested.state.valid).toBe(true)
  })
})
