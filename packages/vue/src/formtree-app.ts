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

export interface FormtreeApp {
  readonly defaults: FormDefaults
  readonly registry: FormRegistry | undefined
}

export const FORMTREE_APP: InjectionKey<FormtreeApp> = Symbol('formtree.app')

export function injectFormtreeApp(): FormtreeApp | undefined {
  return hasInjectionContext() ? inject(FORMTREE_APP, undefined) : undefined
}

export function registerForm(formtreeApp: FormtreeApp | undefined, form: UniversalForm): (() => void) | undefined {
  return formtreeApp?.registry?.register({ form, label: componentName() ?? form.id })
}

function componentName(): string | undefined {
  const component = getCurrentInstance()?.type
  return component?.name ?? component?.__name
}
