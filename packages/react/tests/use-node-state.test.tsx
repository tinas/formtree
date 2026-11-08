import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { z } from 'zod'

import { arrayOf, defineGroup, useForm, useNodeState } from '../src'
import { PROFILE_DEPS, profileGroup } from './fixtures/profile'

afterEach(cleanup)

const tagsForm = defineGroup({
  schema: z.object({ title: z.string() }),
  children: { tags: arrayOf(z.string()) },
})

describe('useNodeState', () => {
  test('without a selector, the component re-renders when the state changes', () => {
    let form: ReturnType<typeof useForm<typeof profileGroup>> | undefined
    function Name() {
      form = useForm(profileGroup, { deps: PROFILE_DEPS })
      const name = useNodeState(form.field('name'))
      return <span>{name.value ?? 'empty'}</span>
    }
    render(<Name />)

    act(() => form?.field('name').setValue('Ada'))

    expect(screen.getByText('Ada')).toBeDefined()
  })

  test('with a selector, the component re-renders only when the selected value changes', () => {
    const renders = vi.fn()
    let form: ReturnType<typeof useForm<typeof profileGroup>> | undefined
    function Dirty() {
      form = useForm(profileGroup, { deps: PROFILE_DEPS })
      const dirty = useNodeState(form, form => form.state.dirty)
      renders()
      return <span>{dirty ? 'dirty' : 'clean'}</span>
    }
    render(<Dirty />)

    act(() => form?.field('name').setValue('A'))
    act(() => form?.field('name').setValue('Ad'))

    expect(renders).toHaveBeenCalledTimes(2)
    expect(screen.getByText('dirty')).toBeDefined()
  })

  test('a selector may return a new object of the values it read', () => {
    const renders = vi.fn()
    let form: ReturnType<typeof useForm<typeof profileGroup>> | undefined
    function Status() {
      form = useForm(profileGroup, { deps: PROFILE_DEPS })
      const { dirty, submitting } = useNodeState(form, form => ({
        dirty: form.state.dirty,
        submitting: form.state.submitting,
      }))
      renders()
      return <span>{`${dirty}:${submitting}`}</span>
    }
    render(<Status />)

    act(() => form?.field('name').setValue('A'))
    act(() => form?.field('name').setValue('Ad'))

    expect(renders).toHaveBeenCalledTimes(2)
    expect(screen.getByText('true:false')).toBeDefined()
  })

  test('a selector may return a new array of the values it read', () => {
    const renders = vi.fn()
    let form: ReturnType<typeof useForm<typeof profileGroup>> | undefined
    function Status() {
      form = useForm(profileGroup, { deps: PROFILE_DEPS })
      const [dirty, submitting] = useNodeState(form, form => [form.state.dirty, form.state.submitting])
      renders()
      return <span>{`${dirty}:${submitting}`}</span>
    }
    render(<Status />)

    act(() => form?.field('name').setValue('A'))
    act(() => form?.field('name').setValue('Ad'))

    expect(renders).toHaveBeenCalledTimes(2)
    expect(screen.getByText('true:false')).toBeDefined()
  })

  test('a list re-renders only when a row is added, removed or moved', () => {
    const renders = vi.fn()
    let form: ReturnType<typeof useForm<typeof tagsForm>> | undefined
    function Tags() {
      form = useForm(tagsForm)
      const tags = useNodeState(form.array('tags'), tags => tags.items)
      renders()
      return <span>{tags.length}</span>
    }
    render(<Tags />)

    act(() => form?.field('title').setValue('Hello'))
    act(() => form?.array('tags').push('news'))
    act(() => form?.array('tags').items[0]?.setValue('sport'))

    expect(renders).toHaveBeenCalledTimes(2)
    expect(screen.getByText('1')).toBeDefined()
  })

  test('an error summary re-renders only when the listed errors change', async () => {
    const renders = vi.fn()
    let form: ReturnType<typeof useForm<typeof profileGroup>> | undefined
    function Summary() {
      form = useForm(profileGroup, { deps: PROFILE_DEPS })
      const errors = useNodeState(form, form => form.listErrors({ deep: true }))
      renders()
      return (
        <ul>
          {errors.map(error => (
            <li key={error.targetId}>{error.code}</li>
          ))}
        </ul>
      )
    }
    render(<Summary />)

    act(() => form?.field('age').setValue(30))
    await act(() => form?.handleSubmit(() => {})())

    expect(renders).toHaveBeenCalledTimes(2)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
