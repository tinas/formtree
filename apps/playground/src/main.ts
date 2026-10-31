import './style.css'

import { createForm } from '@formtree/core'

import { COUNTRIES, SHIPPING_COUNTRIES, STORES } from './api'
import { bindChoices } from './choices'
import { bindCheckbox, bindField, elementById, fillOptions, formatValue, parseText } from './dom/bindings'
import { checkoutGroup, DELIVERY_METHOD, NOTIFICATION_CHANNEL, PAYMENT_METHOD } from './forms/checkout'
import { bindLineItems } from './line-items'
import { bindWizard } from './wizard'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const NOTIFICATION_CHOICES = [
  { value: NOTIFICATION_CHANNEL.email, label: 'Email' },
  { value: NOTIFICATION_CHANNEL.sms, label: 'SMS' },
  { value: NOTIFICATION_CHANNEL.push, label: 'Push notification' },
]

const form = createForm(checkoutGroup, {
  id: 'checkout',
  deps: { cartId: 'cart_42', countries: SHIPPING_COUNTRIES },
  focusElement: focusSmoothly,
  initialValue: {
    cart: { lineItems: [{ id: 101, sku: 'MUG-01', quantity: 2 }] },
  },
})

const cart = form.group('cart')
const contact = form.group('contact')
const delivery = form.group('delivery')
const payment = form.group('payment')
const notifyBy = form.field('notifyBy')

fillOptions(elementById('delivery-method'), [
  { value: DELIVERY_METHOD.shipping, label: 'Ship to an address' },
  { value: DELIVERY_METHOD.pickup, label: 'Pick up in store' },
])
fillOptions(
  elementById('country'),
  COUNTRIES.map(country => {
    return {
      value: country.code,
      label: country.name,
    }
  }),
)
fillOptions(
  elementById('store'),
  STORES.map(store => {
    return {
      value: store.storeId,
      label: store.name,
    }
  }),
)
fillOptions(elementById('payment-method'), [
  { value: PAYMENT_METHOD.card, label: 'Card' },
  { value: PAYMENT_METHOD.invoice, label: 'Invoice' },
])

