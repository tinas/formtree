# Inline Edit

Prices edited in place, one form per cell. The root of each form is `priceField`, the definition a
product page would use, so the table and the page apply the same rule.

<script setup>
import InlineEdit from './demos/inline-edit.vue'
</script>

<DemoFrame title="A field as the root of a form">
  <InlineEdit />
</DemoFrame>

Change a price and press Enter. The cell submits its one field, and `reset({ value })` makes the
saved price the cell's new initial value. Clear the price or enter a negative number to see the
errors a product form would show.

::: code-group

<<< ./demos/inline-edit.vue [demos/inline-edit.vue]

<<< ./demos/price-cell.vue [demos/price-cell.vue]

<<< ./forms/product.ts [forms/product.ts]

<<< ./forms/api.ts [forms/api.ts]

:::
