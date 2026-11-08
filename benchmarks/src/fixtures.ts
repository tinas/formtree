import type { NodeState } from '@formtree/core'

import { arrayOf, defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'

export const QUESTION_COUNT = 100
export const ORDER_ROW_COUNT = 100

const SECTION_COUNT = 4
const TOPIC_COUNT = 5
const TOPIC_QUESTION_COUNT = 5

interface Subscribable {
  readonly subscribe: (listener: () => void) => () => void
  readonly state: NodeState<unknown>
}

export const questionNames = namesOf('question', QUESTION_COUNT)

export const questionnaireForm = defineGroup({
  schema: z.object(Object.fromEntries(questionNames.map(name => [name, answerSchema()]))),
})

export const questionFieldsForm = defineGroup({
  children: Object.fromEntries(questionNames.map(name => [name, defineField({ schema: answerSchema() })])),
})

const topicGroup = defineGroup({
  schema: z.object(Object.fromEntries(namesOf('question', TOPIC_QUESTION_COUNT).map(name => [name, answerSchema()]))),
})

const sectionGroup = defineGroup({
  children: Object.fromEntries(namesOf('topic', TOPIC_COUNT).map(name => [name, topicGroup])),
})

export const surveyForm = defineGroup({
  children: Object.fromEntries(namesOf('section', SECTION_COUNT).map(name => [name, sectionGroup])),
})

export const surveyQuestionPaths = namesOf('section', SECTION_COUNT).flatMap(section =>
  namesOf('topic', TOPIC_COUNT).flatMap(topic =>
    namesOf('question', TOPIC_QUESTION_COUNT).map(question => `${section}.${topic}.${question}`),
  ),
)

const orderRowGroup = defineGroup({
  schema: z.object({ product: z.string().min(1), quantity: z.number().int().min(1) }),
})

export const orderForm = defineGroup({
  children: { rows: arrayOf(orderRowGroup) },
})

export function orderRows(count: number): Array<{ product: string; quantity: number }> {
  return Array.from({ length: count }, (_, index) => orderRow(index))
}

export function orderRow(index: number): { product: string; quantity: number } {
  return { product: `Product ${index}`, quantity: index + 1 }
}

export function answerOf(keystroke: number): string {
  return 'answer'.slice(0, (keystroke % 6) + 1)
}

export function watchEach(nodes: Array<Subscribable>): void {
  for (const node of nodes) {
    node.subscribe(() => node.state)
  }
}

function answerSchema() {
  return z.string().min(1)
}

function namesOf(prefix: string, count: number): Array<string> {
  return Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`)
}
