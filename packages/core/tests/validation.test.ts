import { describe, expect, test, vi } from 'vite-plus/test'
import { z } from 'zod'

import { createForm, defineFieldWithDeps, defineGroup } from '../src'
import { totalBudgetField } from './fixtures/budget-allocation'
import { ALLOCATION_DEPS, createAllocationForm } from './fixtures/create-allocation-form'

describe('schema, validate and display modes', () => {
  test('errors stay hidden until the field is touched, then follow every change', () => {
    const name = createAllocationForm().field('setup.name')

    expect(name.state.valid).toBe(false)
    expect(name.state.errors).toEqual([])
    name.blur()
    expect(name.state.errors).toEqual([
      expect.objectContaining({ path: 'setup.name', code: 'budget_allocation.create.name.required', source: 'schema' }),
    ])
    name.setValue('Q4')
    expect(name.state.errors).toEqual([])
    expect(name.state.valid).toBe(true)
  })

  test('onSubmit mode shows errors only after a submit that covers them', async () => {
    const cell = createForm(totalBudgetField, { mode: 'onSubmit' })

    cell.blur()
    expect(cell.state.errors).toEqual([])
    await expect(cell.handleSubmit(vi.fn())()).resolves.toBe('invalid')
    expect(cell.state.errors).toEqual([
      expect.objectContaining({ code: 'budget_allocation.create.daily_budget.required' }),
    ])
  })

  test('a group validate rule writes to a relative path', () => {
    const form = createAllocationForm()

    expect(form.array('guardrails.conditions').listErrors({ includeHidden: true })).toEqual([
      expect.objectContaining({ path: 'guardrails.conditions', code: 'guardrails.group.empty', source: 'validate' }),
    ])
  })

  test('an array validate rule relates rows to each other', () => {
    const schedules = createAllocationForm().array('budget.schedules')

    schedules.push({ totalBudget: 1, dateList: ['2026-11-01'] })
    schedules.push({ totalBudget: 2, dateList: ['2026-11-01'] })

    expect(schedules.listErrors({ deep: true, includeHidden: true })).toEqual([
      expect.objectContaining({
        path: 'budget.schedules.1.dateList',
        code: 'budget_allocation.schedule_drawer.errors.date_overlap',
        params: { date: '2026-11-01' },
      }),
    ])
  })

  test('external errors show at once and clear when the value changes', () => {
    const form = createAllocationForm()
    const total = form.field('budget.totalBudget')
    total.setValue(10)

    form.group('budget').setErrors([{ path: 'totalBudget', code: 'server.too_low' }])
    expect(total.state.errors).toEqual([{ path: 'budget.totalBudget', code: 'server.too_low', source: 'server' }])
    total.setValue(11)
    expect(total.state.errors).toEqual([])
  })

  test('clearErrors removes external errors and leaves schema errors to their schema', () => {
    const form = createAllocationForm()
    const name = form.field('setup.name')
    name.blur()
    name.setErrors([{ code: 'server.locked' }], { clearOn: 'never' })

    name.clearErrors()

    expect(name.state.errors.map(error => error.code)).toEqual(['budget_allocation.create.name.required'])
  })
})

describe('shapes', () => {
  test('inactive branches are neither validated nor part of the output, and keep their values', async () => {
    const kpi = createAllocationForm().group('kpi')

    kpi.field('kpi').setValue('CPA')
    expect(kpi.state.valid).toBe(true)
    expect(kpi.group('attribution').state.active).toBe(false)

    kpi.field('kpi').setValue('CPI')
    expect(kpi.state.valid).toBe(false)
    kpi.group('attribution').setValue({ reAttrType: 'EXCLUDE', claimType: 'CLICK' })
    await expect(kpi.validate()).resolves.toEqual({
      valid: true,
      value: { kpi: 'CPI', attribution: { reAttrType: 'EXCLUDE', claimType: 'CLICK' } },
    })

    kpi.field('kpi').setValue('CPA')
    await expect(kpi.validate()).resolves.toEqual({ valid: true, value: { kpi: 'CPA' } })
    expect(kpi.group('attribution').state.value).toEqual({ reAttrType: 'EXCLUDE', claimType: 'CLICK' })
  })

  test('nested activation follows its own parent', () => {
    const form = createAllocationForm()
    const goal = form.group('kpi.goal')

    goal.field('attributedTime').setValue('INSTALL_TIME')
    expect(goal.field('kpiWindow').state.active).toBe(false)
    form.field('kpi.kpi').setValue('CPG')
    goal.field('attributedTime').setValue('EVENT_TIME')
    expect(goal.field('kpiWindow').state.active).toBe(false)
    goal.field('attributedTime').setValue('INSTALL_TIME')
    expect(goal.field('kpiWindow').state.active).toBe(true)
    expect(goal.field('kpiWindow').state.valid).toBe(false)
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
    const form = createAllocationForm()
    const conditions = form.array('guardrails.conditions')

    conditions.push({ metric: 'roas', operator: 'GT', value: 1 })
    expect(conditions.items[0].state.valid).toBe(false)
    form.setDeps({ ...ALLOCATION_DEPS, metrics: [{ id: 'roas' }] })
    expect(conditions.items[0].state.valid).toBe(true)
  })

  test('recursive definitions validate at every depth', () => {
    const form = createAllocationForm()
    const groups = form.array('guardrails.groups')

    groups.push({ operator: 'OR' })
    const nested = groups.items[0]

    expect(nested.array('conditions').listErrors({ includeHidden: true })).toEqual([
      expect.objectContaining({ path: 'guardrails.groups.0.conditions', code: 'guardrails.group.empty' }),
    ])
    nested.array('conditions').push({ metric: 'cpa', operator: 'LT', value: 3 })
    expect(nested.state.valid).toBe(true)
  })
})
