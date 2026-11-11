<script setup lang="ts">
import { provideFormNode, useFormNode } from '@formtree/vue'

import SelectField from '../components/select-field.vue'
import TextField from '../components/text-field.vue'
import { ATTRIBUTES } from '../forms/api'
import { conditionTreeGroup, OPERATOR } from '../forms/segment'

const props = defineProps<{ index: number }>()

const ATTRIBUTE_OPTIONS = ATTRIBUTES.map(attribute => ({
  value: attribute.id,
  label: attribute.label,
}))
const OPERATOR_OPTIONS = [
  { value: OPERATOR.is, label: 'is' },
  { value: OPERATOR.isNot, label: 'is not' },
]

const conditions = useFormNode(conditionTreeGroup).array('conditions')
provideFormNode(conditions.items[props.index]!)
</script>

<template>
  <div class="demo-row" style="align-items: flex-start">
    <SelectField
      name="attribute"
      label="Attribute"
      :options="ATTRIBUTE_OPTIONS"
    />
    <SelectField
      name="operator"
      label="Operator"
      :options="OPERATOR_OPTIONS"
    />
    <TextField name="value" label="Value" />
    <button
      type="button"
      style="margin-top: 22px"
      @click="conditions.remove(index)"
    >
      Remove
    </button>
  </div>
</template>
