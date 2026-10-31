import type { ReactNode } from 'react'

interface FieldFrameProps {
  readonly label: string
  readonly labelFor: string
  readonly errorId: string
  readonly error?: string
  readonly children: ReactNode
}

export function FieldFrame({ label, labelFor, errorId, error, children }: FieldFrameProps) {
  return (
    <div className="field">
      <label htmlFor={labelFor}>{label}</label>
      {children}
      <p id={errorId} className="error">
        {error}
      </p>
    </div>
  )
}
