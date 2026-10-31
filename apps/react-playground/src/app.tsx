import type { OutputOf } from '@formtree/react'
import type { ReactElement } from 'react'
import type { StepProps } from './steps/step-props'

import { FormNodeProvider, useForm } from '@formtree/react'
import { useState } from 'react'

import { SHIPPING_COUNTRIES } from './api'
import { checkoutGroup } from './forms/checkout'
import { CartStep } from './steps/cart-step'
import { ContactStep } from './steps/contact-step'
import { DeliveryStep } from './steps/delivery-step'
import { PaymentStep } from './steps/payment-step'
import { UpdatesStep } from './steps/updates-step'

interface WizardStep {
  readonly title: string
  readonly Component: (props: StepProps) => ReactElement
}

const STEPS: ReadonlyArray<WizardStep> = [
  { title: 'Cart', Component: CartStep },
  { title: 'Contact', Component: ContactStep },
  { title: 'Delivery', Component: DeliveryStep },
  { title: 'Updates', Component: UpdatesStep },
  { title: 'Payment', Component: PaymentStep },
]

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function App() {
  const form = useForm(checkoutGroup, {
    deps: { cartId: 'cart_42', countries: SHIPPING_COUNTRIES },
    focusElement: focusSmoothly,
    initialValue: {
      cart: { lineItems: [{ id: 101, sku: 'MUG-01', quantity: 2 }] },
    },
  })
  const [stepIndex, setStepIndex] = useState(0)
  const [output, setOutput] = useState<OutputOf<typeof checkoutGroup>>()
  const { valid, dirty, value, submitting } = form.state
  const stepFormIds = [
    form.group('cart').id,
    form.group('contact').id,
    form.group('delivery').id,
    `${form.field('notifyBy').id}:step`,
    form.group('payment').id,
  ]
  const isLastStep = stepIndex == STEPS.length - 1
  const { Component: CurrentStep } = STEPS[stepIndex]
  const placeOrder = form.handleSubmit(order => setOutput(order))

  function completeStep(): void {
    if (isLastStep) {
      void placeOrder()
      return
    }
    setStepIndex(stepIndex + 1)
  }

  return (
    <FormNodeProvider node={form}>
      <main className="layout">
        <header className="intro">
          <h1>Checkout · React</h1>
          <p>
            The same definitions as the plain DOM playground, through @formtree/react. Steps find their node by
            definition; inputs take a name; nothing passes a node through props.
          </p>
        </header>

        <ol className="steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className={index == stepIndex ? 'current' : undefined}>
              {step.title}
            </li>
          ))}
        </ol>

        <section className="wizard">
          <CurrentStep onComplete={completeStep} />
          <footer className="wizard-footer">
            <button
              type="button"
              className="secondary"
              disabled={stepIndex == 0}
              onClick={() => setStepIndex(stepIndex - 1)}
            >
              Back
            </button>
            <button type="submit" form={stepFormIds[stepIndex]} aria-busy={submitting}>
              {isLastStep ? 'Place order' : 'Continue'}
            </button>
          </footer>
        </section>

        <aside className="inspector">
          <h2>Form state</h2>
          <pre>{JSON.stringify({ valid, dirty, value }, null, 2)}</pre>
          <h2>Last submitted output</h2>
          <pre>{output ? JSON.stringify(output, null, 2) : 'Nothing submitted yet.'}</pre>
        </aside>
      </main>
    </FormNodeProvider>
  )
}

function focusSmoothly(element: HTMLElement): void {
  element.focus({ preventScroll: true })
  element.scrollIntoView({ block: 'center', behavior: matchMedia(REDUCED_MOTION_QUERY).matches ? 'instant' : 'smooth' })
}
