# Checkbox Group

Notification settings where at least one channel must stay on.

<script setup>
import CheckboxGroup from './demos/checkbox-group.vue'
</script>

<DemoFrame title="Checkboxes that fill one list">
  <CheckboxGroup />
</DemoFrame>

Uncheck every channel and press Save to see the error of the group. Then check a few and save again, and
they are listed in the output.

::: code-group

<<< ./demos/checkbox-group.vue [demos/checkbox-group.vue]

<<< ./forms/notifications.ts [forms/notifications.ts]

<<< ./components/checkbox-group-field.vue [components/checkbox-group-field.vue]

:::
