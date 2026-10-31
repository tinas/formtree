<script setup lang="ts">
import { useField, useForm } from '@formtree/vue'
import { ref } from 'vue'

import { promoCodeField } from '../forms/checkout'

const form = useForm(promoCodeField, { deps: { cartId: 'cart_42' } })
const code = useField(form)

const applied = ref<string>()

const apply = form.handleSubmit(value => {
  applied.value = value
})
</script>

<template>
  <form class="demo-form" novalidate @submit.prevent="apply">
    <div class="demo-field">
      <label :for="code.id">Promo code</label>
      <div class="demo-row">
        <input v-model="code.model" v-bind="code.attrs" autocomplete="off" style="flex: 1" />
        <button type="submit">Apply</button>
      </div>
      <p :id="code.errorId" class="demo-error">
        {{ code.state.validating ? 'Checking…' : code.state.errors[0]?.code }}
      </p>
    </div>
    <p class="demo-hint">Try welcome10 or freeship. Any other code is not valid.</p>
    <p v-if="applied" class="demo-hint">Applied {{ applied }}</p>
  </form>
</template>
