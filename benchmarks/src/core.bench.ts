import { createForm } from '@formtree/core'
import { expect, test } from 'vite-plus/test'

import {
  answerOf,
  ORDER_ROW_COUNT,
  orderForm,
  orderRow,
  orderRows,
  questionFieldsForm,
  questionNames,
  questionnaireForm,
  surveyForm,
  surveyQuestionPaths,
  watchEach,
} from './fixtures'

test('creating a form', async ({ bench }) => {
  await bench('core: create a form with 100 questions', () => {
    return createForm(questionnaireForm).field('question1').state
  }).run()

  await bench('core: create an order with 100 rows', () => {
    return createForm(orderForm, { initialValue: { rows: orderRows(ORDER_ROW_COUNT) } }).array('rows').state
  }).run()
})

test('typing into a field', async ({ bench }) => {
  const questionnaire = createForm(questionnaireForm)
  watchEach(questionNames.map(name => questionnaire.field(name)))
  let questionnaireKeystrokes = 0
  await bench('core: type into one of 100 questions under one schema', () => {
    questionnaireKeystrokes += 1
    questionnaire.field('question1').setValue(answerOf(questionnaireKeystrokes))
  }).run()

  const questionFields = createForm(questionFieldsForm)
  watchEach(questionNames.map(name => questionFields.field(name)))
  let fieldKeystrokes = 0
  await bench('core: type into one of 100 questions with their own schemas', () => {
    fieldKeystrokes += 1
    questionFields.field('question1').setValue(answerOf(fieldKeystrokes))
  }).run()

  const survey = createForm(surveyForm)
  watchEach(surveyQuestionPaths.map(path => survey.field(path)))
  let surveyKeystrokes = 0
  await bench('core: type into one of 100 questions three groups deep', () => {
    surveyKeystrokes += 1
    survey.field('section1.topic1.question1').setValue(answerOf(surveyKeystrokes))
  }).run()
})

test('editing a list', async ({ bench }) => {
  const order = createForm(orderForm, { initialValue: { rows: orderRows(ORDER_ROW_COUNT) } })
  const rows = order.array('rows')
  watchEach(rows.items.flatMap(row => [row.field('product'), row.field('quantity')]))

  let quantityKeystrokes = 0
  await bench('core: type into a row of 100', () => {
    quantityKeystrokes += 1
    order.field('rows.50.quantity').setValue(quantityKeystrokes)
  }).run()

  await bench('core: add and remove a row of 100', () => {
    rows.push(orderRow(ORDER_ROW_COUNT))
    rows.remove(ORDER_ROW_COUNT)
  }).run()

  await bench('core: move a row of 100', () => {
    rows.move(0, ORDER_ROW_COUNT - 1)
  }).run()
})

test('validating and submitting', async ({ bench }) => {
  const questionnaire = createForm(questionnaireForm, {
    initialValue: Object.fromEntries(questionNames.map(name => [name, 'answer'])),
  })

  await bench('core: validate 100 questions without the cache', async () => {
    await questionnaire.validate({ ignoreCache: true })
  }).run()

  let submitted: unknown
  await bench('core: submit 100 questions', async () => {
    await questionnaire.handleSubmit(answers => {
      submitted = answers
    })()
  }).run()
  expect(submitted).toBeDefined()
})
