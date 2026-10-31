import type { FieldAttributes, FieldNode } from '@formtree/core'

export interface FieldBinding<Value> {
  readonly node: FieldNode<Value | undefined, unknown>
  readonly control: HTMLInputElement | HTMLSelectElement
  readonly label: HTMLElement
  readonly message: HTMLElement
  readonly parse: (text: string) => Value | undefined
  readonly format: (value: Value | undefined) => string
}

export interface CheckboxBinding {
  readonly node: FieldNode<true | undefined, unknown>
  readonly control: HTMLInputElement
  readonly message: HTMLElement
}

export interface ChoiceOption {
  readonly value: string
  readonly label: string
}

export function bindField<Value>(binding: FieldBinding<Value>): () => void {
  binding.control.addEventListener('input', () => binding.node.setValue(binding.parse(binding.control.value)))
  binding.control.addEventListener('blur', () => binding.node.blur())
  return () => renderField(binding)
}

export function renderField<Value>(binding: FieldBinding<Value>): void {
  const { state } = binding.node
  applyAttributes(binding.control, binding.node.getAttributes())
  binding.label.setAttribute('for', binding.node.id)
  binding.message.id = binding.node.errorId
  binding.message.textContent = state.errors[0]?.code ?? ''
  const text = binding.format(state.value)
  if (binding.control.value != text) {
    binding.control.value = text
  }
}

export function bindCheckbox(binding: CheckboxBinding): () => void {
  binding.control.addEventListener('change', () => binding.node.setValue(binding.control.checked ? true : undefined))
  binding.control.addEventListener('blur', () => binding.node.blur())
  return () => renderCheckbox(binding)
}

function renderCheckbox(binding: CheckboxBinding): void {
  applyAttributes(binding.control, binding.node.getAttributes())
  binding.control.checked = binding.node.state.value == true
  binding.message.id = binding.node.errorId
  binding.message.textContent = binding.node.state.errors[0]?.code ?? ''
}

export function applyAttributes(element: HTMLElement, attributes: FieldAttributes): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (value == null) {
      element.removeAttribute(name)
    } else {
      element.setAttribute(name, value)
    }
  }
}

export function fillOptions(select: HTMLSelectElement, options: ReadonlyArray<ChoiceOption>): void {
  select.replaceChildren(new Option('Select…', ''), ...options.map(option => new Option(option.label, option.value)))
}

export function parseText(text: string): string | undefined {
  return text == '' ? undefined : text
}

export function parseNumber(text: string): number | undefined {
  return text == '' || Number.isNaN(Number(text)) ? undefined : Number(text)
}

export function formatValue(value: string | number | undefined): string {
  return value == undefined ? '' : String(value)
}

export function elementById<Element extends HTMLElement>(id: string): Element {
  const element = document.getElementById(id)
  if (element == null) {
    throw new Error(`Missing element #${id}`)
  }
  return element as Element
}
