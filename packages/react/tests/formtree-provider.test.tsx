import type { FormatErrorOption, ValidationMode } from '../src'

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vite-plus/test'

import { FormtreeProvider, useField, useForm } from '../src'
import { PROFILE_DEPS, profileGroup } from './fixtures/profile'

afterEach(cleanup)

interface Captured {
  form?: ReturnType<typeof useForm<typeof profileGroup>>
}

function NameField({ captured, mode }: { captured: Captured; mode?: ValidationMode }) {
  const form = useForm(profileGroup, { deps: PROFILE_DEPS, mode })
  captured.form = form
  const name = useField(form.field('name'))
  return <p data-testid="message">{name.errorMessage ?? ''}</p>
}

function renderNameField(captured: Captured, defaults: { mode?: ValidationMode; formatError?: FormatErrorOption }) {
  return render(
    <FormtreeProvider {...defaults}>
      <NameField captured={captured} />
    </FormtreeProvider>,
  )
}

describe('FormtreeProvider', () => {
  test('gives every form below it its defaults', () => {
    const captured: Captured = {}
    renderNameField(captured, { mode: 'onChange', formatError: error => `!${error.code}` })

    act(() => captured.form?.field('name').setValue(''))

    expect(screen.getByTestId('message').textContent).toBe('!name.required')
  })

  test('lets options passed to useForm override the defaults', () => {
    const captured: Captured = {}
    render(
      <FormtreeProvider mode="onSubmit">
        <NameField captured={captured} mode="onChange" />
      </FormtreeProvider>,
    )

    act(() => captured.form?.field('name').setValue(''))

    expect(screen.getByTestId('message').textContent).toBe('name.required')
  })

  test('is optional: forms work without it', () => {
    const captured: Captured = {}
    render(<NameField captured={captured} />)

    act(() => captured.form?.field('name').blur())

    expect(screen.getByTestId('message').textContent).toBe('name.required')
  })
})
