import { describe, expect, test, vi } from 'vite-plus/test'

import { createForm } from '../src'
import { maxDiscountField } from './fixtures/promotion'
import { createPromotionForm, PROMOTION_DEPS } from './fixtures/create-promotion-form'

describe('createForm', () => {
  test('builds the declared structure and leaves schema values empty', () => {
    const form = createPromotionForm()

    expect(form.state.value).toEqual({
      setup: {},
      reward: { limits: {}, gift: {} },
      spending: { slots: [] },
      eligibility: { operator: 'AND', conditions: [], groups: [] },
    })
  })

  test('any definition can be a root, a field included', () => {
    const cell = createForm(maxDiscountField, { initialValue: 10 })

    expect(cell.state.value).toBe(10)
    expect(cell.state.valid).toBe(true)
    cell.setValue(-1)
    expect(cell.state.valid).toBe(false)
  })

  test('nodes are stable objects per position, whatever view reaches them', () => {
    const form = createPromotionForm()

    expect(form.field('setup.name')).toBe(form.field('setup.name'))
    expect(form.field('reward')).toBe(form.group('reward'))
    expect(form.group('setup').field('name')).toBe(form.field('setup.name'))
  })

  test('ids derive from the form id and the path', () => {
    const form = createPromotionForm()
    const name = form.field('setup.name')

    expect(form.id).toBe('promotion')
    expect(name.id).toBe('promotion:setup.name')
    expect(name.errorId).toBe('promotion:setup.name:error')
    expect(name.getAttributes()).toEqual({
      id: 'promotion:setup.name',
      name: 'setup.name',
      'aria-invalid': 'false',
      'aria-describedby': null,
    })
    name.blur()
    expect(name.getAttributes()['aria-describedby']).toBe('promotion:setup.name:error')
  })

  test('subscribers are notified once per batch', () => {
    const form = createPromotionForm()
    const listener = vi.fn()
    form.subscribe(listener)

    form.batch(() => {
      form.field('setup.name').setValue('Q4')
      form.field('spending.maxDiscount').setValue(5)
    })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('setDeps with dependencies equal key by key changes nothing', () => {
    const form = createPromotionForm()
    const listener = vi.fn()
    form.subscribe(listener)

    form.setDeps({ ...PROMOTION_DEPS })

    expect(listener).not.toHaveBeenCalled()
  })

  test('node state keeps its reference while nothing about the node changes', () => {
    const form = createPromotionForm()
    const name = form.field('setup.name')
    const before = name.state

    form.field('spending.maxDiscount').setValue(5)

    expect(name.state).toBe(before)
  })
})
