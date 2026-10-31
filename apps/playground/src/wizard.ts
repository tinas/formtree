import type { SubmitEventLike, SubmitOutcome } from '@formtree/core'

import { SUBMIT_OUTCOME } from '@formtree/core'

export interface WizardStep {
  readonly title: string
  readonly element: HTMLFormElement
  readonly submit: (event?: SubmitEventLike) => Promise<SubmitOutcome>
}

export interface WizardElements {
  readonly progress: HTMLOListElement
  readonly back: HTMLButtonElement
  readonly next: HTMLButtonElement
}

export interface WizardBinding {
  readonly steps: ReadonlyArray<WizardStep>
  readonly elements: WizardElements
  readonly onComplete: () => Promise<SubmitOutcome>
}

interface WizardPosition {
  index: number
}

export function bindWizard(binding: WizardBinding): () => void {
  const position: WizardPosition = { index: 0 }
  binding.steps.forEach((step, index) => {
    step.element.addEventListener('submit', event => {
      void continueFrom({ binding, position, index, event })
    })
  })
  binding.elements.back.addEventListener('click', () => {
    position.index = Math.max(0, position.index - 1)
    renderWizard(binding, position)
  })
  return () => renderWizard(binding, position)
}

interface StepSubmission {
  readonly binding: WizardBinding
  readonly position: WizardPosition
  readonly index: number
  readonly event: SubmitEvent
}

async function continueFrom({ binding, position, index, event }: StepSubmission): Promise<void> {
  const outcome = await binding.steps[index].submit(event)
  if (outcome != SUBMIT_OUTCOME.success) {
    return
  }
  if (index == binding.steps.length - 1) {
    await binding.onComplete()
    return
  }
  position.index = index + 1
  renderWizard(binding, position)
}

function renderWizard(binding: WizardBinding, position: WizardPosition): void {
  const { steps, elements } = binding
  steps.forEach((step, index) => {
    step.element.hidden = index != position.index
  })
  elements.progress.replaceChildren(
    ...steps.map((step, index) => {
      const item = document.createElement('li')
      item.textContent = step.title
      item.classList.toggle('current', index == position.index)
      return item
    }),
  )
  elements.back.disabled = position.index == 0
  elements.next.setAttribute('form', steps[position.index].element.id)
  elements.next.textContent = position.index == steps.length - 1 ? 'Place order' : 'Continue'
}
