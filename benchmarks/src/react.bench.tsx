import { FormNodeProvider, useField, useForm } from '@formtree/react'
import { fireEvent, render } from '@testing-library/react'
import { expect, test } from 'vite-plus/test'

import { answerOf, questionNames, questionnaireForm } from './fixtures'

function Questionnaire() {
  const form = useForm(questionnaireForm)
  return (
    <FormNodeProvider node={form}>
      {questionNames.map(name => (
        <QuestionInput key={name} name={name} />
      ))}
    </FormNodeProvider>
  )
}

function QuestionInput({ name }: { name: string }) {
  const field = useField<string>(name)
  return (
    <div>
      <input {...field.attrs} value={field.value ?? ''} onChange={event => field.setValue(event.target.value)} />
      <p id={field.errorId}>{field.errorMessage}</p>
    </div>
  )
}

test('rendering with React', async ({ bench }) => {
  await bench('react: mount a form with 100 questions', () => {
    render(<Questionnaire />).unmount()
  }).run()

  const view = render(<Questionnaire />)
  const input = view.container.querySelector('input')
  expect(input).not.toBeNull()
  let keystrokes = 0
  await bench('react: type into one of 100 questions', () => {
    keystrokes += 1
    fireEvent.change(input!, { target: { value: answerOf(keystrokes) } })
  }).run()
  view.unmount()
})
