import type { FormEvent, UniversalNode } from '../src'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { z } from 'zod'

import { createForm, defineField } from '../src'
import { createPromotionForm } from './fixtures/create-promotion-form'
import { nameChecks } from './fixtures/promotion'

function recordEvents(form: object): Array<FormEvent> {
  const events: Array<FormEvent> = []
  ;(form as unknown as UniversalNode).observe(event => events.push(event))
  return events
}

function typesOf(events: ReadonlyArray<FormEvent>): Array<string> {
  return events.map(event => (event.path == '' ? event.type : `${event.type} ${event.path}`))
}

const pendingCodeField = defineField({
  schema: z.string(),
  validateAsync: {
    on: 'change',
    debounceMs: 0,
    run: (_code, { signal }) =>
      new Promise<undefined>(resolve => {
        signal.addEventListener('abort', () => resolve(undefined))
      }),
  },
})

describe('form events', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    nameChecks.length = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('writes, blurs and resets report the path they touched', () => {
    const form = createPromotionForm()
    const events = recordEvents(form)
    const name = form.field('setup.name')

    name.setValue('Q4')
    name.blur()
    form.array('spending.slots').push({})
    form.group('setup').reset()

    expect(typesOf(events)).toEqual(['change setup.name', 'blur setup.name', 'change spending.slots', 'reset setup'])
  })

  test('a write that changes nothing reports nothing', () => {
    const form = createPromotionForm()
    const events = recordEvents(form)

    form.field('setup.name').setValue(undefined)

    expect(events).toEqual([])
  })

  test('a submit reports its start and its outcome', async () => {
    const form = createPromotionForm()
    const events = recordEvents(form)

    await form.group('setup').handleSubmit(() => {})()

    expect(events.filter(event => event.type.startsWith('submit'))).toEqual([
      { type: 'submitStart', path: 'setup' },
      { type: 'submitEnd', path: 'setup', outcome: 'invalid' },
    ])
  })

  test('a submit while the node is submitting reports a skipped outcome', async () => {
    const form = createForm(defineField({ schema: z.string() }), { initialValue: 'Ada' })
    const events = recordEvents(form)
    const saves: Array<() => void> = []
    const save = form.handleSubmit(
      () =>
        new Promise<void>(resolve => {
          saves.push(resolve)
        }),
    )

    const firstSubmit = save()
    await save()
    await vi.advanceTimersByTimeAsync(0)
    saves.forEach(finishSave => finishSave())
    await firstSubmit

    expect(events).toEqual([
      { type: 'submitStart', path: '' },
      { type: 'submitEnd', path: '', outcome: 'skipped' },
      { type: 'submitEnd', path: '', outcome: 'success' },
    ])
  })

  test('an asynchronous check reports its start, its result and a reused result', async () => {
    const form = createPromotionForm()
    const events = recordEvents(form)
    const name = form.field('setup.name')

    name.setValue('Taken')
    name.blur()
    await vi.advanceTimersByTimeAsync(300)
    name.setValue('Other')
    name.setValue('Taken')

    expect(events.filter(event => event.type.startsWith('check'))).toEqual([
      { type: 'checkStart', path: 'setup.name' },
      {
        type: 'checkEnd',
        path: 'setup.name',
        errors: [{ code: 'This name is already used' }],
        cached: false,
      },
      {
        type: 'checkEnd',
        path: 'setup.name',
        errors: [{ code: 'This name is already used' }],
        cached: true,
      },
    ])
  })

  test('a check that throws reports checkFail with what it threw', async () => {
    const failure = new Error('offline')
    const form = createForm(
      defineField({
        schema: z.string(),
        validateAsync: { on: 'change', debounceMs: 0, run: () => Promise.reject(failure) },
      }),
    )
    const events = recordEvents(form)

    form.setValue('A')
    await vi.advanceTimersByTimeAsync(0)

    expect(events.filter(event => event.type.startsWith('check'))).toEqual([
      { type: 'checkStart', path: '' },
      { type: 'checkFail', path: '', error: failure },
    ])
  })

  test('a change aborts a running check', async () => {
    const form = createForm(pendingCodeField)
    const events = recordEvents(form)

    form.setValue('A')
    await vi.advanceTimersByTimeAsync(0)
    form.setValue('B')

    expect(typesOf(events)).toEqual(['change', 'checkStart', 'checkAbort', 'change'])
  })

  test('dependencies and external errors report their node', () => {
    const form = createPromotionForm()
    const events = recordEvents(form)
    const name = form.field('setup.name')

    form.setDeps({ storeId: 7, attributes: [] })
    name.setErrors([{ code: 'Taken on the server' }])
    name.clearErrors()

    expect(typesOf(events)).toEqual(['deps', 'errors setup.name', 'errors setup.name'])
  })

  test('an observer that stopped receives nothing', () => {
    const form = createPromotionForm()
    const events: Array<FormEvent> = []
    const stopObserving = (form as unknown as UniversalNode).observe(event => events.push(event))

    stopObserving()
    form.field('setup.name').setValue('Q4')

    expect(events).toEqual([])
  })
})
