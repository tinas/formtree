import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { memo, StrictMode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { z } from 'zod'

import { defineField, FormNodeProvider, useField, useForm, useNodeState } from '../src'
import { PROFILE_DEPS, profileGroup } from './fixtures/profile'

afterEach(cleanup)

describe('useForm', () => {
  test('the component re-renders when the state of the root changes', () => {
    function Profile() {
      const form = useForm(profileGroup, { deps: PROFILE_DEPS })
      return <button onClick={() => form.field('name').setValue('Ada')}>{form.state.value.name ?? 'empty'}</button>
    }
    render(<Profile />)

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByRole('button').textContent).toBe('Ada')
  })

  test('the form keeps working after StrictMode runs its effects twice', () => {
    function Profile() {
      const form = useForm(profileGroup, { deps: PROFILE_DEPS })
      return <button onClick={() => form.field('name').setValue('Ada')}>{form.state.value.name ?? 'empty'}</button>
    }
    render(
      <StrictMode>
        <Profile />
      </StrictMode>,
    )

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByRole('button').textContent).toBe('Ada')
  })

  test('a field component does not re-render when another field changes', () => {
    const renders = vi.fn()
    const NameLabel = memo(function NameLabel() {
      const name = useField<string>('name')
      renders()
      return <span>{name.value ?? 'empty'}</span>
    })
    let form: ReturnType<typeof useForm<typeof profileGroup>> | undefined
    function Profile() {
      form = useForm(profileGroup, { deps: PROFILE_DEPS })
      return (
        <FormNodeProvider node={form}>
          <NameLabel />
        </FormNodeProvider>
      )
    }
    render(<Profile />)
    renders.mockClear()

    act(() => form?.field('age').setValue(30))
    expect(renders).not.toHaveBeenCalled()
    act(() => form?.field('name').setValue('Ada'))

    expect(renders).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Ada')).toBeDefined()
  })

  test('new deps written inline reach the form', () => {
    function Age({ minAge }: { minAge: number }) {
      const form = useForm(profileGroup, { deps: { minAge }, initialValue: { age: 16 } })
      const age = useNodeState(form.field('age'))
      return <span>{age.valid ? 'valid' : 'invalid'}</span>
    }
    const { rerender } = render(<Age minAge={18} />)
    expect(screen.getByText('invalid')).toBeDefined()

    rerender(<Age minAge={10} />)

    expect(screen.getByText('valid')).toBeDefined()
  })

  test('the form id comes from useId unless one is given', () => {
    function Ids() {
      const generated = useForm(profileGroup, { deps: PROFILE_DEPS })
      const named = useForm(profileGroup, { deps: PROFILE_DEPS, id: 'profile' })
      return (
        <>
          <span>{generated.id}</span>
          <span>{named.field('name').id}</span>
        </>
      )
    }
    render(<Ids />)

    expect(screen.getByText('profile:name')).toBeDefined()
    expect(screen.queryByText(/^formtree-/)).toBeNull()
  })

  test('unmounting cancels pending async checks', async () => {
    vi.useFakeTimers()
    const run = vi.fn(() => undefined)
    const lookupField = defineField({
      schema: z.string(),
      validateAsync: { on: 'change', debounceMs: 100, run },
    })
    let lookup: ReturnType<typeof useForm<typeof lookupField>> | undefined
    function Lookup() {
      lookup = useForm(lookupField, { initialValue: 'initial' })
      return null
    }
    const { unmount } = render(<Lookup />)

    act(() => lookup?.setValue('changed'))
    unmount()
    await vi.advanceTimersByTimeAsync(100)

    expect(run).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
