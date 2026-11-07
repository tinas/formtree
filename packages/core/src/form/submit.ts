import type { ValidateResult } from '../errors/form-error'
import type { SubmitHandler, SubmitOptions, SubmitOutcome, ValidationResult } from '../nodes/node-types'
import type { ValidateOptions } from '../validation/validation-pass'
import type { FormRuntime } from './form-runtime'

import { ERROR_SOURCE, toErrorInputs } from '../errors/form-error'
import { CLEAR_ON } from '../errors/stored-error'
import { domIdOf, summaryIdOf } from '../nodes/node-identity'
import { failedCheckIdsWithin, failedChecksWithin, toFormError, visibilityContextOf } from '../nodes/node-state'
import { FOCUS_SUMMARY, SUBMIT_OUTCOME } from '../nodes/node-types'
import { setExternalErrors } from '../state/error-transitions'
import { beginSubmit, endSubmit } from '../state/submit-transitions'
import { buildOutput } from '../validation/output'
import { settleValidationWithin } from '../validation/validation-pass'
import { isActiveNode, refreshSnapshotsWithin, SNAPSHOT_TRIGGER } from '../validation/visibility'
import { activeErrorsWithin } from './error-operations'
import { focusElementById, focusFirstInDocumentOrder } from './focus'
import { emitNodeEvent, emitSubmitEnd, FORM_EVENT } from './form-events'
import { commitState } from './form-runtime'

export interface NodeSubmission {
  readonly runtime: FormRuntime
  readonly nodeId: string
  readonly onValid: SubmitHandler<unknown>
  readonly options?: SubmitOptions
}

export async function validateNode(
  runtime: FormRuntime,
  nodeId: string,
  options?: ValidateOptions,
): Promise<ValidationResult<unknown>> {
  await settleValidationWithin(runtime, nodeId, options)
  const errors = activeErrorsWithin(runtime, nodeId)
  const failedChecks = failedChecksWithin(runtime.state, nodeId)
  if (errors.length > 0 || failedChecks.length > 0) {
    return {
      valid: false,
      errors: errors.map(error => toFormError(runtime.state, error)),
      failedChecks,
    }
  }
  return {
    valid: true,
    value: outputOf(runtime, nodeId),
  }
}

export async function submitNode({ runtime, nodeId, onValid, options = {} }: NodeSubmission): Promise<SubmitOutcome> {
  if (runtime.state.submitting.has(nodeId) || !isActiveNode(runtime.state, nodeId)) {
    emitSubmitEnd(runtime, nodeId, SUBMIT_OUTCOME.skipped)
    return SUBMIT_OUTCOME.skipped
  }
  commitState(runtime, beginSubmit(runtime.state, nodeId))
  emitNodeEvent(runtime, FORM_EVENT.submitStart, nodeId)
  await settleValidationWithin(runtime, nodeId, options)
  const errors = activeErrorsWithin(runtime, nodeId)
  if (errors.length > 0) {
    endFailedSubmit({ runtime, nodeId, options, outcome: SUBMIT_OUTCOME.invalid })
    options.onInvalid?.(errors.map(error => toFormError(runtime.state, error)))
    return SUBMIT_OUTCOME.invalid
  }
  if (failedCheckIdsWithin(runtime.state, nodeId).length > 0) {
    endFailedSubmit({ runtime, nodeId, options, outcome: SUBMIT_OUTCOME.unchecked })
    return SUBMIT_OUTCOME.unchecked
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
    endFailedSubmit({ runtime, nodeId, options, outcome: SUBMIT_OUTCOME.rejected })
    return SUBMIT_OUTCOME.rejected
  }
  commitState(runtime, endSubmit(runtime.state, nodeId))
  emitSubmitEnd(runtime, nodeId, SUBMIT_OUTCOME.success)
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

function outputOf(runtime: FormRuntime, nodeId: string): unknown {
  return buildOutput({ definition: runtime.definition, entries: runtime.syncEntries, state: runtime.state, nodeId })
}

interface FailedSubmit {
  readonly runtime: FormRuntime
  readonly nodeId: string
  readonly options: SubmitOptions
  readonly outcome: SubmitOutcome
}

function endFailedSubmit({ runtime, nodeId, options, outcome }: FailedSubmit): void {
  const refreshed = refreshSnapshotsWithin(visibilityContextOf(runtime), { nodeId, trigger: SNAPSHOT_TRIGGER.submit })
  commitState(runtime, endSubmit(refreshed, nodeId))
  emitSubmitEnd(runtime, nodeId, outcome)
  focusFailures(runtime, nodeId, options)
}

function focusFailures(runtime: FormRuntime, nodeId: string, options: SubmitOptions): void {
  const shouldFocusError = options.shouldFocusError ?? runtime.options.shouldFocusError
  const focusElement = options.focusElement ?? runtime.options.focusElement
  if (shouldFocusError == FOCUS_SUMMARY) {
    focusElementById(summaryIdOf(runtime, nodeId), focusElement)
    return
  }
  if (shouldFocusError) {
    const targetIds = new Set([
      ...activeErrorsWithin(runtime, nodeId).map(error => error.targetId),
      ...failedCheckIdsWithin(runtime.state, nodeId),
    ])
    focusFirstInDocumentOrder(
      [...targetIds].map(targetId => domIdOf(runtime, targetId)),
      focusElement,
    )
  }
}
