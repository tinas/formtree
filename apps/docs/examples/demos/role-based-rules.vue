<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'

import { provideFormNode, useForm } from '@formtree/vue'
import { computed, shallowRef } from 'vue'

import SelectField from '../components/select-field.vue'
import TextField from '../components/text-field.vue'
import { accountGroup, ROLE } from '../forms/account'

const ROLE_OPTIONS = [
  { value: ROLE.member, label: 'Member' },
  { value: ROLE.admin, label: 'Admin' },
]

const form = provideFormNode(useForm(accountGroup, { initialValue: { role: ROLE.member } }))

const password = form.field('password')

const passwordCheck = computed(() => {
  const errors = password.listErrors({ includeHidden: true }).map(error => error.code)
  return JSON.stringify({ valid: password.state.valid, errors }, null, 2)
})

const output = shallowRef<OutputOf<typeof accountGroup>>()

const createAccount = form.handleSubmit(account => {
  output.value = account
})
</script>

<template>
  <div class="demo-columns">
    <form class="demo-form" novalidate @submit.prevent="createAccount">
      <TextField name="email" label="Email" />
      <SelectField name="role" label="Role" :options="ROLE_OPTIONS" />
      <TextField name="password" label="Password" />
      <p class="demo-hint">
        {{ form.state.value.role === ROLE.admin ? 'Admins need 12 characters.' : 'Members need 8 characters.' }}
      </p>
      <TextField name="confirmPassword" label="Repeat password" />
      <div class="demo-row">
        <button type="submit">Create account</button>
      </div>
    </form>

    <div class="demo-form">
      <p class="demo-hint">The password field, hidden errors included</p>
      <pre class="demo-output">{{ passwordCheck }}</pre>
      <p class="demo-hint">Output</p>
      <pre class="demo-output">{{ output ? JSON.stringify(output, null, 2) : 'Submit to see the output' }}</pre>
    </div>
  </div>
</template>
