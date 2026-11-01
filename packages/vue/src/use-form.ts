import type {
  CreateFormOptions,
  Definition,
  DepsOf,
  Form,
  FocusElementOption,
  FocusErrorOption,
  NoDeps,
  ReValidateMode,
  ValidationMode,
} from '@formtree/core'
import type { MaybeRefOrGetter } from 'vue'
import type { UniversalForm } from './reactive-node'

import { createForm } from '@formtree/core'
import { getCurrentInstance, getCurrentScope, isRef, onScopeDispose, toValue, useId, watch } from 'vue'

import { registerForm } from './form-registry'
import { announceChange, createFormBridge, reactiveForm } from './reactive-node'

/**
 * Options of {@link useForm} for a definition that needs dependencies.
 *
 * @category Form
 */
export interface UseFormOptionsWithDeps<FormDefinition> extends CreateFormOptions<FormDefinition> {
  /** The root's dependencies. A ref or a getter is followed with `setDeps`. */
  readonly deps: MaybeRefOrGetter<DepsOf<FormDefinition>>
}

/**
 * The options argument of {@link useForm}: optional without dependencies, required with them.
 *
 * @category Form
 */
export type UseFormArguments<FormDefinition extends Definition> = [DepsOf<FormDefinition>] extends [NoDeps]
  ? [options?: CreateFormOptions<FormDefinition>]
  : [options: UseFormOptionsWithDeps<FormDefinition>]

interface UseFormSettings {
  readonly id?: string
  readonly initialValue?: unknown
  readonly deps?: MaybeRefOrGetter<unknown>
  readonly mode?: ValidationMode
  readonly reValidateMode?: ReValidateMode
  readonly shouldFocusError?: FocusErrorOption
  readonly focusElement?: FocusElementOption
}

/**
 * Creates a form whose node states are reactive. Inside a component the form id comes from `useId()`; when the scope
 * ends, the subscription stops and pending checks are cancelled.
 *
 * @category Form
 */
export function useForm<FormDefinition extends Definition>(
  definition: FormDefinition,
  ...args: UseFormArguments<FormDefinition>
): Form<FormDefinition> {
  const [options] = args
  const settings: UseFormSettings = options ?? {}
  const form = createForm(definition as Definition, {
    ...settings,
    id: settings.id ?? componentFormId(),
    deps: toValue(settings.deps),
  }) as unknown as UniversalForm
  const bridge = createFormBridge()
  const stopListening = form.subscribe(() => announceChange(bridge))
  const unregister = registerForm(form)
  if (isRef(settings.deps) || typeof settings.deps == 'function') {
    watch(
      () => toValue(settings.deps),
      deps => form.setDeps(deps),
    )
  }
  if (getCurrentScope() != undefined) {
    onScopeDispose(() => {
      stopListening()
      unregister?.()
      form.dispose()
    })
  }
  return reactiveForm(bridge, form) as unknown as Form<FormDefinition>
}

function componentFormId(): string | undefined {
  return getCurrentInstance() == null ? undefined : useId()
}
