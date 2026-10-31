import { describe, expect, test } from 'vite-plus/test'

import { ALLOCATION_DEPS, createAllocationForm } from './fixtures/create-allocation-form'
import { createForm } from '../src'
import { budgetAllocationGroup } from './fixtures/budget-allocation'

function createScheduledForm() {
  return createForm(budgetAllocationGroup, {
    deps: ALLOCATION_DEPS,
    initialValue: {
      budget: {
        totalBudget: 100,
        strategy: 'DAILY',
        schedules: [{ id: 1, totalBudget: 10, dateList: ['2026-11-01'] }],
      },
    },
  })
}

describe('array items', () => {
  test('items keep their identity when they move', () => {
    const schedules = createAllocationForm().array('budget.schedules')
    schedules.push({ totalBudget: 1, dateList: ['2026-11-01'] })
    schedules.push({ totalBudget: 2, dateList: ['2026-11-02'] })
    const [first, second] = schedules.items

    schedules.move(0, 1)

    expect(schedules.items[0]).toBe(second)
    expect(schedules.items[1]).toBe(first)
    expect(first.index).toBe(1)
    expect(first.path).toBe('budget.schedules.1')
  })

  test('errors and touched state travel with their row', () => {
    const schedules = createAllocationForm().array('budget.schedules')
    schedules.push({})
    const empty = schedules.items[0]
    empty.field('totalBudget').blur()

    schedules.insert(0, { totalBudget: 3, dateList: ['2026-11-03'] })

    expect(empty.index).toBe(1)
    expect(empty.field('totalBudget').state.errors).toEqual([
      expect.objectContaining({
        path: 'budget.schedules.1.totalBudget',
        code: 'budget_allocation.schedule_drawer.errors.amount_required',
      }),
    ])
    expect(schedules.items[0].field('totalBudget').state.errors).toEqual([])
  })

  test('a removed row is detached and ignores writes', () => {
    const form = createAllocationForm()
    const schedules = form.array('budget.schedules')
    schedules.push({ totalBudget: 1, dateList: ['2026-11-01'] })
    const removed = schedules.items[0]

    schedules.remove(0)
    removed.setValue({ totalBudget: 9, dateList: [] })

    expect(removed.state.value).toBeUndefined()
    expect(schedules.state.value).toEqual([])
  })

  test('the item list keeps its reference until the keys change', () => {
    const schedules = createAllocationForm().array('budget.schedules')
    schedules.push({})
    const items = schedules.items

    schedules.items[0].field('totalBudget').setValue(4)
    expect(schedules.items).toBe(items)
    schedules.push({})
    expect(schedules.items).not.toBe(items)
  })
})

describe('baselines', () => {
  test('saving a row rebaselines only that row', async () => {
    const form = createScheduledForm()
    const row = form.array('budget.schedules').items[0]
    row.field('totalBudget').setValue(20)
    form.field('budget.totalBudget').setValue(200)
    expect(row.state.dirty).toBe(true)

    const outcome = await row.handleSubmit(value => {
      row.reset({ value })
    })()

    expect(outcome).toBe('success')
    expect(row.state.dirty).toBe(false)
    expect(form.field('budget.totalBudget').state.dirty).toBe(true)
  })

  test('a saved new row joins the baseline of its list', () => {
    const form = createScheduledForm()
    const schedules = form.array('budget.schedules')
    schedules.push({ totalBudget: 5, dateList: ['2026-11-02'] })
    const added = schedules.items[1]
    expect(schedules.state.dirty).toBe(true)

    added.reset({ value: { id: 2, totalBudget: 5, dateList: ['2026-11-02'] } })

    expect(added.state.dirty).toBe(false)
    expect(schedules.state.dirty).toBe(false)
  })

  test('reset without a value restores the baseline and its item keys', () => {
    const form = createScheduledForm()
    const schedules = form.array('budget.schedules')
    const original = schedules.items[0]
    const originalKey = original.key

    schedules.remove(0)
    form.group('budget').reset()

    expect(schedules.items[0].key).toBe(originalKey)
    expect(original.state.value).toEqual({ id: 1, totalBudget: 10, dateList: ['2026-11-01'] })
    expect(form.state.dirty).toBe(false)
  })
})
