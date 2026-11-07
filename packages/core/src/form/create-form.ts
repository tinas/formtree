import type { Definition } from '../definitions/definition'
import type { FormatErrorOption } from '../errors/form-error'
import type { ReValidateMode, ValidationMode } from '../modes/display-mode'
import type { FocusElementOption, FocusErrorOption } from '../nodes/node-types'
import type { CreateFormArguments, Form, FormControls } from './form-types'
import type { FormRuntime } from './form-runtime'

import { formatErrorCode } from '../errors/form-error'
import { DEFAULT_DISPLAY_MODES } from '../modes/display-mode'
import { nodeFor } from '../nodes/node'
import { shallowEqual } from '../paths/equality'
import { createFormState } from '../state/form-state'
import { disposeChecks } from '../validation/async-validation'
import { commitWithValidation, runValidationPass } from '../validation/validation-pass'
import { focusNatively } from './focus'
import { emitNodeEvent, FORM_EVENT } from './form-events'
import { runBatch, subscribeToRuntime } from './form-runtime'

const FORM_ID_PREFIX = 'formtree-'

let createdFormCount = 0

interface RuntimeOptions {
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
 * Creates a form from any definition, a single field included. The declared structure is built at once: groups are
 * `{}`, arrays are `[]`, and values are empty until written.
 *
 * @category Form
 */
export function createForm<FormDefinition extends Definition>(
  definition: FormDefinition,
  ...args: CreateFormArguments<FormDefinition>
): Form<FormDefinition> {
  const [options] = args
  const runtime = createFormRuntime(definition, (options ?? {}) as RuntimeOptions)
  return Object.assign(nodeFor(runtime, ''), createFormControls(runtime)) as unknown as Form<FormDefinition>
}

function createFormRuntime(definition: Definition, options: RuntimeOptions): FormRuntime {
  createdFormCount += 1
  const runtime: FormRuntime = {
    formId: options.id ?? `${FORM_ID_PREFIX}${createdFormCount}`,
    definition,
    options: {
      mode: options.mode ?? DEFAULT_DISPLAY_MODES.mode,
      reValidateMode: options.reValidateMode ?? DEFAULT_DISPLAY_MODES.reValidateMode,
      shouldFocusError: options.shouldFocusError ?? true,
      focusElement: options.focusElement ?? focusNatively,
      formatError: options.formatError ?? formatErrorCode,
    },
    state: createFormState({ definition, initialValue: options.initialValue, deps: options.deps }),
    version: 0,
    batchDepth: 0,
    hasPendingNotification: false,
    scopeDeps: new Map(),
    listeners: new Set(),
    observers: new Set(),
    nodes: new Map(),
    nodeStates: new Map(),
    itemLists: new Map(),
    syncEntries: new Map(),
    checkEntries: new Map(),
    pendingSchemaRuns: new Map(),
  }
  runtime.state = runValidationPass(runtime, runtime.state)
  return runtime
}

function createFormControls(runtime: FormRuntime): FormControls<unknown> {
  return {
    subscribe: listener => subscribeToRuntime(runtime, listener),
    setDeps: deps => replaceDeps(runtime, deps),
    batch: update => runBatch(runtime, update),
    dispose: () => disposeChecks(runtime),
    formatError: error => runtime.options.formatError(error),
  }
}

function replaceDeps(runtime: FormRuntime, deps: unknown): void {
  if (!shallowEqual(runtime.state.deps, deps)) {
    commitWithValidation(runtime, { ...runtime.state, deps })
    emitNodeEvent(runtime, FORM_EVENT.deps, '')
  }
}
