import { describe, expect, test } from 'vite-plus/test'

import { PROMOTION_DEPS, createPromotionForm } from './fixtures/create-promotion-form'
import { createForm } from '../src'
import { promotionGroup } from './fixtures/promotion'

function createFormWithSlot() {
  return createForm(promotionGroup, {
    deps: PROMOTION_DEPS,
    initialValue: {
      spending: {
        maxDiscount: 100,
        period: 'DAILY',
        slots: [{ id: 1, amount: 10, dates: ['2026-11-01'] }],
      },
    },
  })
}

describe('array items', () => {
  test('items keep their identity when they move', () => {
    const slots = createPromotionForm().array('spending.slots')
    slots.push({ amount: 1, dates: ['2026-11-01'] })
    slots.push({ amount: 2, dates: ['2026-11-02'] })
    const [first, second] = slots.items

    slots.move(0, 1)

    expect(slots.items[0]).toBe(second)
    expect(slots.items[1]).toBe(first)
    expect(first.index).toBe(1)
    expect(first.path).toBe('spending.slots.1')
  })

  test('errors and touched state travel with their row', () => {
    const slots = createPromotionForm().array('spending.slots')
    slots.push({})
    const empty = slots.items[0]
    empty.field('amount').blur()

    slots.insert(0, { amount: 3, dates: ['2026-11-03'] })

    expect(empty.index).toBe(1)
    expect(empty.field('amount').state.errors).toEqual([
      expect.objectContaining({
        path: 'spending.slots.1.amount',
        code: 'Enter an amount',
      }),
    ])
    expect(slots.items[0].field('amount').state.errors).toEqual([])
  })

  test('a removed row is detached and ignores writes', () => {
    const form = createPromotionForm()
    const slots = form.array('spending.slots')
    slots.push({ amount: 1, dates: ['2026-11-01'] })
    const removed = slots.items[0]

    slots.remove(0)
    removed.setValue({ amount: 9, dates: [] })

    expect(removed.state.value).toBeUndefined()
    expect(slots.state.value).toEqual([])
  })

  test('the item list keeps its reference until the keys change', () => {
    const slots = createPromotionForm().array('spending.slots')
    slots.push({})
    const items = slots.items

    slots.items[0].field('amount').setValue(4)
    expect(slots.items).toBe(items)
    slots.push({})
    expect(slots.items).not.toBe(items)
  })
})

describe('baselines', () => {
  test('saving a row rebaselines only that row', async () => {
    const form = createFormWithSlot()
    const row = form.array('spending.slots').items[0]
    row.field('amount').setValue(20)
    form.field('spending.maxDiscount').setValue(200)
    expect(row.state.dirty).toBe(true)

    const outcome = await row.handleSubmit(value => {
      row.reset({ value })
    })()

    expect(outcome).toBe('success')
    expect(row.state.dirty).toBe(false)
    expect(form.field('spending.maxDiscount').state.dirty).toBe(true)
  })

  test('a saved new row joins the baseline of its list', () => {
    const form = createFormWithSlot()
    const slots = form.array('spending.slots')
    slots.push({ amount: 5, dates: ['2026-11-02'] })
    const added = slots.items[1]
    expect(slots.state.dirty).toBe(true)

    added.reset({ value: { id: 2, amount: 5, dates: ['2026-11-02'] } })

    expect(added.state.dirty).toBe(false)
    expect(slots.state.dirty).toBe(false)
  })

  test('reset without a value restores the baseline and its item keys', () => {
    const form = createFormWithSlot()
    const slots = form.array('spending.slots')
    const original = slots.items[0]
    const originalKey = original.key

    slots.remove(0)
    form.group('spending').reset()

    expect(slots.items[0].key).toBe(originalKey)
    expect(original.state.value).toEqual({ id: 1, amount: 10, dates: ['2026-11-01'] })
    expect(form.state.dirty).toBe(false)
  })
})
