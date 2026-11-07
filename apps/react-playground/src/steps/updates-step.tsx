import type { NotificationChannel } from '../forms/checkout'
import type { StepProps } from './step-props'

import { useField, useFormNode } from '@formtree/react'

import { checkoutGroup, NOTIFICATION_CHANNEL } from '../forms/checkout'

const NOTIFICATION_CHOICES = [
  { value: NOTIFICATION_CHANNEL.email, label: 'Email' },
  { value: NOTIFICATION_CHANNEL.sms, label: 'SMS' },
  { value: NOTIFICATION_CHANNEL.push, label: 'Push notification' },
]

export function UpdatesStep({ onComplete }: StepProps) {
  const notifyBy = useField(useFormNode(checkoutGroup).field('notifyBy'))
  const selected = notifyBy.value ?? []
  const onSubmit = notifyBy.node.handleSubmit(() => onComplete())

  return (
    <form
      id={`${notifyBy.id}:step`}
      className="step"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        void onSubmit()
      }}
    >
      <h2>Updates</h2>
      <fieldset id={notifyBy.id} tabIndex={-1} aria-describedby={notifyBy.attrs['aria-describedby']}>
        <legend>Send order updates by</legend>
        {NOTIFICATION_CHOICES.map(choice => (
          <label key={choice.value} className="choice">
            <input
              type="checkbox"
              checked={selected.includes(choice.value)}
              onChange={event => notifyBy.setValue(toggleChannel(selected, choice.value, event.target.checked))}
              onBlur={notifyBy.node.blur}
            />
            {choice.label}
          </label>
        ))}
      </fieldset>
      <p id={notifyBy.errorId} className="error">
        {notifyBy.errorMessage}
      </p>
    </form>
  )
}

function toggleChannel(
  selected: ReadonlyArray<NotificationChannel>,
  channel: NotificationChannel,
  isChecked: boolean,
): Array<NotificationChannel> {
  return isChecked ? [...selected, channel] : selected.filter(value => value != channel)
}
