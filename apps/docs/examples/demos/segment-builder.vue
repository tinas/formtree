<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'

import { provideFormNode, useField, useForm } from '@formtree/vue'
import { computed, ref, shallowRef } from 'vue'

import { ATTRIBUTES } from '../forms/api'
import { MATCH, segmentGroup } from '../forms/segment'
import ConditionTree from './condition-tree.vue'

const deviceAvailable = ref(true)

const attributes = computed(() => {
  return deviceAvailable.value ? ATTRIBUTES : ATTRIBUTES.filter(attribute => attribute.id !== 'device')
})

const form = useForm(segmentGroup, {
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

const output = shallowRef<OutputOf<typeof segmentGroup>>()

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
        <p :id="name.errorId" class="demo-error">{{ name.state.errors[0]?.code }}</p>
      </div>
      <ConditionTree />
      <label class="demo-row">
        <input v-model="deviceAvailable" type="checkbox" style="width: auto" />
        The server offers the "device" attribute
      </label>
      <div class="demo-row">
        <button type="submit">Save segment</button>
      </div>
    </form>

    <div class="demo-form">
      <p class="demo-hint">Output</p>
      <pre class="demo-output">{{ output ? JSON.stringify(output, null, 2) : 'Submit to see the output' }}</pre>
    </div>
  </div>
</template>
