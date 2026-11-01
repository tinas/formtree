# Role-based Rules

An admin needs a longer password than a member. The password field knows only about a minimum
length, and the account group turns the chosen role into that length with `childDeps`.

<script setup>
import RoleBasedRules from './demos/role-based-rules.vue'
</script>

<DemoFrame title="childDeps from the parent's value">
  <RoleBasedRules />
</DemoFrame>

Type a 10-character password as a member, then switch the role to admin. The password schema is
rebuilt with the new minimum, and the field becomes invalid at once, without a watcher and
without touching the password.

"Repeat password" is checked by a `validate` rule on the group, because it compares two of the
group's values.

::: code-group

<<< ./demos/role-based-rules.vue [demos/role-based-rules.vue]

<<< ./forms/account.ts [forms/account.ts]

<<< ./components/select-field.vue [components/select-field.vue]

<<< ./components/text-field.vue [components/text-field.vue]

:::
