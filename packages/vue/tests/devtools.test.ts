import type { Form } from '../src'

import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { defineComponent, h } from 'vue'

import { useForm } from '../src'
import { formtreeDevtools } from '../src/devtools'
import { PROFILE_DEPS, profileGroup } from './fixtures/profile'

interface InspectorNode {
  readonly id: string
  readonly label: string
  readonly tags?: ReadonlyArray<{ readonly label: string; readonly tooltip?: string }>
  readonly children?: ReadonlyArray<InspectorNode>
}

interface StateEntry {
  readonly key: string
  readonly value: unknown
}

interface TreePayload {
  inspectorId: string
  filter: string
  rootNodes: ReadonlyArray<InspectorNode>
}

interface StatePayload {
  inspectorId: string
  nodeId: string
  state: Record<string, ReadonlyArray<StateEntry>>
}

const devtools = vi.hoisted(() => {
  return {
    readTree: undefined as ((payload: TreePayload) => void) | undefined,
    readState: undefined as ((payload: StatePayload) => void) | undefined,
    addTimelineEvent: undefined as unknown as ReturnType<typeof vi.fn>,
  }
})

vi.mock('@vue/devtools-api', () => ({
  setupDevtoolsPlugin: (_descriptor: unknown, setup: (api: unknown) => void) => {
    setup({
      addInspector: () => {},
      addTimelineLayer: () => {},
      addTimelineEvent: devtools.addTimelineEvent,
      sendInspectorTree: () => {},
      sendInspectorState: () => {},
      now: () => 0,
      on: {
        getInspectorTree: (handler: (payload: TreePayload) => void) => {
          devtools.readTree = handler
        },
        getInspectorState: (handler: (payload: StatePayload) => void) => {
          devtools.readState = handler
        },
      },
    })
  },
}))

interface TreeOutline {
  readonly label: string
  readonly children: ReadonlyArray<TreeOutline>
}

function readTree(filter = ''): ReadonlyArray<InspectorNode> {
  const payload: TreePayload = { inspectorId: 'formtree', filter, rootNodes: [] }
  devtools.readTree?.(payload)
  return payload.rootNodes
}

function outlineOf(nodes: ReadonlyArray<InspectorNode>): Array<TreeOutline> {
  return nodes.map(node => ({ label: node.label, children: outlineOf(node.children ?? []) }))
}

function readState(nodeId: string): StatePayload['state'] {
  const payload: StatePayload = { inspectorId: 'formtree', nodeId, state: {} }
  devtools.readState?.(payload)
  return payload.state
}

function mountProfileForm() {
  const forms: Array<Form<typeof profileGroup>> = []
  const ProfileForm = defineComponent({
    name: 'ProfileForm',
    setup() {
      forms.push(useForm(profileGroup, { deps: PROFILE_DEPS }))
      return () => h('form')
    },
  })
  const wrapper = mount(ProfileForm, { global: { plugins: [formtreeDevtools] } })
  const [form] = forms
  if (form == undefined) {
    throw new Error('ProfileForm did not create a form')
  }
  return { wrapper, form }
}

describe('formtreeDevtools', () => {
  beforeEach(() => {
    devtools.readTree = undefined
    devtools.readState = undefined
    devtools.addTimelineEvent = vi.fn()
  })

  test('lists every form under the component that created it, with its node tree', () => {
    mountProfileForm()

    expect(outlineOf(readTree())).toEqual([
      {
        label: 'ProfileForm',
        children: [
          { label: 'address', children: [{ label: 'city', children: [] }] },
          { label: 'age', children: [] },
          { label: 'name', children: [] },
        ],
      },
    ])
  })

  test('keeps the order of the tree while values are written', () => {
    const { form } = mountProfileForm()

    form.field('name').setValue('Ada')

    expect(readTree()[0]?.children?.map(node => node.label)).toEqual(['address', 'age', 'name'])
  })

  test('tags nodes with their kind and state', () => {
    const { form } = mountProfileForm()
    form.field('name').setValue('Ada')

    const name = readTree()[0]?.children?.find(node => node.label == 'name')

    expect(name?.tags?.map(tag => tag.label)).toEqual(['lens', 'dirty'])
  })

  test('counts the errors of a subtree by whether the user sees them, and counts submits', async () => {
    const { form } = mountProfileForm()

    expect(readTree()[0]?.tags?.map(tag => tag.label)).toEqual([form.id, 'group', '3 errors hidden'])

    await form.handleSubmit(() => {})()

    expect(readTree()[0]?.tags?.map(tag => tag.label)).toEqual([form.id, 'group', '3 errors shown', 'submitted ×1'])
  })

  test('explains every tag on hover', () => {
    mountProfileForm()

    const tags = readTree()[0]?.children?.flatMap(node => node.tags ?? []) ?? []

    expect(tags.length).toBeGreaterThan(0)
    expect(tags.every(tag => tag.tooltip != undefined && tag.tooltip.length > 0)).toBe(true)
  })

  test('filters the tree by label and keeps the ancestors of a match', () => {
    mountProfileForm()

    expect(outlineOf(readTree('cit'))).toEqual([
      { label: 'ProfileForm', children: [{ label: 'address', children: [{ label: 'city', children: [] }] }] },
    ])
  })

  test('shows the state and every error of a selected node', () => {
    const { form } = mountProfileForm()
    form.field('name').setValue('Ada')
    const name = readTree()[0]?.children?.find(node => node.label == 'name')

    const state = readState(name?.id ?? '')

    expect(state.node).toEqual([
      { key: 'kind', value: 'lens' },
      { key: 'path', value: 'name' },
      { key: 'id', value: form.field('name').id },
    ])
    expect(state.state).toContainEqual({ key: 'value', value: 'Ada' })
    expect(readState(readTree()[0]?.id ?? '').errors).toContainEqual({
      key: 'visible',
      value: [],
    })
  })

  test('puts changes, checks and submits on the timeline', async () => {
    const { form } = mountProfileForm()

    form.field('name').setValue('Ada')
    await form.handleSubmit(() => {})()

    expect(
      devtools.addTimelineEvent.mock.calls.map(([options]) => [options.event.title, options.event.subtitle]),
    ).toEqual([
      ['Change', 'ProfileForm · name'],
      ['Submit', 'ProfileForm'],
      ['Submit invalid', 'ProfileForm'],
    ])
    expect(devtools.addTimelineEvent.mock.calls.at(-1)?.[0].event.logType).toBe('warning')
  })

  test('drops a form when its component unmounts', () => {
    const { wrapper } = mountProfileForm()

    wrapper.unmount()

    expect(readTree()).toEqual([])
  })
})
