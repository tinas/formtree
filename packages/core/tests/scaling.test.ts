import type { FieldNode } from '../src'

import { describe, expect, test } from 'vite-plus/test'
import { z } from 'zod'

import { createForm, defineField, defineGroup } from '../src'

const KEYSTROKES = 40

function questionNames(count: number): Array<string> {
  return Array.from({ length: count }, (_, index) => `question${index + 1}`)
}

function answeredWith(names: ReadonlyArray<string>, answer: string): Record<string, string> {
  return Object.fromEntries(names.map(name => [name, answer]))
}

function questionsWithOwnSchemas(count: number): Array<FieldNode<string | undefined, string>> {
  const names = questionNames(count)
  const questionnaireForm = defineGroup({
    children: Object.fromEntries(names.map(name => [name, defineField({ schema: z.string().min(3) })])),
  })
  const form = createForm(questionnaireForm, { initialValue: answeredWith(names, 'a') })
  return names.map(name => form.field(name))
}

function questionsUnderOneSchema(count: number): Array<FieldNode<string | undefined, unknown>> {
  const names = questionNames(count)
  const questionnaireForm = defineGroup({
    schema: z.object(Object.fromEntries(names.map(name => [name, z.string().min(3)]))),
  })
  const form = createForm(questionnaireForm, { initialValue: answeredWith(names, 'answer') })
  return names.map(name => form.field(name))
}

function changeCostPerReader<Output>(questions: ReadonlyArray<FieldNode<string | undefined, Output>>): number {
  for (const question of questions) {
    question.subscribe(() => question.state)
  }
  const [question] = questions
  for (let keystroke = 0; keystroke < KEYSTROKES; keystroke += 1) {
    question.setValue('ab'.repeat((keystroke % 3) + 1))
  }
  const start = performance.now()
  for (let keystroke = 0; keystroke < KEYSTROKES; keystroke += 1) {
    question.setValue('ab'.repeat((keystroke % 3) + 1))
  }
  return (performance.now() - start) / KEYSTROKES / questions.length
}

describe('scaling', () => {
  test('a change costs each field that reads the form the same, however large the form', () => {
    const smallFormCost = changeCostPerReader(questionsWithOwnSchemas(100))
    const largeFormCost = changeCostPerReader(questionsWithOwnSchemas(1000))

    expect(largeFormCost / smallFormCost).toBeLessThan(2)
  })

  test('a change costs each answered key of a schema the same, however many keys it has', () => {
    const smallSchemaCost = changeCostPerReader(questionsUnderOneSchema(100))
    const largeSchemaCost = changeCostPerReader(questionsUnderOneSchema(1000))

    expect(largeSchemaCost / smallSchemaCost).toBeLessThan(2)
  })
})
