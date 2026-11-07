import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vite-plus/test'
import { computed, defineComponent, effectScope, h, nextTick, ref } from 'vue'
import { z } from 'zod'

import { arrayOf, defineField, defineGroup, provideFormNode, useField, useForm } from '../src'
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

  test('a field component re-renders only when its own field changes', async () => {
    const render = vi.fn()
    const NameField = defineComponent({
      setup() {
        const field = useField<string>('name')
        return () => {
          render()
          return h('input', {
            ...field.attrs,
            value: field.model,
            title: field.errorMessage,
            'aria-errormessage': field.errorId,
            'data-description-id': field.descriptionId,
          })
        }
      },
    })
    const forms: Array<ReturnType<typeof useForm<typeof profileGroup>>> = []
    const Page = defineComponent({
      setup() {
        forms.push(provideFormNode(useForm(profileGroup, { deps: PROFILE_DEPS, mode: 'onChange' })))
        return () => h(NameField)
      },
    })
    mount(Page)
    const [form] = forms

    form?.field('age').setValue(16)
    await nextTick()
    expect(render).toHaveBeenCalledTimes(1)

    form?.field('name').setValue('')
    await nextTick()

    expect(render).toHaveBeenCalledTimes(2)
  })

  test('a computed over array items is not re-evaluated when another field changes', () => {
    const postForm = defineGroup({
      schema: z.object({ title: z.string() }),
      children: { tags: arrayOf(z.string()) },
    })
    const scope = effectScope()
    scope.run(() => {
      const form = useForm(postForm)
      const evaluate = vi.fn(() => form.array('tags').items.length)
      const tagCount = computed(evaluate)

      expect(tagCount.value).toBe(0)
      form.field('title').setValue('Hello')
      expect(tagCount.value).toBe(0)
      form.array('tags').push('news')
      expect(tagCount.value).toBe(1)

      expect(evaluate).toHaveBeenCalledTimes(2)
    })
    scope.stop()
  })

  test('an error summary re-renders only when the listed errors change', async () => {
    const render = vi.fn()
    const forms: Array<ReturnType<typeof useForm<typeof profileGroup>>> = []
    const Summary = defineComponent({
      setup() {
        const form = useForm(profileGroup, { deps: PROFILE_DEPS })
        forms.push(form)
        return () => {
          render()
          return h(
            'ul',
            form.listErrors({ deep: true }).map(error => h('li', error.code)),
          )
        }
      },
    })
    const wrapper = mount(Summary)
    const [form] = forms

    form?.field('age').setValue(30)
    await nextTick()
    expect(render).toHaveBeenCalledTimes(1)

    await form?.handleSubmit(() => {})()
    await nextTick()

    expect(render).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('li')).toHaveLength(2)
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
