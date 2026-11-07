# Inline Edit

A table where each price is a form of its own, built from `priceField`.

<script setup>
import InlineEdit from './demos/inline-edit.vue'
</script>

<DemoFrame title="A field as the root of a form">
  <InlineEdit />
</DemoFrame>

Change a price and press Enter to save it. Clear it or make it negative to see an error.

::: code-group

<<< ./demos/inline-edit.vue [demos/inline-edit.vue]

<<< ./demos/price-cell.vue [demos/price-cell.vue]

<<< ./forms/product.ts [forms/product.ts]

<<< ./forms/api.ts [forms/api.ts]

:::
