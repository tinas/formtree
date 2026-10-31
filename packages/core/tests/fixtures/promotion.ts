import type { GroupDefinition, InputOf } from '../../src'

import { z } from 'zod'

import { arrayOf, defineField, defineFieldWithDeps, defineGroup, defineGroupWithDeps } from '../../src'

export const REWARD = {
  FIXED: 'FIXED',
  PERCENT: 'PERCENT',
  GIFT: 'GIFT',
} as const

export const GIFT_DELIVERY = {
  SEPARATE: 'SEPARATE',
  WITH_ORDER: 'WITH_ORDER',
} as const

export const WRAPPING = {
  PAPER: 'PAPER',
  BOX: 'BOX',
} as const

export const USAGE = {
  ONCE: 'ONCE',
  REPEAT: 'REPEAT',
} as const

export const SCOPE = {
  CART: 'CART',
  ITEM: 'ITEM',
} as const

export const PERIOD = {
  DAILY: 'DAILY',
  TOTAL: 'TOTAL',
} as const

export const CONDITION_OPERATOR = {
  GT: 'GT',
  LT: 'LT',
} as const

export interface AttributeConfig {
  readonly id: string
}

export interface AttributeDeps {
  readonly attributes: ReadonlyArray<AttributeConfig>
}

export interface NameCheck {
  readonly name: string
  readonly storeId: number
  readonly signal: AbortSignal
}

export const nameChecks: Array<NameCheck> = []

export const takenNames = new Set(['Taken'])

export const promotionNameField = defineFieldWithDeps<{ storeId: number }>()({
  schema: z.string({ error: 'Enter a name' }).trim().min(1, { error: 'Enter a name' }),
  validateAsync: {
    on: 'blur',
    debounceMs: 300,
    run: async (name, { signal, deps }) => {
      nameChecks.push({ name, storeId: deps.storeId, signal })
      await Promise.resolve()
      return takenNames.has(name) ? { code: 'This name is already used' } : undefined
    },
  },
})

export const maxDiscountField = defineField({
  schema: z.number({ error: 'Enter a maximum discount' }).positive({ error: 'The maximum discount must be positive' }),
})

export const wrappingField = defineField({
  schema: z.enum(WRAPPING, { error: 'Choose a wrapping' }),
})

export const setupStepGroup = defineGroupWithDeps<{ storeId: number }>()({
  schema: z.object({
    product: z.object(
      {
        productId: z.number().positive(),
        productName: z.string().optional(),
      },
      { error: 'Choose a product' },
    ),
  }),
  children: { name: promotionNameField },
  childDeps: { name: ({ deps }) => ({ storeId: deps.storeId }) },
})

export const limitsGroup = defineGroup({
  schema: z.object({
    usage: z.enum(USAGE, { error: 'Choose how often it applies' }),
    scope: z.enum(SCOPE, { error: 'Choose where it applies' }),
  }),
})

export const giftGroup = defineGroup({
  schema: z.object({
    giftId: z.number({ error: 'Choose a gift' }).int().positive(),
    delivery: z.enum(GIFT_DELIVERY, { error: 'Choose how the gift is sent' }),
  }),
  children: { wrapping: wrappingField },
  activeWhen: {
    wrapping: ({ value }) => value.delivery == GIFT_DELIVERY.SEPARATE,
  },
})

export const rewardStepGroup = defineGroup({
  schema: z.object({ type: z.enum(REWARD, { error: 'Choose a reward' }) }),
  children: { limits: limitsGroup, gift: giftGroup },
  activeWhen: {
    limits: ({ value }) => value.type == REWARD.PERCENT || value.type == REWARD.GIFT,
    gift: ({ value }) => value.type == REWARD.GIFT,
  },
})

export const slotRowGroup = defineGroup({
  schema: z.object({
    id: z.number().int().positive().optional(),
    label: z.string().optional(),
    amount: z.number({ error: 'Enter an amount' }).positive({ error: 'The amount must be positive' }),
    dates: z.array(z.string(), { error: 'Choose at least one date' }).min(1, { error: 'Choose at least one date' }),
  }),
})

export const spendingStepGroup = defineGroup({
  schema: z.object({
    period: z.enum(PERIOD, { error: 'Choose a period' }),
  }),
  children: {
    maxDiscount: maxDiscountField,
    slots: arrayOf(slotRowGroup, {
      validate: rows => overlappingDates(rows),
    }),
  },
})

export const conditionGroup = defineGroupWithDeps<AttributeDeps>()({
  schema: ({ deps }) =>
    z.object({
      attribute: z
        .string({ error: 'Choose an attribute' })
        .refine(id => deps.attributes.some(attribute => attribute.id == id), {
          error: 'This attribute is not available',
        }),
      operator: z.enum(CONDITION_OPERATOR, { error: 'Choose an operator' }),
      value: z.number({ error: 'Enter a value' }),
    }),
})

export interface ConditionTreeInput {
  operator: 'AND' | 'OR'
  conditions: Array<InputOf<typeof conditionGroup>>
  groups: Array<ConditionTreeInput>
}

export const conditionTreeGroup: GroupDefinition<ConditionTreeInput, ConditionTreeInput, AttributeDeps> =
  defineGroupWithDeps<AttributeDeps>()({
    schema: z.object({ operator: z.enum(['AND', 'OR'], { error: 'Choose how conditions combine' }) }),
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

export const promotionGroup = defineGroupWithDeps<{ storeId: number } & AttributeDeps>()({
  schema: z.object({
    categoryIds: z
      .array(z.number().int().positive(), { error: 'Choose at least one category' })
      .min(1, { error: 'Choose at least one category' }),
  }),
  children: {
    setup: setupStepGroup,
    reward: rewardStepGroup,
    spending: spendingStepGroup,
    eligibility: conditionTreeGroup,
  },
  childDeps: {
    setup: ({ deps }) => ({ storeId: deps.storeId }),
    eligibility: ({ deps }) => ({ attributes: deps.attributes }),
  },
})

interface SlotDraft {
  readonly dates?: ReadonlyArray<string>
}

function overlappingDates(rows: ReadonlyArray<SlotDraft>) {
  const seen = new Set<string>()
  return rows.flatMap((row, index) => {
    return (row.dates ?? []).flatMap(date => {
      if (seen.has(date)) {
        return [
          {
            path: `${index}.dates`,
            code: 'This date is already used',
            params: { date },
          },
        ]
      }
      seen.add(date)
      return []
    })
  })
}
