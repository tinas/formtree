<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'

import { provideFormNode, useField, useForm } from '@formtree/vue'
import { computed, ref, shallowRef } from 'vue'

import { ATTRIBUTES } from '../forms/api'
import { MATCH, segmentForm } from '../forms/segment'
import ConditionTree from './condition-tree.vue'

const deviceAvailable = ref(true)

const attributes = computed(() => {
  if (deviceAvailable.value) {
    return ATTRIBUTES
  }
  return ATTRIBUTES.filter(attribute => attribute.id != 'device')
})

const form = useForm(segmentForm, {
  deps: () => ({ attributes: attributes.value }),
  mode: 'all',
  initialValue: {
    name: 'Engaged customers',
    rules: {
      match: MATCH.all,
      conditions: [{ attribute: 'country', operator: 'is', value: 'DE' }],
      groups: [
        {
          match: MATCH.any,
          conditions: [
            { attribute: 'plan', operator: 'is', value: 'pro' },
            { attribute: 'device', operator: 'is', value: 'mobile' },
          ],
          groups: [],
        },
      ],
    },
  },
})

const name = useField(form.field('name'))
provideFormNode(form.group('rules'))

const output = shallowRef<OutputOf<typeof segmentForm>>()
const outputText = computed(() => {
  if (output.value == undefined) {
    return 'Submit to see the output'
  }
  return JSON.stringify(output.value, null, 2)
})

const saveSegment = form.handleSubmit(segment => {
  output.value = segment
})
</script>

<template>
  <div class="demo-columns">
    <form class="demo-form" novalidate @submit.prevent="saveSegment">
      <div class="demo-field">
        <label :for="name.id">Segment name</label>
        <input v-model="name.model" v-bind="name.attrs" autocomplete="off" />
        <p :id="name.errorId" class="demo-error">{{ name.errorMessage }}</p>
      </div>
      <ConditionTree />
      <label class="demo-row">
        <input
          v-model="deviceAvailable"
          type="checkbox"
          style="width: auto"
        />
        The server offers the "device" attribute
      </label>
      <div class="demo-row">
        <button type="submit">Save segment</button>
      </div>
    </form>

    <div class="demo-form">
      <p class="demo-hint">Output</p>
      <pre class="demo-output">{{ outputText }}</pre>
    </div>
  </div>
</template>
