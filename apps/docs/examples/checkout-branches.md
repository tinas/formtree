# Checkout Branches

A delivery step and a payment step whose shape follows the customer's choices. The address
appears only for shipping, the state only for the United States, and card or invoice details
only for the chosen payment method.

<script setup>
import CheckoutBranches from './demos/checkout-branches.vue'
</script>

<DemoFrame title="activeWhen, schema default">
  <CheckoutBranches />
</DemoFrame>

Pick card, type a cardholder name, switch to invoice and submit. The draft still holds the
cardholder name, and the output has only the invoice details. Switch back to card and the name
is there again.

Submit an invoice and leave "Due in days" empty. The draft has no `dueInDays`, and the output has
30, the default of the schema, which the input shows as its placeholder. Type 14 and the output
follows. Clear the field and the default is back, because the number input writes `undefined`
when it is empty. [Starting values and schema defaults](/guide/fields#starting-values-and-schema-defaults)
explains how this differs from `initialValue`.

Choose France as the country to see a rule built from [dependencies](/guide/dependencies). The
countries the store ships to are passed in from outside, and France is not among them.

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
