import type { Definition } from '../definitions/definition'
import type { StoredError } from '../errors/stored-error'
import type { DisplayModes, ReValidateMode, ValidationMode } from '../modes/display-mode'
import type { FormState } from '../state/form-state'

import { definitionsAlong } from '../definitions/definition-at'
import { sharedOptionsOf } from '../definitions/runtime-options'
import { isInternalErrorSource } from '../errors/form-error'
import { errorIdentity } from '../errors/stored-error'
import { isWithinPath, pathAndAncestors } from '../paths/path'
import { hasPathWithin, mapWith, mapWithout } from '../state/collections'

const DISPLAY_POLICY = {
  hidden: 'hidden',
  live: 'live',
  snapshotOnBlur: 'snapshotOnBlur',
  snapshotOnSubmit: 'snapshotOnSubmit',
} as const

type DisplayPolicy = (typeof DISPLAY_POLICY)[keyof typeof DISPLAY_POLICY]

export const SNAPSHOT_TRIGGER = {
  blur: 'blur',
  submit: 'submit',
} as const

export type SnapshotTrigger = (typeof SNAPSHOT_TRIGGER)[keyof typeof SNAPSHOT_TRIGGER]

interface Interaction {
  readonly touched: boolean
  readonly changed: boolean
}

const MODE_POLICIES: { readonly [Mode in ValidationMode]: (interaction: Interaction) => DisplayPolicy } = {
  onSubmit: () => DISPLAY_POLICY.hidden,
  onBlur: ({ touched }) => (touched ? DISPLAY_POLICY.snapshotOnBlur : DISPLAY_POLICY.hidden),
  onChange: ({ changed }) => (changed ? DISPLAY_POLICY.live : DISPLAY_POLICY.hidden),
  onTouched: ({ touched }) => (touched ? DISPLAY_POLICY.live : DISPLAY_POLICY.hidden),
  all: () => DISPLAY_POLICY.live,
}

const RE_VALIDATE_POLICIES: { readonly [Mode in ReValidateMode]: DisplayPolicy } = {
  onChange: DISPLAY_POLICY.live,
  onBlur: DISPLAY_POLICY.snapshotOnBlur,
  onSubmit: DISPLAY_POLICY.snapshotOnSubmit,
}

export interface VisibilityContext {
  readonly definition: Definition
  readonly defaults: DisplayModes
  readonly state: FormState
}

interface ActiveErrorIndex {
  readonly inactive: ReadonlySet<string>
  readonly errors: ReadonlyArray<StoredError>
  readonly byTarget: ReadonlyMap<string, ReadonlyArray<StoredError>>
  readonly targetsAndAncestors: ReadonlySet<string>
}

const activeErrorIndexes = new WeakMap<ReadonlyArray<StoredError>, ActiveErrorIndex>()

export function activeErrors(state: FormState): ReadonlyArray<StoredError> {
  return activeErrorIndexOf(state).errors
}

export function activeErrorsAt(state: FormState, targetId: string): ReadonlyArray<StoredError> {
  return activeErrorIndexOf(state).byTarget.get(targetId) ?? []
}

export function hasActiveErrorWithin(state: FormState, nodeId: string): boolean {
  return activeErrorIndexOf(state).targetsAndAncestors.has(nodeId)
}

export function isActiveNode(state: FormState, nodeId: string): boolean {
  for (const inactiveId of state.inactive) {
    if (isWithinPath(nodeId, inactiveId)) {
      return false
    }
  }
  return true
}

function activeErrorIndexOf(state: FormState): ActiveErrorIndex {
  const cached = activeErrorIndexes.get(state.errors)
  if (cached?.inactive == state.inactive) {
    return cached
  }
  const index = indexActiveErrors(state)
  activeErrorIndexes.set(state.errors, index)
  return index
}

function indexActiveErrors(state: FormState): ActiveErrorIndex {
  const errors = state.errors.filter(error => isActiveNode(state, error.targetId))
  const byTarget = new Map<string, Array<StoredError>>()
  for (const error of errors) {
    const targetErrors = byTarget.get(error.targetId)
    if (targetErrors == undefined) {
      byTarget.set(error.targetId, [error])
    } else {
      targetErrors.push(error)
    }
  }
  const targetsAndAncestors = new Set([...byTarget.keys()].flatMap(pathAndAncestors))
  return { inactive: state.inactive, errors, byTarget, targetsAndAncestors }
}

export function visibleErrorsAt(context: VisibilityContext, targetId: string): ReadonlyArray<StoredError> {
  const errors = activeErrorsAt(context.state, targetId)
  if (errors.length == 0) {
    return errors
  }
  const policy = displayPolicyAt(context, targetId)
  const snapshot = context.state.snapshots.get(targetId) ?? []
  return errors.filter(error => {
    if (!isInternalErrorSource(error.source) || policy == DISPLAY_POLICY.live) {
      return true
    }
    return policy != DISPLAY_POLICY.hidden && snapshot.includes(errorIdentity(error))
  })
}

export function refreshSnapshotsWithin(
  context: VisibilityContext,
  { nodeId, trigger }: { readonly nodeId: string; readonly trigger: SnapshotTrigger },
): FormState {
  const errors = activeErrors(context.state)
  const targetIds = new Set([
    ...errors.map(error => error.targetId).filter(targetId => isWithinPath(targetId, nodeId)),
    ...[...context.state.snapshots.keys()].filter(targetId => isWithinPath(targetId, nodeId)),
  ])
  let snapshots = context.state.snapshots
  for (const targetId of targetIds) {
    if (trigger == SNAPSHOT_TRIGGER.submit || displayPolicyAt(context, targetId) == DISPLAY_POLICY.snapshotOnBlur) {
      const identities = errors.filter(error => error.targetId == targetId).map(errorIdentity)
      snapshots = identities.length == 0 ? mapWithout(snapshots, targetId) : mapWith(snapshots, targetId, identities)
    }
  }
  return { ...context.state, snapshots }
}

function displayPolicyAt(context: VisibilityContext, targetId: string): DisplayPolicy {
  const modes = displayModesAt(context, targetId)
  const isSubmitted = pathAndAncestors(targetId).some(nodeId => (context.state.submitCounts.get(nodeId) ?? 0) > 0)
  if (isSubmitted) {
    return RE_VALIDATE_POLICIES[modes.reValidateMode]
  }
  return MODE_POLICIES[modes.mode]({
    touched: hasPathWithin(context.state.touched, targetId),
    changed: hasPathWithin(context.state.changed, targetId),
  })
}

function displayModesAt(context: VisibilityContext, targetId: string): DisplayModes {
  return definitionsAlong(context.definition, targetId).reduce<DisplayModes>((modes, definition) => {
    const options = sharedOptionsOf(definition)
    return {
      mode: options.mode ?? modes.mode,
      reValidateMode: options.reValidateMode ?? modes.reValidateMode,
    }
  }, context.defaults)
}
