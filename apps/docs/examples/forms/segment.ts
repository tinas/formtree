import type { GroupDefinition, InputOf } from '@formtree/core'

import { arrayOf, defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'

import { requiredText } from './schemas'

export const OPERATOR = {
  is: 'is',
  isNot: 'isNot',
} as const

export const MATCH = {
  all: 'all',
  any: 'any',
} as const

export interface AttributeConfig {
  readonly id: string
  readonly label: string
}

export interface AttributeDeps {
  readonly attributes: ReadonlyArray<AttributeConfig>
}

export const conditionGroup = defineGroupWithDeps<AttributeDeps>()({
  schema: ({ deps }) =>
    z.object({
      attribute: z
        .string({ error: 'Choose an attribute' })
        .refine(id => deps.attributes.some(attribute => attribute.id == id), {
          error: 'This attribute is not available',
        }),
      operator: z.enum(OPERATOR, { error: 'Choose an operator' }),
      value: requiredText('Enter a value'),
    }),
})

export interface ConditionTreeInput {
  match: 'all' | 'any'
  conditions: Array<InputOf<typeof conditionGroup>>
  groups: Array<ConditionTreeInput>
}

export const conditionTreeGroup: GroupDefinition<
  ConditionTreeInput,
  ConditionTreeInput,
  AttributeDeps
> = defineGroupWithDeps<AttributeDeps>()({
  schema: z.object({
    match: z.enum(MATCH, { error: 'Choose how the conditions combine' }),
  }),
  children: {
    conditions: arrayOf(conditionGroup),
    groups: arrayOf(() => conditionTreeGroup),
  },
  childDeps: {
    conditions: ({ deps }) => deps,
    groups: ({ deps }) => deps,
  },
  validate: ({ value }) =>
    value.conditions.length + value.groups.length == 0
      ? { path: 'conditions', code: 'Add a condition or a group' }
      : undefined,
})

export const segmentForm = defineGroupWithDeps<AttributeDeps>()({
  schema: z.object({ name: requiredText('Name the segment') }),
  children: { rules: conditionTreeGroup },
  childDeps: {
    rules: ({ deps }) => deps,
  },
})
