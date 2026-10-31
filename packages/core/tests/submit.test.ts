import { describe, expect, test, vi } from 'vite-plus/test'

import { createForm } from '../src'
import { budgetAllocationGroup, totalBudgetField } from './fixtures/budget-allocation'
import { ALLOCATION_DEPS, createAllocationForm } from './fixtures/create-allocation-form'

describe('submit', () => {
  test('a step validates and submits only its own subtree', async () => {
    const form = createAllocationForm()
    const setup = form.group('setup')
    const onValid = vi.fn()
    setup.field('name').setValue('  Q4  ')
    setup.field('app').setValue({ appId: 7 })

    await expect(setup.handleSubmit(onValid)()).resolves.toBe('success')

    expect(onValid).toHaveBeenCalledWith({ app: { appId: 7 }, name: 'Q4' })
    expect(form.state.valid).toBe(false)
  })

  test('an invalid submit reveals errors inside the submitted subtree only', async () => {
    const form = createAllocationForm()

    await expect(form.group('setup').handleSubmit(vi.fn())()).resolves.toBe('invalid')

    expect(form.field('setup.name').state.errors).toHaveLength(1)
    expect(form.field('kpi.kpi').state.errors).toEqual([])
  })

  test('the root receives the composed output without inactive branches', async () => {
    const form = createForm(budgetAllocationGroup, {
      deps: ALLOCATION_DEPS,
      initialValue: {
        setup: { name: 'Q4', app: { appId: 7 } },
        kpi: { kpi: 'CPA', attribution: { reAttrType: 'EXCLUDE' } },
        campaignIdList: [1, 2],
        budget: { totalBudget: 100, strategy: 'DAILY' },
        guardrails: { operator: 'AND', conditions: [{ metric: 'cpa', operator: 'GT', value: 2 }] },
      },
    })
    const onValid = vi.fn()

    await expect(form.handleSubmit(onValid)()).resolves.toBe('success')

    expect(onValid).toHaveBeenCalledWith({
      campaignIdList: [1, 2],
      setup: { app: { appId: 7 }, name: 'Q4' },
      kpi: { kpi: 'CPA' },
      budget: { strategy: 'DAILY', totalBudget: 100, schedules: [] },
      guardrails: { operator: 'AND', conditions: [{ metric: 'cpa', operator: 'GT', value: 2 }], groups: [] },
    })
  })

  test('a field submits on its own, like an inline edit', async () => {
    const total = createAllocationForm().field('budget.totalBudget')
    const onValid = vi.fn()
    total.setValue(250)

    await expect(total.handleSubmit(onValid)()).resolves.toBe('success')

    expect(onValid).toHaveBeenCalledWith(250)
  })

  test('a lens node submits its validated input', async () => {
    const campaigns = createAllocationForm().field('campaignIdList')
    const onValid = vi.fn()

    await expect(campaigns.handleSubmit(onValid)()).resolves.toBe('invalid')
    campaigns.setValue([3])
    await expect(campaigns.handleSubmit(onValid)()).resolves.toBe('success')

    expect(onValid).toHaveBeenCalledWith([3])
  })

  test('errors returned by the handler are stored relative to the submitted node', async () => {
    const form = createAllocationForm()
    const budget = form.group('budget')
    budget.field('totalBudget').setValue(10)
    budget.field('strategy').setValue('DAILY')

    const outcome = await budget.handleSubmit(() => [{ path: 'totalBudget', code: 'server.too_low' }])()

    expect(outcome).toBe('rejected')
    expect(form.field('budget.totalBudget').state.errors).toEqual([
      expect.objectContaining({ code: 'server.too_low', source: 'server' }),
    ])
  })

  test('a second submit while the first is running is skipped', async () => {
    const cell = createForm(totalBudgetField, { initialValue: 5 })
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

  test('onInvalid receives the errors and validate() reveals nothing', async () => {
    const form = createAllocationForm()
    const onInvalid = vi.fn()

    await expect(form.group('setup').validate()).resolves.toMatchObject({ valid: false })
    expect(form.field('setup.name').state.errors).toEqual([])
    await form.group('setup').handleSubmit(vi.fn(), { onInvalid })()

    expect(onInvalid).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ path: 'setup.name' })]))
  })

  test('the first invalid field in document order receives focus', async () => {
    const form = createAllocationForm()
    document.body.innerHTML = `
      <input id="allocation:setup.app" />
      <input id="allocation:setup.name" />
    `

    await form.group('setup').handleSubmit(vi.fn())()

    expect(document.activeElement?.id).toBe('allocation:setup.app')
  })

  test('the summary receives focus when asked to', async () => {
    const form = createAllocationForm()
    document.body.innerHTML = `<div id="allocation:setup:summary" tabindex="-1"></div><input id="allocation:setup.name" />`

    await form.group('setup').handleSubmit(vi.fn(), { shouldFocusError: 'summary' })()

    expect(document.activeElement?.id).toBe('allocation:setup:summary')
  })

  test('focusElement decides how the first invalid field is focused', async () => {
    const focusElement = vi.fn()
    const form = createAllocationForm({ focusElement })
    document.body.innerHTML = `
      <input id="allocation:setup.app" />
      <input id="allocation:setup.name" />
    `

    await form.group('setup').handleSubmit(vi.fn())()

    expect(focusElement).toHaveBeenCalledExactlyOnceWith(document.getElementById('allocation:setup.app'))
    expect(document.activeElement).toBe(document.body)
  })

  test('a submit-level focusElement overrides the form option', async () => {
    const formFocus = vi.fn()
    const submitFocus = vi.fn()
    const form = createAllocationForm({ focusElement: formFocus })
    document.body.innerHTML = `<input id="allocation:setup.name" />`

    await form.group('setup').handleSubmit(vi.fn(), { focusElement: submitFocus })()

    expect(submitFocus).toHaveBeenCalledExactlyOnceWith(document.getElementById('allocation:setup.name'))
    expect(formFocus).not.toHaveBeenCalled()
  })

  test('the summary is focused through focusElement', async () => {
    const focusElement = vi.fn()
    const form = createAllocationForm({ focusElement, shouldFocusError: 'summary' })
    document.body.innerHTML = `<div id="allocation:setup:summary" tabindex="-1"></div>`

    await form.group('setup').handleSubmit(vi.fn())()

    expect(focusElement).toHaveBeenCalledExactlyOnceWith(document.getElementById('allocation:setup:summary'))
  })

  test('node.focus() goes through focusElement', () => {
    const focusElement = vi.fn()
    const form = createAllocationForm({ focusElement })
    document.body.innerHTML = `<input id="allocation:setup.name" />`

    form.field('setup.name').focus()

    expect(focusElement).toHaveBeenCalledExactlyOnceWith(document.getElementById('allocation:setup.name'))
  })
})
