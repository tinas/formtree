import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vite-plus/test'
import { computed, defineComponent, effectScope, h, nextTick, ref } from 'vue'
import { z } from 'zod'

import { defineField, useForm } from '../src'
import { PROFILE_DEPS, profileGroup } from './fixtures/profile'

describe('useForm', () => {
  test('templates re-render when a node changes', async () => {
    const Probe = defineComponent({
      setup() {
        const form = useForm(profileGroup, { deps: PROFILE_DEPS })
        const name = form.field('name')
        return () => h('button', { onClick: () => name.setValue('Ada') }, name.state.value ?? 'empty')
      },
    })
    const wrapper = mount(Probe)

    expect(wrapper.text()).toBe('empty')
    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toBe('Ada')
  })

  test('a computed over one field is not re-evaluated when another field changes', () => {
    const scope = effectScope()
    scope.run(() => {
      const form = useForm(profileGroup, { deps: PROFILE_DEPS })
      const evaluate = vi.fn(() => form.field('name').state.value)
      const name = computed(evaluate)

      expect(name.value).toBeUndefined()
      form.field('age').setValue(30)
      expect(name.value).toBeUndefined()
      form.field('name').setValue('Ada')
      expect(name.value).toBe('Ada')

      expect(evaluate).toHaveBeenCalledTimes(2)
    })
    scope.stop()
  })

  test('array items are reactive nodes that keep their identity', () => {
    const scope = effectScope()
    scope.run(() => {
      const form = useForm(profileGroup, { deps: PROFILE_DEPS })

      expect(form.group('address')).toBe(form.field('address'))
      expect(form.group('address').field('city')).toBe(form.field('address.city'))
    })
    scope.stop()
  })

  test('reactive deps are pushed into the form', async () => {
    const scope = effectScope()
    const minAge = ref(18)
    const form = scope.run(() => useForm(profileGroup, { deps: () => ({ minAge: minAge.value }) }))

    form?.field('age').setValue(16)
    expect(form?.field('age').state.valid).toBe(false)
    minAge.value = 10
    await nextTick()

    expect(form?.field('age').state.valid).toBe(true)
    scope.stop()
  })

  test('disposing the scope cancels pending async checks', async () => {
    vi.useFakeTimers()
    const run = vi.fn(() => undefined)
    const lookupField = defineField({
      schema: z.string(),
      validateAsync: { on: 'change', debounceMs: 100, run },
    })
    const scope = effectScope()
    const lookup = scope.run(() => useForm(lookupField, { initialValue: 'initial' }))

    lookup?.setValue('changed')
    scope.stop()
    await vi.advanceTimersByTimeAsync(100)

    expect(run).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
