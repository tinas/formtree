import type { FormatErrorOption, ValidationMode } from '../src'

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vite-plus/test'

import { FormTreeProvider, useField, useForm } from '../src'
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
    <FormTreeProvider {...defaults}>
      <NameField captured={captured} />
    </FormTreeProvider>,
  )
}

describe('FormTreeProvider', () => {
  test('gives every form below it its defaults', () => {
    const captured: Captured = {}
    renderNameField(captured, { mode: 'onChange', formatError: error => `!${error.code}` })

    act(() => captured.form?.field('name').setValue(''))

    expect(screen.getByTestId('message').textContent).toBe('!name.required')
  })

  test('lets options passed to useForm override the defaults', () => {
    const captured: Captured = {}
    render(
      <FormTreeProvider mode="onSubmit">
        <NameField captured={captured} mode="onChange" />
      </FormTreeProvider>,
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

  test('a new language re-renders the messages of every form below it', () => {
    const messages = { en: 'Enter your name', tr: 'Adınızı girin' }
    let language: keyof typeof messages = 'en'
    const captured: Captured = {}
    function App({ current }: { current: keyof typeof messages }) {
      return (
        <FormTreeProvider formatError={() => messages[language]} language={current}>
          <NameField captured={captured} />
        </FormTreeProvider>
      )
    }
    const { rerender } = render(<App current="en" />)
    act(() => captured.form?.field('name').blur())
    expect(screen.getByTestId('message').textContent).toBe('Enter your name')

    language = 'tr'
    rerender(<App current="tr" />)

    expect(screen.getByTestId('message').textContent).toBe('Adınızı girin')
  })
})
