import type { ReactNode } from 'react'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vite-plus/test'

import { FormNodeProvider, useField, useForm, useFormNode } from '../src'
import { addressGroup, PROFILE_DEPS, profileGroup } from './fixtures/profile'

afterEach(cleanup)

interface Captured {
  form?: ReturnType<typeof useForm<typeof profileGroup>>
  address?: ReturnType<typeof useFormNode<typeof addressGroup>>
  root?: ReturnType<typeof useFormNode<typeof profileGroup>>
}

function AddressSection({ children }: { children: ReactNode }) {
  return <FormNodeProvider node={useFormNode(profileGroup).group('address')}>{children}</FormNodeProvider>
}

function renderProfile(leaf: ReactNode, captured: Captured) {
  function Page() {
    captured.form = useForm(profileGroup, { deps: PROFILE_DEPS })
    return (
      <FormNodeProvider node={captured.form}>
        <AddressSection>{leaf}</AddressSection>
      </FormNodeProvider>
    )
  }
  return render(<Page />)
}

describe('node context', () => {
  test('useFormNode finds the nearest provided node of a definition', () => {
    const captured: Captured = {}
    function Leaf() {
      captured.address = useFormNode(addressGroup)
      captured.root = useFormNode(profileGroup)
      return null
    }

    renderProfile(<Leaf />, captured)

    expect(captured.address).toBe(captured.form?.group('address'))
    expect(captured.root).toBe(captured.form)
  })

  test('useFormNode throws when no ancestor provided the definition', () => {
    function Lonely() {
      useFormNode(addressGroup)
      return null
    }

    expect(() => render(<Lonely />)).toThrow(
      '[formtree] useFormNode(definition) found no provided node for this definition.',
    )
  })

  test('useField binds a name relative to the provided node', () => {
    const captured: Captured = {}
    function CityInput() {
      const city = useField<string>('city')
      return <input {...city.attrs} value={city.value ?? ''} onChange={event => city.setValue(event.target.value)} />
    }
    renderProfile(<CityInput />, captured)
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'Ankara' } })
    expect(captured.form?.field('address.city').state.value).toBe('Ankara')
    expect(input.getAttribute('id')).toBe(captured.form?.field('address.city').id)
    expect(input.getAttribute('name')).toBe('address.city')

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe(captured.form?.field('address.city').errorId)
  })

  test('useField also accepts a typed node', () => {
    const captured: Captured = {}
    function NameInput() {
      const name = useField(useFormNode(profileGroup).field('name'))
      return <button onClick={() => name.setValue('Ada')}>{name.value ?? 'empty'}</button>
    }
    renderProfile(<NameInput />, captured)

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByRole('button').textContent).toBe('Ada')
  })
})
