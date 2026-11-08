import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vite-plus/test'
import { z } from 'zod'

import { arrayOf, defineGroup, useField, useForm } from '../src'

afterEach(cleanup)

const tagsForm = defineGroup({
  children: { tags: arrayOf(z.string()) },
})

describe('useField', () => {
  test('an input follows its row when the row moves', () => {
    let form: ReturnType<typeof useForm<typeof tagsForm>> | undefined
    function Tags() {
      form = useForm(tagsForm, { id: 'post', initialValue: { tags: ['news', 'sport'] } })
      return null
    }
    render(<Tags />)
    const [news] = form?.array('tags').items ?? []
    if (news == undefined) {
      throw new Error('the form has no tags')
    }
    const newsNode: typeof news = news
    function NewsTag() {
      const tag = useField(newsNode)
      return <input {...tag.attrs} value={tag.value ?? ''} onChange={() => {}} />
    }
    render(<NewsTag />)

    act(() => form?.array('tags').move(0, 1))

    expect(screen.getByRole('textbox').getAttribute('id')).toBe('post:tags.1')
  })
})
