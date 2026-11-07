# Segment Builder

A segment of users built from conditions and groups of conditions, nested to any depth.

<script setup>
import SegmentBuilder from './demos/segment-builder.vue'
</script>

<DemoFrame title="A form that contains itself">
  <SegmentBuilder />
</DemoFrame>

Uncheck the device attribute to see every level reject it, or empty a group to see its rule.

::: code-group

<<< ./demos/segment-builder.vue [demos/segment-builder.vue]

<<< ./demos/condition-tree.vue [demos/condition-tree.vue]

<<< ./demos/condition-row.vue [demos/condition-row.vue]

<<< ./forms/segment.ts [forms/segment.ts]

<<< ./forms/schemas.ts [forms/schemas.ts]

<<< ./forms/api.ts [forms/api.ts]

<<< ./components/select-field.vue [components/select-field.vue]

<<< ./components/text-field.vue [components/text-field.vue]

:::
