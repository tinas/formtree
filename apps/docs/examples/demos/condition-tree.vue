<script setup lang="ts">
import { provideFormNode, useFormNode } from '@formtree/vue'

import SelectField from '../components/select-field.vue'
import { conditionTreeGroup, MATCH } from '../forms/segment'
import ConditionRow from './condition-row.vue'

defineOptions({ name: 'ConditionTree' })

const props = defineProps<{ index?: number }>()

const MATCH_OPTIONS = [
  { value: MATCH.all, label: 'All of these' },
  { value: MATCH.any, label: 'Any of these' },
]

const parent = useFormNode(conditionTreeGroup)
const tree = props.index == undefined ? parent : provideGroup(props.index)
const conditions = tree.array('conditions')
const groups = tree.array('groups')

function provideGroup(index: number) {
  return provideFormNode(parent.array('groups').items[index]!)
}

function addCondition() {
  conditions.push({})
}

function addGroup() {
  groups.push({ match: MATCH.all })
}
</script>

<template>
  <fieldset class="demo-fieldset">
    <legend>{{ index == undefined ? 'Users matching' : 'Group' }}</legend>
    <SelectField name="match" label="Match" :options="MATCH_OPTIONS" />
    <ConditionRow
      v-for="condition in conditions.items"
      :key="condition.key"
      :index="condition.index"
    />
    <p class="demo-error">{{ conditions.errorMessage }}</p>
    <ConditionTree
      v-for="group in groups.items"
      :key="group.key"
      :index="group.index"
    />
    <div class="demo-row">
      <button type="button" @click="addCondition">Add condition</button>
      <button type="button" @click="addGroup">Add group</button>
      <button
        v-if="index != undefined"
        type="button"
        @click="parent.array('groups').remove(index)"
      >
        Remove group
      </button>
    </div>
  </fieldset>
</template>
