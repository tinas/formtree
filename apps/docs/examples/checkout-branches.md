# Checkout Branches

A checkout whose delivery and payment details follow the customer's choices.

<script setup>
import CheckoutBranches from './demos/checkout-branches.vue'
</script>

<DemoFrame title="Parts that follow the customer's answers">
  <CheckoutBranches />
</DemoFrame>

Type a cardholder name, switch to invoice, and submit. The draft keeps the name, and the output
leaves it out.

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
