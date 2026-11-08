import type { ResetOptions } from '../nodes/node-types'
import type { ArrayEdit } from '../state/array-transitions'
import type { FormRuntime } from './form-runtime'

import { visibilityContextOf } from '../nodes/node-state'
import { applyArrayEdit } from '../state/array-transitions'
import { withoutChecksWithin } from '../state/check-transitions'
import { isAttached } from '../state/node-id'
import { resetNode } from '../state/reset-transitions'
import { markTouched, writeValue } from '../state/value-transitions'
import { forgetChecksWithin, scheduleBlurChecks } from '../validation/async-validation'
import { commitWithValidation } from '../validation/validation-pass'
import { refreshSnapshotsWithin, SNAPSHOT_TRIGGER } from '../validation/visibility'
import { emitNodeEvent, FORM_EVENT } from './form-events'
import { commitState } from './form-runtime'

export function setNodeValue(runtime: FormRuntime, nodeId: string, value: unknown): void {
  const state = writeValue({ state: runtime.state, definition: runtime.definition, nodeId, value })
  if (state != runtime.state) {
    commitWithValidation(runtime, state)
    forgetDetachedNodes(runtime)
    emitNodeEvent(runtime, FORM_EVENT.change, nodeId)
  }
}

export function blurNode(runtime: FormRuntime, nodeId: string): void {
  const touched = markTouched(runtime.state, nodeId)
  const refreshed = refreshSnapshotsWithin(
    { ...visibilityContextOf(runtime), state: touched },
    { nodeId, trigger: SNAPSHOT_TRIGGER.blur },
  )
  commitState(runtime, scheduleBlurChecks(runtime, refreshed, nodeId))
  emitNodeEvent(runtime, FORM_EVENT.blur, nodeId)
}

export function resetNodeValue(runtime: FormRuntime, nodeId: string, options: ResetOptions<unknown> = {}): void {
  forgetChecksWithin(runtime, nodeId)
  const state = resetNode({
    state: runtime.state,
    definition: runtime.definition,
    nodeId,
    request: {
      hasValue: 'value' in options,
      value: options.value,
      keepDirtyValues: options.keepDirtyValues,
      keepTouched: options.keepTouched,
      keepErrors: options.keepErrors,
    },
  })
  commitWithValidation(runtime, withoutChecksWithin(state, nodeId))
  forgetDetachedNodes(runtime)
  emitNodeEvent(runtime, FORM_EVENT.reset, nodeId)
}

export function editNodeArray(runtime: FormRuntime, arrayId: string, edit: ArrayEdit): void {
  const state = applyArrayEdit({ state: runtime.state, definition: runtime.definition, arrayId, edit })
  if (state != runtime.state) {
    commitWithValidation(runtime, state)
    forgetDetachedNodes(runtime)
    emitNodeEvent(runtime, FORM_EVENT.change, arrayId)
  }
}

function forgetDetachedNodes(runtime: FormRuntime): void {
  for (const nodeId of runtime.nodes.keys()) {
    if (!isAttached(runtime.state.arrayKeys, nodeId)) {
      runtime.nodes.delete(nodeId)
    }
  }
}
