import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vite-plus/test'
import { defineComponent, h } from 'vue'

import { injectFormNode, provideFormNode, useField, useForm } from '../src'
import { addressGroup, PROFILE_DEPS, profileGroup } from './fixtures/profile'

interface Captured {
  form?: ReturnType<typeof useForm<typeof profileGroup>>
  address?: ReturnType<typeof injectFormNode<typeof addressGroup>>
  root?: ReturnType<typeof injectFormNode<typeof profileGroup>>
}

function mountProfile(Leaf: ReturnType<typeof defineComponent>, captured: Captured) {
  const AddressSection = defineComponent({
    setup() {
      provideFormNode(injectFormNode(profileGroup).group('address'))
      return () => h(Leaf)
    },
  })
  const Page = defineComponent({
    setup() {
      captured.form = provideFormNode(useForm(profileGroup, { deps: PROFILE_DEPS }))
      return () => h(AddressSection)
    },
  })
  return mount(Page)
}

describe('node context', () => {
  test('injectFormNode finds the nearest provided node of a definition', () => {
    const captured: Captured = {}
    const Leaf = defineComponent({
      setup() {
        captured.address = injectFormNode(addressGroup)
        captured.root = injectFormNode(profileGroup)
        return () => h('span')
      },
    })

    mountProfile(Leaf, captured)

    expect(captured.address).toBe(captured.form?.group('address'))
    expect(captured.root).toBe(captured.form)
  })

  test('injectFormNode throws when no ancestor provided the definition', () => {
    const Lonely = defineComponent({
      setup() {
        injectFormNode(addressGroup)
        return () => h('span')
      },
    })

    expect(() => mount(Lonely)).toThrow(
      '[formtree] injectFormNode(definition) found no provided node for this definition.',
    )
  })

  test('useField binds a name relative to the provided node', async () => {
    const captured: Captured = {}
    const CityInput = defineComponent({
      setup() {
        const city = useField<string>(() => 'city')
        return () =>
          h('input', {
            ...city.attrs,
            value: city.model ?? '',
            onInput: (event: Event) => {
              city.model = (event.target as HTMLInputElement).value
            },
          })
      },
    })
    const wrapper = mountProfile(CityInput, captured)
    const input = wrapper.find('input')

    await input.setValue('Ankara')
    expect(captured.form?.field('address.city').state.value).toBe('Ankara')
    expect(input.attributes('id')).toBe(captured.form?.field('address.city').id)
    expect(input.attributes('name')).toBe('address.city')

    await input.setValue('')
    await input.trigger('blur')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe(captured.form?.field('address.city').errorId)
  })

  test('useField also accepts a typed node', () => {
    const captured: Captured = {}
    const NameInput = defineComponent({
      setup() {
        const name = useField(injectFormNode(profileGroup).field('name'))
        name.model = 'Ada'
        return () => h('span', name.state.value)
      },
    })

    const wrapper = mountProfile(NameInput, captured)

    expect(wrapper.text()).toBe('Ada')
  })
})
