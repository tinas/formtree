import type {
  CreateFormArguments,
  Definition,
  FocusElementOption,
  FocusErrorOption,
  Form,
  FormControls,
  ReValidateMode,
  UniversalNode,
  ValidationMode,
} from '@formtree/core'

import { createForm } from '@formtree/core'
import { useEffect, useId, useState } from 'react'

import { useNodeState } from './use-node-state'

type UniversalForm = UniversalNode & FormControls<unknown>

interface UseFormSettings {
  readonly id?: string
  readonly initialValue?: unknown
  readonly deps?: unknown
  readonly mode?: ValidationMode
  readonly reValidateMode?: ReValidateMode
  readonly shouldFocusError?: FocusErrorOption
  readonly focusElement?: FocusElementOption
}

/**
 * Creates a form once per component and re-renders the component when the root's state changes. The form id comes from
 * `useId()` unless `id` is given. A new `deps` value is passed to `setDeps`, so dependencies can be written inline. When
 * the component unmounts, pending checks are cancelled.
 *
 * @category Form
 */
export function useForm<FormDefinition extends Definition>(
  definition: FormDefinition,
  ...args: CreateFormArguments<FormDefinition>
): Form<FormDefinition> {
  const [options] = args
  const settings: UseFormSettings = options ?? {}
  const componentId = useId()
  const [form] = useState(
    () =>
      createForm(definition as Definition, {
        ...settings,
        id: settings.id ?? componentId,
        deps: settings.deps,
      }) as unknown as UniversalForm,
  )
  useEffect(() => form.setDeps(settings.deps), [form, settings.deps])
  useEffect(() => () => form.dispose(), [form])
  useNodeState(form)
  return form as unknown as Form<FormDefinition>
}
