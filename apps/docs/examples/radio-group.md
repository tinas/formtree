# Radio Group

A drink order where the drink must be chosen and the milk is optional.

<script setup>
import RadioGroup from './demos/radio-group.vue'
</script>

<DemoFrame title="Radio buttons that share one field">
  <RadioGroup />
</DemoFrame>

Press Order before choosing a drink to see the error of the group. Then choose a milk, switch back to None,
and order again. None empties the field, so the milk is left out of the output.

::: code-group

<<< ./demos/radio-group.vue [demos/radio-group.vue]

<<< ./forms/drink-order.ts [forms/drink-order.ts]

<<< ./components/radio-field.vue [components/radio-field.vue]

:::
