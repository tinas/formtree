import type { InjectionKey } from 'vue'
import type { UniversalForm } from './reactive-node'

import { getCurrentInstance, hasInjectionContext, inject } from 'vue'

export interface RegisteredForm {
  readonly form: UniversalForm
  readonly label: string
}

export interface FormRegistry {
  readonly register: (entry: RegisteredForm) => () => void
}

export const FORM_REGISTRY: InjectionKey<FormRegistry> = Symbol('formtree.form-registry')

export function registerForm(form: UniversalForm): (() => void) | undefined {
  const registry = hasInjectionContext() ? inject(FORM_REGISTRY, undefined) : undefined
  return registry?.register({ form, label: componentName() ?? form.id })
}

function componentName(): string | undefined {
  const component = getCurrentInstance()?.type
  return component?.name ?? component?.__name
}
