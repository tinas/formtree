import type { Definition } from '../definitions/definition'
import type { StoredError } from '../errors/stored-error'
import type { ArrayKeys } from './node-id'

import { assignArrayKeys } from './array-keys'
import { materializeStructure } from './structure'

export const CHECK_STATUS = {
  waiting: 'waiting',
  running: 'running',
  failed: 'failed',
} as const

export type CheckStatus = (typeof CHECK_STATUS)[keyof typeof CHECK_STATUS]

export type CheckState =
  | { readonly status: typeof CHECK_STATUS.waiting }
  | { readonly status: typeof CHECK_STATUS.running }
  | { readonly status: typeof CHECK_STATUS.failed; readonly error: unknown }

export interface FormState {
  readonly value: unknown
  readonly arrayKeys: ArrayKeys
  readonly initialValue: unknown
  readonly initialArrayKeys: ArrayKeys
  readonly nextItemKey: number
  readonly deps: unknown
  readonly touched: ReadonlySet<string>
  readonly changed: ReadonlySet<string>
  readonly errors: ReadonlyArray<StoredError>
  readonly snapshots: ReadonlyMap<string, ReadonlyArray<string>>
  readonly checks: ReadonlyMap<string, CheckState>
  readonly pendingSchemas: ReadonlySet<string>
  readonly submitting: ReadonlySet<string>
  readonly submitCounts: ReadonlyMap<string, number>
  readonly inactive: ReadonlySet<string>
}

export interface FormStateInput {
  readonly definition: Definition
  readonly initialValue: unknown
  readonly deps: unknown
}

export function createFormState({ definition, initialValue, deps }: FormStateInput): FormState {
  const value = materializeStructure(definition, initialValue)
  const keyState = assignArrayKeys({ arrayKeys: new Map(), nextItemKey: 0 }, '', value)
  return {
    value,
    arrayKeys: keyState.arrayKeys,
    initialValue: value,
    initialArrayKeys: keyState.arrayKeys,
    nextItemKey: keyState.nextItemKey,
    deps,
    touched: new Set(),
    changed: new Set(),
    errors: [],
    snapshots: new Map(),
    checks: new Map(),
    pendingSchemas: new Set(),
    submitting: new Set(),
    submitCounts: new Map(),
    inactive: new Set(),
  }
}
