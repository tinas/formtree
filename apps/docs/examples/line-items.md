# Line Items

A cart where each row validates and saves on its own.

<script setup>
import LineItems from './demos/line-items.vue'
</script>

<DemoFrame title="Rows that save on their own">
  <LineItems />
</DemoFrame>

Change a quantity and save the row, or pick the same product twice to see the rule across rows.

::: code-group

<<< ./demos/line-items.vue [demos/line-items.vue]

<<< ./demos/line-item-row.vue [demos/line-item-row.vue]

<<< ./forms/line-items.ts [forms/line-items.ts]

<<< ./forms/schemas.ts [forms/schemas.ts]

<<< ./forms/api.ts [forms/api.ts]

<<< ./components/number-field.vue [components/number-field.vue]

<<< ./components/select-field.vue [components/select-field.vue]

:::
