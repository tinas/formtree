import type { ErrorInput } from '../errors/form-error'
import type { SubmitOutcome } from '../nodes/node-types'
import type { FormRuntime } from './form-runtime'

import { pathOf } from '../nodes/node-identity'

/**
 * What happened in a form. Devtools read these; the form's behaviour never depends on them.
 *
 * @internal
 */
export const FORM_EVENT = {
  change: 'change',
  blur: 'blur',
  reset: 'reset',
  deps: 'deps',
  errors: 'errors',
  checkStart: 'checkStart',
  checkEnd: 'checkEnd',
  checkAbort: 'checkAbort',
  submitStart: 'submitStart',
  submitEnd: 'submitEnd',
} as const

/** @internal */
export type FormEventType = (typeof FORM_EVENT)[keyof typeof FORM_EVENT]

/** @internal */
export interface FormEventDetails {
  readonly [FORM_EVENT.checkEnd]: {
    readonly errors: ReadonlyArray<ErrorInput>
    readonly cached: boolean
  }
  readonly [FORM_EVENT.submitEnd]: {
    readonly outcome: SubmitOutcome
  }
}

/** @internal */
export type FormEvent = {
  readonly [Type in FormEventType]: {
    readonly type: Type
    readonly path: string
  } & (Type extends keyof FormEventDetails ? FormEventDetails[Type] : unknown)
}[FormEventType]

/** @internal */
export type FormEventObserver = (event: FormEvent) => void

type PlainEventType = Exclude<FormEventType, keyof FormEventDetails>

export function emitNodeEvent(runtime: FormRuntime, type: PlainEventType, nodeId: string): void {
  if (runtime.observers.size > 0) {
    emitEvent(runtime, { type, path: pathOf(runtime, nodeId) })
  }
}

export interface CheckEnd {
  readonly nodeId: string
  readonly errors: ReadonlyArray<ErrorInput>
  readonly cached: boolean
}

export function emitCheckEnd(runtime: FormRuntime, { nodeId, errors, cached }: CheckEnd): void {
  if (runtime.observers.size > 0) {
    emitEvent(runtime, { type: FORM_EVENT.checkEnd, path: pathOf(runtime, nodeId), errors, cached })
  }
}

export function emitSubmitEnd(runtime: FormRuntime, nodeId: string, outcome: SubmitOutcome): void {
  if (runtime.observers.size > 0) {
    emitEvent(runtime, { type: FORM_EVENT.submitEnd, path: pathOf(runtime, nodeId), outcome })
  }
}

export function observeRuntime(runtime: FormRuntime, observer: FormEventObserver): () => void {
  runtime.observers.add(observer)
  return () => {
    runtime.observers.delete(observer)
  }
}

function emitEvent(runtime: FormRuntime, event: FormEvent): void {
  for (const observer of [...runtime.observers]) {
    observer(event)
  }
}
