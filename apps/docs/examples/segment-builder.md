# Segment Builder

Users who match all of a set of conditions, where one condition can be a group that matches any
of its own. The tree nests to any depth, and the attributes a condition can use come from the
server.

<script setup>
import SegmentBuilder from './demos/segment-builder.vue'
</script>

<DemoFrame title="Recursive definition with dependencies">
  <SegmentBuilder />
</DemoFrame>

Uncheck "The server offers the device attribute". The dependencies change, the condition schema
is rebuilt at every depth, and the nested `device` condition reports that the attribute is not
available. Check it again and the error goes away.

Remove every condition and group from a level to see the rule written with `validate`. It puts an
error on the empty group's `conditions`.

The demo uses `mode: 'all'`, so errors show without touching the fields first.
`condition-tree.vue` renders itself for nested groups. Each level injects the nearest
`conditionTreeGroup` node and provides its own item, so the inputs inside bind by name.

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
