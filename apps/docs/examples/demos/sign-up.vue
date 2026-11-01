<script setup lang="ts">
import type { NewAccount } from '../forms/api'

import { useField, useForm } from '@formtree/vue'
import { ref } from 'vue'

import { createAccount } from '../forms/api'
import { signUpGroup } from '../forms/sign-up'

const form = useForm(signUpGroup)
const name = useField(form.field('name'))
const email = useField(form.field('email'))

const created = ref<NewAccount>()

const signUp = form.handleSubmit(async account => {
  created.value = await createAccount(account)
})
</script>

<template>
  <form class="demo-form" novalidate @submit.prevent="signUp">
    <div class="demo-field">
      <label :for="name.id">Name</label>
      <input v-model="name.model" v-bind="name.attrs" autocomplete="off" />
      <p :id="name.errorId" class="demo-error">{{ name.state.errors[0]?.code }}</p>
    </div>
    <div class="demo-field">
      <label :for="email.id">Email</label>
      <input v-model="email.model" v-bind="email.attrs" autocomplete="off" />
      <p :id="email.errorId" class="demo-error">{{ email.state.errors[0]?.code }}</p>
    </div>
    <button type="submit" :aria-busy="form.state.submitting">Sign up</button>
    <pre v-if="created" class="demo-output">{{ created }}</pre>
  </form>
</template>
