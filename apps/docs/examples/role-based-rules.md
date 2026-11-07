# Role-based Rules

A password whose minimum length depends on the chosen role.

<script setup>
import RoleBasedRules from './demos/role-based-rules.vue'
</script>

<DemoFrame title="A rule that follows another answer">
  <RoleBasedRules />
</DemoFrame>

Type a ten-character password as a member, then switch to admin. The password is too short at once.

::: code-group

<<< ./demos/role-based-rules.vue [demos/role-based-rules.vue]

<<< ./forms/account.ts [forms/account.ts]

<<< ./components/select-field.vue [components/select-field.vue]

<<< ./components/text-field.vue [components/text-field.vue]

:::
