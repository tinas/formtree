import type { FormDefaults } from '@formtree/core'
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

export interface FormTreeApp {
  readonly defaults: FormDefaults
  readonly registry: FormRegistry | undefined
}

export const FORM_TREE_APP: InjectionKey<FormTreeApp> = Symbol('formtree.app')

export function injectFormTreeApp(): FormTreeApp | undefined {
  return hasInjectionContext() ? inject(FORM_TREE_APP, undefined) : undefined
}

export function registerForm(formTreeApp: FormTreeApp | undefined, form: UniversalForm): (() => void) | undefined {
  return formTreeApp?.registry?.register({ form, label: componentName() ?? form.id })
}

function componentName(): string | undefined {
  const component = getCurrentInstance()?.type
  return component?.name ?? component?.__name
}
