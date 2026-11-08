import type { FormEvent, FormEventType, SubmitOutcome } from '@formtree/core'
import type { RegisteredForm } from '../formtree-app'
import type { TimelineEvent } from './devtools-api'

type LogType = NonNullable<TimelineEvent['logType']>

interface TimelineHeading {
  readonly title: string
  readonly logType: LogType
}

type EventHeadings = {
  readonly [Type in FormEventType]: (event: Extract<FormEvent, { type: Type }>) => TimelineHeading
}

const SUBMIT_LOG_TYPES: Record<SubmitOutcome, LogType> = {
  success: 'default',
  invalid: 'warning',
  unchecked: 'warning',
  rejected: 'error',
  skipped: 'default',
}

const EVENT_HEADINGS: EventHeadings = {
  change: () => ({ title: 'Change', logType: 'default' }),
  blur: () => ({ title: 'Blur', logType: 'default' }),
  reset: () => ({ title: 'Reset', logType: 'default' }),
  deps: () => ({ title: 'Dependencies', logType: 'default' }),
  errors: () => ({ title: 'Errors set', logType: 'default' }),
  checkStart: () => ({ title: 'Check started', logType: 'default' }),
  checkEnd: event => ({
    title: 'Check finished',
    logType: event.errors.length > 0 ? 'warning' : 'default',
  }),
  checkFail: () => ({ title: 'Check failed', logType: 'error' }),
  checkAbort: () => ({ title: 'Check cancelled', logType: 'default' }),
  submitStart: () => ({ title: 'Submit', logType: 'default' }),
  submitEnd: event => ({ title: `Submit ${event.outcome}`, logType: SUBMIT_LOG_TYPES[event.outcome] }),
}

export interface FormTimelineEvent {
  readonly entry: RegisteredForm
  readonly event: FormEvent
  readonly time: number
}

export function timelineEventOf({ entry, event, time }: FormTimelineEvent): TimelineEvent {
  const heading = EVENT_HEADINGS[event.type](event as never)
  const node = event.path == '' ? entry.form : entry.form.field(event.path)
  return {
    time,
    title: heading.title,
    subtitle: event.path == '' ? entry.label : `${entry.label} · ${event.path}`,
    logType: heading.logType,
    data: { form: entry.label, ...event, value: node.state.value },
  }
}
