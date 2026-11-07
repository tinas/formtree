import type { FieldNode } from '@formtree/core'

import { applyAttributes } from './dom/bindings'

export interface Choice<Value extends string> {
  readonly value: Value
  readonly label: string
}

export interface ChoicesBinding<Value extends string> {
  readonly node: FieldNode<Array<Value> | undefined, unknown>
  readonly fieldset: HTMLFieldSetElement
  readonly message: HTMLElement
  readonly choices: ReadonlyArray<Choice<Value>>
}

interface ChoiceCheckbox<Value extends string> {
  readonly value: Value
  readonly element: HTMLInputElement
}

export function bindChoices<Value extends string>(binding: ChoicesBinding<Value>): () => void {
  const checkboxes = binding.choices.map(choice => {
    const element = document.createElement('input')
    element.type = 'checkbox'
    element.addEventListener('change', () => binding.node.setValue(selectedValues(checkboxes)))
    element.addEventListener('blur', () => binding.node.blur())
    const label = document.createElement('label')
    label.className = 'choice'
    label.append(element, choice.label)
    binding.fieldset.append(label)
    return { value: choice.value, element }
  })
  return () => renderChoices(binding, checkboxes)
}

function renderChoices<Value extends string>(
  binding: ChoicesBinding<Value>,
  checkboxes: ReadonlyArray<ChoiceCheckbox<Value>>,
): void {
  const selected = binding.node.state.value ?? []
  for (const checkbox of checkboxes) {
    checkbox.element.checked = selected.includes(checkbox.value)
  }
  applyAttributes(binding.fieldset, binding.node.attributes)
  binding.fieldset.removeAttribute('name')
  binding.message.id = binding.node.errorId
  binding.message.textContent = binding.node.errorMessage ?? ''
}

function selectedValues<Value extends string>(checkboxes: ReadonlyArray<ChoiceCheckbox<Value>>): Array<Value> {
  return checkboxes.filter(checkbox => checkbox.element.checked).map(checkbox => checkbox.value)
}
