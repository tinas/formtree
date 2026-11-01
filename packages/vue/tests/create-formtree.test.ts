import type { Form } from '../src'

import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vite-plus/test'
import { defineComponent, h, nextTick, ref } from 'vue'

import { createFormtree, useField, useForm } from '../src'
import { PROFILE_DEPS, profileGroup } from './fixtures/profile'

interface MountOptions {
  readonly plugins: Parameters<typeof mount>[1] extends infer Options
    ? Options extends { global?: { plugins?: infer Plugins } }
      ? Plugins
      : never
    : never
  readonly mode?: 'onChange'
}

function mountNameField({ plugins, mode }: MountOptions) {
  const forms: Array<Form<typeof profileGroup>> = []
  const NameField = defineComponent({
    setup() {
      const form = useForm(profileGroup, { deps: PROFILE_DEPS, mode })
      forms.push(form)
      const name = useField(form.field('name'))
      return () => h('p', name.errorMessage ?? '')
    },
  })
  const wrapper = mount(NameField, { global: { plugins } })
  const [form] = forms
  if (form == undefined) {
    throw new Error('NameField did not create a form')
  }
  return { wrapper, form }
}

describe('createFormtree', () => {
  test('gives every form of the app its defaults', async () => {
    const { wrapper, form } = mountNameField({
      plugins: [createFormtree({ mode: 'onChange', formatError: error => `!${error.code}`, devtools: false })],
    })

    form.field('name').setValue('')
    await nextTick()

    expect(wrapper.text()).toBe('!name.required')
  })

  test('lets options passed to useForm override the defaults', async () => {
    const { wrapper, form } = mountNameField({
      plugins: [createFormtree({ mode: 'onSubmit', devtools: false })],
      mode: 'onChange',
    })

    form.field('name').setValue('')
    await nextTick()

    expect(wrapper.text()).toBe('name.required')
  })

  test('shows a translated message in the current language', async () => {
    const language = ref<'en' | 'tr'>('en')
    const messages = { en: 'Enter your name', tr: 'Adınızı girin' }
    const { wrapper, form } = mountNameField({
      plugins: [createFormtree({ formatError: () => messages[language.value], devtools: false })],
    })
    form.field('name').blur()
    await nextTick()
    expect(wrapper.text()).toBe('Enter your name')

    language.value = 'tr'
    await nextTick()

    expect(wrapper.text()).toBe('Adınızı girin')
  })

  test('is optional: forms work without it', () => {
    const { form } = mountNameField({ plugins: [] })

    form.field('name').blur()

    expect(form.field('name').errorMessage).toBe('name.required')
  })
})
