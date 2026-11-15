# Conditional Checkout

A checkout whose delivery and payment details follow the choices of the customer.

<script setup>
import CheckoutBranches from './demos/checkout-branches.vue'
</script>

<DemoFrame title="Parts that follow the answers of the customer">
  <CheckoutBranches />
</DemoFrame>

Type a cardholder name, switch to invoice, and submit. The name is kept in the draft but left
out of the output.

::: code-group

<<< ./demos/checkout-branches.vue [demos/checkout-branches.vue]

<<< ./forms/delivery.ts [forms/delivery.ts]

<<< ./forms/payment.ts [forms/payment.ts]

<<< ./forms/schemas.ts [forms/schemas.ts]

<<< ./forms/api.ts [forms/api.ts]

<<< ./components/number-field.vue [components/number-field.vue]

<<< ./components/select-field.vue [components/select-field.vue]

<<< ./components/text-field.vue [components/text-field.vue]

:::
