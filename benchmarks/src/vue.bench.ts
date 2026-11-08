import { provideFormNode, useField, useForm } from '@formtree/vue'
import { mount } from '@vue/test-utils'
import { expect, test } from 'vite-plus/test'
import { defineComponent, h } from 'vue'

import { answerOf, questionNames, questionnaireForm } from './fixtures'

const QuestionInput = defineComponent({
  props: { name: { type: String, required: true } },
  setup(props) {
    const field = useField<string>(() => props.name)
    return () =>
      h('div', [
        h('input', {
          ...field.attrs,
          value: field.model,
          onInput: (event: Event) => {
            if (event.target instanceof HTMLInputElement) {
              field.model = event.target.value
            }
          },
        }),
        h('p', { id: field.errorId }, field.errorMessage),
      ])
  },
})

const Questionnaire = defineComponent({
  setup() {
    provideFormNode(useForm(questionnaireForm))
    return () => questionNames.map(name => h(QuestionInput, { key: name, name }))
  },
})

test('rendering with Vue', async ({ bench }) => {
  await bench('vue: mount a form with 100 questions', () => {
    mount(Questionnaire).unmount()
  }).run()

  const wrapper = mount(Questionnaire)
  const input = wrapper.find('input')
  expect(input.exists()).toBe(true)
  let keystrokes = 0
  await bench('vue: type into one of 100 questions', async () => {
    keystrokes += 1
    await input.setValue(answerOf(keystrokes))
  }).run()
  wrapper.unmount()
})
