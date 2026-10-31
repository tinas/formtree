import type { ValidateResult } from '../errors/form-error'
import type {
  FocusElementOption,
  FocusErrorOption,
  SubmitEventLike,
  SubmitHandler,
  SubmitOptions,
  SubmitOutcome,
  ValidationResult,
} from '../nodes/node-types'
import type { FormRuntime } from './form-runtime'

import { ERROR_SOURCE, toErrorInputs } from '../errors/form-error'
import { CLEAR_ON } from '../errors/stored-error'
import { domIdOf, summaryIdOf } from '../nodes/node-identity'
import { toFormError, visibilityContextOf } from '../nodes/node-state'
import { FOCUS_SUMMARY, SUBMIT_OUTCOME } from '../nodes/node-types'
import { setExternalErrors } from '../state/error-transitions'
import { beginSubmit, endSubmit } from '../state/submit-transitions'
import { startAsyncWithin } from '../validation/async-validation'
import { buildOutput } from '../validation/output'
import { commitWithValidation, pendingSchemaRunsWithin } from '../validation/validation-pass'
import { isActiveNode, refreshSnapshotsWithin, SNAPSHOT_TRIGGER } from '../validation/visibility'
import { activeErrorsWithin } from './error-operations'
import { focusElementById, focusFirstInDocumentOrder } from './focus'
import { commitState } from './form-runtime'

export interface NodeSubmission {
  readonly runtime: FormRuntime
  readonly nodeId: string
  readonly onValid: SubmitHandler<unknown>
  readonly options?: SubmitOptions
}

export function createSubmitHandler(submission: NodeSubmission): (event?: SubmitEventLike) => Promise<SubmitOutcome> {
  return event => {
    event?.preventDefault()
    return submitNode(submission)
  }
}

export async function validateNode(runtime: FormRuntime, nodeId: string): Promise<ValidationResult<unknown>> {
  await settleValidationWithin(runtime, nodeId)
  const errors = activeErrorsWithin(runtime, nodeId)
  if (errors.length > 0) {
    return {
      valid: false,
      errors: errors.map(error => toFormError(runtime.state, error)),
    }
  }
  return {
    valid: true,
    value: outputOf(runtime, nodeId),
  }
}

export async function submitNode({ runtime, nodeId, onValid, options = {} }: NodeSubmission): Promise<SubmitOutcome> {
  if (runtime.state.submitting.has(nodeId) || !isActiveNode(runtime.state, nodeId)) {
    return SUBMIT_OUTCOME.skipped
  }
  commitState(runtime, beginSubmit(runtime.state, nodeId))
  await settleValidationWithin(runtime, nodeId)
  const shouldFocusError = options.shouldFocusError ?? runtime.options.shouldFocusError
  const focusElement = options.focusElement ?? runtime.options.focusElement
  const errors = activeErrorsWithin(runtime, nodeId)
  if (errors.length > 0) {
    finishSubmit(runtime, nodeId)
    focusErrors({ runtime, nodeId, shouldFocusError, focusElement })
    options.onInvalid?.(errors.map(error => toFormError(runtime.state, error)))
    return SUBMIT_OUTCOME.invalid
  }
  const serverErrors = toErrorInputs(await callSubmitHandler(runtime, nodeId, onValid))
  if (serverErrors.length > 0) {
    commitState(
      runtime,
      setExternalErrors(runtime.state, {
        nodeId,
        inputs: serverErrors,
        source: ERROR_SOURCE.server,
        clearOn: CLEAR_ON.change,
      }),
    )
    finishSubmit(runtime, nodeId)
    focusErrors({ runtime, nodeId, shouldFocusError, focusElement })
    return SUBMIT_OUTCOME.rejected
  }
  commitState(runtime, endSubmit(runtime.state, nodeId))
  return SUBMIT_OUTCOME.success
}

async function callSubmitHandler(
  runtime: FormRuntime,
  nodeId: string,
  onValid: SubmitHandler<unknown>,
): Promise<ValidateResult | void> {
  try {
    return await onValid(outputOf(runtime, nodeId))
  } catch (error) {
    commitState(runtime, endSubmit(runtime.state, nodeId))
    throw error
  }
}

async function settleValidationWithin(runtime: FormRuntime, nodeId: string): Promise<void> {
  commitWithValidation(runtime, runtime.state)
  let pending = startPendingWithin(runtime, nodeId)
  while (pending.length > 0) {
    await Promise.all(pending)
    pending = startPendingWithin(runtime, nodeId)
  }
}

function startPendingWithin(runtime: FormRuntime, nodeId: string): Array<Promise<void>> {
  return [...startAsyncWithin(runtime, nodeId), ...pendingSchemaRunsWithin(runtime, nodeId)]
}

function finishSubmit(runtime: FormRuntime, nodeId: string): void {
  const refreshed = refreshSnapshotsWithin(visibilityContextOf(runtime), { nodeId, trigger: SNAPSHOT_TRIGGER.submit })
  commitState(runtime, endSubmit(refreshed, nodeId))
}

function outputOf(runtime: FormRuntime, nodeId: string): unknown {
  return buildOutput({ definition: runtime.definition, entries: runtime.syncEntries, state: runtime.state, nodeId })
}

interface ErrorFocus {
  readonly runtime: FormRuntime
  readonly nodeId: string
  readonly shouldFocusError: FocusErrorOption
  readonly focusElement: FocusElementOption
}

export function focusErrors({ runtime, nodeId, shouldFocusError, focusElement }: ErrorFocus): void {
  if (shouldFocusError == FOCUS_SUMMARY) {
    focusElementById(summaryIdOf(runtime, nodeId), focusElement)
    return
  }
  if (shouldFocusError) {
    const targetIds = new Set(activeErrorsWithin(runtime, nodeId).map(error => error.targetId))
    focusFirstInDocumentOrder(
      [...targetIds].map(targetId => domIdOf(runtime, targetId)),
      focusElement,
    )
  }
}
