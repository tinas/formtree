<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'

import { provideFormNode, useForm } from '@formtree/vue'
import { computed, ref, shallowRef } from 'vue'

import { SHIPPING_COUNTRIES } from './api'
import { checkoutGroup } from './forms/checkout'
import CartStep from './steps/cart-step.vue'
import ContactStep from './steps/contact-step.vue'
import DeliveryStep from './steps/delivery-step.vue'
import PaymentStep from './steps/payment-step.vue'
import UpdatesStep from './steps/updates-step.vue'

const STEPS = [
  { title: 'Cart', component: CartStep },
  { title: 'Contact', component: ContactStep },
  { title: 'Delivery', component: DeliveryStep },
  { title: 'Updates', component: UpdatesStep },
  { title: 'Payment', component: PaymentStep },
]

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const form = provideFormNode(
  useForm(checkoutGroup, {
    deps: { cartId: 'cart_42', countries: SHIPPING_COUNTRIES },
    focusElement: focusSmoothly,
    initialValue: {
      cart: { lineItems: [{ id: 101, sku: 'MUG-01', quantity: 2 }] },
    },
  }),
)

const stepIndex = ref(0)
const output = shallowRef<OutputOf<typeof checkoutGroup>>()

const stepFormIds = computed(() => [
  form.group('cart').id,
  form.group('contact').id,
  form.group('delivery').id,
  `${form.field('notifyBy').id}:step`,
  form.group('payment').id,
])
const isLastStep = computed(() => stepIndex.value == STEPS.length - 1)
const inspectedState = computed(() => {
  const { valid, dirty, value } = form.state
  return JSON.stringify({ valid, dirty, value }, null, 2)
})

const placeOrder = form.handleSubmit(order => {
  output.value = order
})

function completeStep(): void {
  if (isLastStep.value) {
    void placeOrder()
    return
  }
  stepIndex.value += 1
}

function focusSmoothly(element: HTMLElement): void {
  element.focus({ preventScroll: true })
  element.scrollIntoView({ block: 'center', behavior: matchMedia(REDUCED_MOTION_QUERY).matches ? 'instant' : 'smooth' })
}
</script>

<template>
  <main class="layout">
    <header class="intro">
      <h1>Checkout · Vue</h1>
      <p>
        The same definitions as the plain DOM playground, through @formtree/vue. Steps find their node by definition;
        inputs take a name; nothing passes a node through props.
      </p>
    </header>

    <ol class="steps">
      <li v-for="(step, index) in STEPS" :key="step.title" :class="{ current: index == stepIndex }">
        {{ step.title }}
      </li>
    </ol>

    <section class="wizard">
      <component :is="STEPS[stepIndex].component" @complete="completeStep" />
      <footer class="wizard-footer">
        <button type="button" class="secondary" :disabled="stepIndex == 0" @click="stepIndex -= 1">Back</button>
        <button type="submit" :form="stepFormIds[stepIndex]" :aria-busy="form.state.submitting">
          {{ isLastStep ? 'Place order' : 'Continue' }}
        </button>
      </footer>
    </section>

    <aside class="inspector">
      <h2>Form state</h2>
      <pre>{{ inspectedState }}</pre>
      <h2>Last submitted output</h2>
      <pre>{{ output ? JSON.stringify(output, null, 2) : 'Nothing submitted yet.' }}</pre>
    </aside>
  </main>
</template>
