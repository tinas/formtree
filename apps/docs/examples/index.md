# Checkout Branches

A delivery step and a payment step whose shape follows the customer's choices. The address
appears only for shipping, the state only for the United States, and card or invoice details
only for the chosen payment method.

<script setup>
import CheckoutBranches from './demos/checkout-branches.vue'
</script>

<DemoFrame title="activeWhen">
  <CheckoutBranches />
</DemoFrame>

::: details Show code

<<< ./demos/checkout-branches.vue

<<< ./forms/checkout.ts

:::

Pick card, type a cardholder name, switch to invoice and submit. The draft still holds the
cardholder name, and the output has only the invoice details. Switch back to card and the name
is there again.

Choose France as the country to see a rule built from [dependencies](/guide/dependencies): the
list of countries the store ships to is passed in from outside, and France is not on it.

The inputs are the generic components from [Field Bindings](/vue/field-bindings). Each takes a
`name` relative to the provided form.
