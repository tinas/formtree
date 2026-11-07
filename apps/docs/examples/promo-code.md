# Promo Code

A promo code that the server checks when the customer leaves the field.

<script setup>
import PromoCode from './demos/promo-code.vue'
</script>

<DemoFrame title="A check only the server can answer">
  <PromoCode />
</DemoFrame>

Type a code and leave the field, or press Enter and the submit waits for the check.

::: code-group

<<< ./demos/promo-code.vue [demos/promo-code.vue]

<<< ./forms/promo-code.ts [forms/promo-code.ts]

<<< ./forms/api.ts [forms/api.ts]

:::
