import { describe, expect, test } from 'vite-plus/test'
import { z } from 'zod'

import { createForm, defineField, defineGroup } from '../src'

const KEYSTROKES = 40

function changeCostPerReader(fieldCount: number): number {
  const names = Array.from({ length: fieldCount }, (_, index) => `question${index + 1}`)
  const questionnaireForm = defineGroup({
    children: Object.fromEntries(names.map(name => [name, defineField({ schema: z.string().min(3) })])),
  })
  const form = createForm(questionnaireForm, { initialValue: Object.fromEntries(names.map(name => [name, 'a'])) })
  for (const name of names) {
    const question = form.field(name)
    question.subscribe(() => question.state)
  }
  const question = form.field('question1')
  for (let keystroke = 0; keystroke < KEYSTROKES; keystroke += 1) {
    question.setValue('ab'.repeat((keystroke % 3) + 1))
  }
  const start = performance.now()
  for (let keystroke = 0; keystroke < KEYSTROKES; keystroke += 1) {
    question.setValue('ab'.repeat((keystroke % 3) + 1))
  }
  return (performance.now() - start) / KEYSTROKES / fieldCount
}

describe('scaling', () => {
  test('a change costs each field that reads the form the same, however large the form', () => {
    const smallFormCost = changeCostPerReader(100)
    const largeFormCost = changeCostPerReader(1000)

    expect(largeFormCost / smallFormCost).toBeLessThan(2)
  })
})