const renderers = [
  bindLineItems({
    node: cart.array('lineItems'),
    container: elementById('line-items'),
    template: elementById('line-item-row'),
    addButton: elementById('add-item'),
    message: elementById('line-items-error'),
  }),
  bindField({
    node: cart.field('promoCode'),
    control: elementById('promo-code'),
    label: elementById('promo-code-label'),
    message: elementById('promo-code-error'),
    parse: parseText,
    format: formatValue,
  }),
  bindField({
    node: contact.field('fullName'),
    control: elementById('full-name'),
    label: elementById('full-name-label'),
    message: elementById('full-name-error'),
    parse: parseText,
    format: formatValue,
  }),
  bindField({
    node: contact.field('email'),
    control: elementById('email'),
    label: elementById('email-label'),
    message: elementById('email-error'),
    parse: parseText,
    format: formatValue,
  }),
  bindField({
    node: delivery.field('method'),
    control: elementById('delivery-method'),
    label: elementById('delivery-method-label'),
    message: elementById('delivery-method-error'),
    parse: text => Object.values(DELIVERY_METHOD).find(value => value == text),
    format: formatValue,
  }),
  bindField({
    node: delivery.field('address.street'),
    control: elementById('street'),
    label: elementById('street-label'),
    message: elementById('street-error'),
    parse: parseText,
    format: formatValue,
  }),
  bindField({
    node: delivery.field('address.city'),
    control: elementById('city'),
    label: elementById('city-label'),
    message: elementById('city-error'),
    parse: parseText,
    format: formatValue,
  }),
  bindField({
    node: delivery.field('address.country'),
    control: elementById('country'),
    label: elementById('country-label'),
    message: elementById('country-error'),
    parse: parseText,
    format: formatValue,
  }),
  bindField({
    node: delivery.field('address.state'),
    control: elementById('us-state'),
    label: elementById('us-state-label'),
    message: elementById('us-state-error'),
    parse: parseText,
    format: formatValue,
  }),
  bindField({
    node: delivery.field('store'),
    control: elementById('store'),
    label: elementById('store-label'),
    message: elementById('store-error'),
    parse: text => STORES.find(store => store.storeId == text),
    format: store => formatValue(store?.storeId),
  }),
  bindChoices({
    node: notifyBy,
    fieldset: elementById('notify-by'),
    message: elementById('notify-by-error'),
    choices: NOTIFICATION_CHOICES,
  }),
  bindField({
    node: payment.field('method'),
    control: elementById('payment-method'),
    label: elementById('payment-method-label'),
    message: elementById('payment-method-error'),
    parse: text => Object.values(PAYMENT_METHOD).find(value => value == text),
    format: formatValue,
  }),
  bindField({
    node: payment.field('card.holder'),
    control: elementById('card-holder'),
    label: elementById('card-holder-label'),
    message: elementById('card-holder-error'),
    parse: parseText,
    format: formatValue,
  }),
  bindField({
    node: payment.field('card.number'),
    control: elementById('card-number'),
    label: elementById('card-number-label'),
    message: elementById('card-number-error'),
    parse: parseText,
    format: formatValue,
  }),
  bindField({
    node: payment.field('invoice.company'),
    control: elementById('company'),
    label: elementById('company-label'),
    message: elementById('company-error'),
    parse: parseText,
    format: formatValue,
  }),
  bindField({
    node: payment.field('invoice.taxId'),
    control: elementById('tax-id'),
    label: elementById('tax-id-label'),
    message: elementById('tax-id-error'),
    parse: parseText,
    format: formatValue,
  }),
  bindCheckbox({
    node: form.field('acceptTerms'),
    control: elementById('accept-terms'),
    message: elementById('accept-terms-error'),
  }),
  bindWizard({
    steps: [
      { title: 'Cart', element: elementById('cart-step'), submit: cart.handleSubmit(() => undefined) },
      { title: 'Contact', element: elementById('contact-step'), submit: contact.handleSubmit(() => undefined) },
      { title: 'Delivery', element: elementById('delivery-step'), submit: delivery.handleSubmit(() => undefined) },
      { title: 'Updates', element: elementById('updates-step'), submit: notifyBy.handleSubmit(() => undefined) },
      { title: 'Payment', element: elementById('payment-step'), submit: payment.handleSubmit(() => undefined) },
    ],
    elements: {
      progress: elementById('steps'),
      back: elementById('back'),
      next: elementById('continue'),
    },
    onComplete: form.handleSubmit(order => {
      elementById('output').textContent = JSON.stringify(order, null, 2)
    }),
  }),
  renderVisibility,
  renderInspector,
]

elementById('cart-step').id = cart.id
elementById('contact-step').id = contact.id
elementById('delivery-step').id = delivery.id
elementById('payment-step').id = payment.id

form.subscribe(renderAll)
renderAll()

function renderAll(): void {
  for (const render of renderers) {
    render()
  }
}

function renderVisibility(): void {
  elementById('address').hidden = !delivery.group('address').state.active
  elementById('us-state-field').hidden = !delivery.field('address.state').state.active
  elementById('store-field').hidden = !delivery.field('store').state.active
  elementById('card').hidden = !payment.group('card').state.active
  elementById('invoice').hidden = !payment.group('invoice').state.active
  elementById('promo-code-checking').hidden = !cart.field('promoCode').state.validating
}

function renderInspector(): void {
  const { value, valid, dirty } = form.state
  elementById('state').textContent = JSON.stringify({ valid, dirty, value }, null, 2)
}

function focusSmoothly(element: HTMLElement): void {
  element.focus({ preventScroll: true })
  element.scrollIntoView({ block: 'center', behavior: matchMedia(REDUCED_MOTION_QUERY).matches ? 'instant' : 'smooth' })
}
