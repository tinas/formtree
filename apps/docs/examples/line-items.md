# Line Items

A cart edited row by row. Each row validates and saves on its own, knows whether it has unsaved
changes, and keeps its state when it moves.

<script setup>
import LineItems from './demos/line-items.vue'
</script>

<DemoFrame title="arrayOf, row submit, cross-row rule">
  <LineItems />
</DemoFrame>

::: details Show code

<<< ./demos/line-items.vue

<<< ./demos/line-item-row.vue

:::

Change a quantity and the row shows "Unsaved changes". Saving it calls `reset({ value })` with
the saved item, which makes only that row clean.

Pick the same product in two rows to see the rule on the array: it compares rows with each other
and puts the error on the duplicate.

Clear a quantity, blur the field and move the row up. The error and the touched state move with
the row, because items are identified by key, not by position.
