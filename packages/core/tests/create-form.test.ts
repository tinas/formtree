import { describe, expect, test, vi } from 'vite-plus/test'
import { z } from 'zod'

import { arrayOf, createForm, defineField, defineGroup, defineGroupWithDeps } from '../src'
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
    expect(name.attributes).toEqual({
      id: 'promotion:setup.name',
      name: 'setup.name',
      'aria-invalid': 'false',
      'aria-describedby': null,
    })
    name.blur()
    expect(name.attributes['aria-describedby']).toBe('promotion:setup.name:error')
  })

  test('a node subscriber is notified only when that node changes, once per batch', () => {
    const form = createPromotionForm()
    const name = form.field('setup.name')
    const listener = vi.fn()
    name.subscribe(listener)

    form.field('spending.maxDiscount').setValue(5)
    expect(listener).not.toHaveBeenCalled()

    form.batch(() => {
      name.setValue('Q')
      name.setValue('Q4')
    })
    expect(listener).toHaveBeenCalledTimes(1)
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

  test('node state with visible errors keeps its reference while another node changes', () => {
    const form = createPromotionForm({ mode: 'all' })
    const name = form.field('setup.name')
    const before = name.state
    expect(before.errors).not.toEqual([])

    form.field('spending.maxDiscount').setValue(5)

    expect(name.state).toBe(before)
  })

  test('attributes keep their reference while no attribute changes', () => {
    const form = createPromotionForm()
    const name = form.field('setup.name')
    const attributes = name.attributes

    name.setValue('Q4')
    expect(name.attributes).toBe(attributes)

    name.setValue('')
    name.blur()
    expect(name.attributes).not.toBe(attributes)
  })

  test('an error list keeps its reference while the listed errors stay the same', async () => {
    const form = createPromotionForm()
    const errors = form.listErrors({ deep: true })

    form.field('spending.maxDiscount').setValue(5)
    expect(form.listErrors({ deep: true })).toBe(errors)

    await form.handleSubmit(() => {})()
    expect(form.listErrors({ deep: true })).not.toBe(errors)
  })

  test('error lists are kept per meaning of their options', () => {
    const form = createPromotionForm()

    expect(form.listErrors({ deep: true, includeHidden: true })).not.toEqual(form.listErrors({ deep: true }))
    expect(form.listErrors({ deep: false })).toBe(form.listErrors())
  })

  test('a field holding a file or a map is dirty once another one is chosen', () => {
    const uploadForm = defineGroup({
      children: {
        attachment: defineField({ schema: z.instanceof(File) }),
        labels: defineField({ schema: z.instanceof(Map) }),
      },
    })
    const form = createForm(uploadForm, {
      initialValue: {
        attachment: new File(['draft'], 'notes.txt', { lastModified: 0 }),
        labels: new Map([['color', 'red']]),
      },
    })
    const attachment = form.field('attachment')
    const labels = form.field('labels')

    attachment.setValue(new File(['final'], 'notes.txt', { lastModified: 0 }))
    labels.setValue(new Map([['color', 'blue']]))

    expect(attachment.state.dirty).toBe(true)
    expect(labels.state.dirty).toBe(true)
  })

  test('a class instance where a group is expected keeps its values', () => {
    class Address {
      city = 'Lisbon'
      street = 'Rua Augusta'
    }
    const addressGroup = defineGroup({ schema: z.object({ city: z.string(), street: z.string() }) })
    const form = createForm(defineGroup({ children: { address: addressGroup } }), {
      initialValue: { address: new Address() },
    })
    const address = form.group('address')

    expect(address.field('city').state.value).toBe('Lisbon')
    expect(address.state.dirty).toBe(false)
    address.field('street').setValue('Rua Nova')
    expect(address.state.value).toEqual({ city: 'Lisbon', street: 'Rua Nova' })
  })

  test('a path through the prototype key reaches no value and ignores writes', () => {
    const rolesForm = defineGroup({ schema: z.record(z.string(), z.record(z.string(), z.boolean())) })
    const form = createForm(rolesForm)
    const prototypeNode = form.field('__proto__')

    form.field('__proto__.isAdmin').setValue(true)

    expect(prototypeNode.state.value).toBeUndefined()
    expect(Object.hasOwn(form.state.value, '__proto__')).toBe(false)
    expect(Object.assign({}, form.state.value)).not.toHaveProperty('isAdmin')
  })

  test('a key named like an Object member is an ordinary key', () => {
    const builderForm = defineGroup({
      schema: z.record(z.string(), z.string()),
      children: { constructor: defineField({ schema: z.string().optional() }) },
    })
    const form = createForm(builderForm)
    const constructorField = form.field('constructor')

    expect(form.state.valid).toBe(true)
    expect(constructorField.state.value).toBeUndefined()
    expect(form.field('toString').state.value).toBeUndefined()
    constructorField.setValue('Ada')
    expect(form.state.value).toEqual({ constructor: 'Ada' })
  })

  test('values on a polluted Object.prototype never reach the form', () => {
    const pollution = {
      nickname: 'Mallory',
      contact: { email: 'mallory@example.com' },
      address: { city: 'Nowhere', isAdmin: true },
    }
    for (const [key, value] of Object.entries(pollution)) {
      Object.defineProperty(Object.prototype, key, { value, configurable: true, writable: true })
    }
    try {
      const profileForm = defineGroupWithDeps<{ nickname?: string }>()({
        schema: z.object({ address: z.record(z.string(), z.string()).optional() }),
        children: {
          nickname: defineField({ schema: z.string().optional() }),
          contact: defineGroup({ children: { phones: arrayOf(defineField({ schema: z.string() })) } }),
        },
      })
      const form = createForm(profileForm, { deps: {} })
      const nickname = form.field('nickname')
      const listener = vi.fn()
      form.subscribe(listener)

      expect(form.state.value).toEqual({ contact: { phones: [] } })
      expect(nickname.state.value).toBeUndefined()
      form.setDeps({ nickname: 'Mallory' })
      expect(listener).toHaveBeenCalledOnce()
      nickname.setValue('Mallory')
      expect(form.state.dirty).toBe(true)
      form.field('address.city').setValue('Lisbon')
      expect(form.state.value.address).toEqual({ city: 'Lisbon' })
    } finally {
      for (const key of Object.keys(pollution)) {
        Reflect.deleteProperty(Object.prototype, key)
      }
    }
  })
})
