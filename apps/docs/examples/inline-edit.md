# Inline Edit

A price edited in a table cell. Each cell is a form whose root is a single field, built from the
same `priceField` a product page would use, so the table and the page apply the same rule.

<script setup>
import InlineEdit from './demos/inline-edit.vue'
</script>

<DemoFrame title="A field as the root of a form">
  <InlineEdit />
</DemoFrame>

::: details Show code

<<< ./demos/inline-edit.vue

<<< ./demos/price-cell.vue

:::

Change a price and press Enter. The cell submits its one field, and `reset({ value })` makes the
saved price the cell's new initial value. Clear the price or enter a negative number to see the
same errors a full product form would show.
