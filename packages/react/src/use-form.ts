import type {
  CreateFormArguments,
  Definition,
  FocusElementOption,
  FocusErrorOption,
  Form,
  FormatErrorOption,
  FormControls,
  ReValidateMode,
  UniversalNode,
  ValidationMode,
} from '@formtree/core'

import { createForm } from '@formtree/core'
import { useEffect, useId, useState } from 'react'

import { useFormDefaults } from './formtree-provider'

type UniversalForm = UniversalNode & FormControls<unknown>

interface UseFormSettings {
  readonly id?: string
  readonly initialValue?: unknown
  readonly deps?: unknown
  readonly mode?: ValidationMode
  readonly reValidateMode?: ReValidateMode
  readonly shouldFocusError?: FocusErrorOption
  readonly focusElement?: FocusElementOption
  readonly formatError?: FormatErrorOption
}

/**
 * Creates a form once per component. It does not re-render the component; read what the component shows with
 * {@link useNodeState} or {@link useField}. Options left out come from the nearest {@link FormtreeProvider}. The form id
 * comes from `useId()` unless `id` is given. A new `deps` value is passed to `setDeps`, so dependencies can be written
 * inline. When the component unmounts, pending checks are cancelled.
 *
 * @category Form
 */
export function useForm<FormDefinition extends Definition>(
  definition: FormDefinition,
  ...args: CreateFormArguments<FormDefinition>
): Form<FormDefinition> {
  const [options] = args
  const defaults = useFormDefaults()
  const settings: UseFormSettings = options ?? {}
  const componentId = useId()
  const [form] = useState(
    () =>
      createForm(definition as Definition, {
        ...defaults,
        ...givenOptionsOf(settings),
        id: settings.id ?? componentId,
        deps: settings.deps,
      }) as unknown as UniversalForm,
  )
  useEffect(() => form.setDeps(settings.deps), [form, settings.deps])
  useEffect(() => () => form.dispose(), [form])
  return form as unknown as Form<FormDefinition>
}

function givenOptionsOf(settings: UseFormSettings): UseFormSettings {
  return Object.fromEntries(Object.entries(settings).filter(([, value]) => value != undefined))
}
