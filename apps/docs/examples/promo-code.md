# Promo Code

A promo code is checked against the server after the customer leaves the field. The field is the
root of its own form, with the cart id as a dependency.

<script setup>
import PromoCode from './demos/promo-code.vue'
</script>

<DemoFrame title="validateAsync">
  <PromoCode />
</DemoFrame>

The schema trims and upper-cases the code, and the check runs on that output, so `welcome10` is
checked as `WELCOME10`. While the check runs, `state.validating` is `true` and the field shows
"Checking…".

Type a code and press Enter without leaving the field. The submit runs the check that has not run
yet and waits for it. Going back to a code that was already checked uses the cached result.

::: code-group

<<< ./demos/promo-code.vue [demos/promo-code.vue]

<<< ./forms/promo-code.ts [forms/promo-code.ts]

<<< ./forms/api.ts [forms/api.ts]

:::
