# Line Items

A cart edited row by row. Each row validates and saves on its own, knows whether it has unsaved
changes, and keeps its state when it moves.

<script setup>
import LineItems from './demos/line-items.vue'
</script>

<DemoFrame title="arrayOf, row submit, cross-row rule">
  <LineItems />
</DemoFrame>

Change a quantity and the row shows "Unsaved changes". Saving it calls `reset({ value })` with the
saved item, which makes only that row clean.

Pick the same product in two rows to see the rule on the array. It compares the rows with each
other and puts the error on the duplicate.

Clear a quantity, blur the field and move the row up. The error and the touched state move with
the row, because items are identified by key, not by position.

::: code-group

<<< ./demos/line-items.vue [demos/line-items.vue]

<<< ./demos/line-item-row.vue [demos/line-item-row.vue]

<<< ./forms/line-items.ts [forms/line-items.ts]

<<< ./forms/schemas.ts [forms/schemas.ts]

<<< ./forms/api.ts [forms/api.ts]

<<< ./components/number-field.vue [components/number-field.vue]

<<< ./components/select-field.vue [components/select-field.vue]

:::
