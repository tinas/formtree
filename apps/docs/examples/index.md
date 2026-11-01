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

Pick card, type a cardholder name, switch to invoice and submit. The draft still holds the
cardholder name, and the output has only the invoice details. Switch back to card and the name
is there again.

Choose France as the country to see a rule built from [dependencies](/guide/dependencies). The
countries the store ships to are passed in from outside, and France is not among them.

::: code-group

<<< ./demos/checkout-branches.vue [demos/checkout-branches.vue]

<<< ./forms/delivery.ts [forms/delivery.ts]

<<< ./forms/payment.ts [forms/payment.ts]

<<< ./forms/schemas.ts [forms/schemas.ts]

<<< ./forms/api.ts [forms/api.ts]

<<< ./components/select-field.vue [components/select-field.vue]

<<< ./components/text-field.vue [components/text-field.vue]

:::
