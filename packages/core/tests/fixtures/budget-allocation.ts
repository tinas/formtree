import type { GroupDefinition, InputOf } from '../../src'

import { z } from 'zod'

import { arrayOf, defineField, defineFieldWithDeps, defineGroup, defineGroupWithDeps } from '../../src'

export const KPI = {
  CPA: 'CPA',
  CPI: 'CPI',
  CPG: 'CPG',
} as const

export const ATTRIBUTED_TIME = {
  INSTALL_TIME: 'INSTALL_TIME',
  EVENT_TIME: 'EVENT_TIME',
} as const

export const KPI_WINDOW = {
  D1: 'D1',
  D7: 'D7',
} as const

export const RE_ATTR_TYPE = {
  EXCLUDE: 'EXCLUDE',
  INCLUDE: 'INCLUDE',
} as const

export const CLAIM_TYPE = {
  CLICK: 'CLICK',
  VIEW: 'VIEW',
} as const

export const STRATEGY = {
  DAILY: 'DAILY',
  LIFETIME: 'LIFETIME',
} as const

export const CONDITION_OPERATOR = {
  GT: 'GT',
  LT: 'LT',
} as const

export interface MetricConfig {
  readonly id: string
}

export interface MetricDeps {
  readonly metrics: ReadonlyArray<MetricConfig>
}

export interface NameCheck {
  readonly name: string
  readonly campaignGroupId: number
  readonly signal: AbortSignal
}

export const nameChecks: Array<NameCheck> = []

export const takenNames = new Set(['Taken'])

export const allocationNameField = defineFieldWithDeps<{ campaignGroupId: number }>()({
  schema: z
    .string({ error: 'budget_allocation.create.name.required' })
    .trim()
    .min(1, { error: 'budget_allocation.create.name.required' }),
  validateAsync: {
    on: 'blur',
    debounceMs: 300,
    run: async (name, { signal, deps }) => {
      nameChecks.push({ name, campaignGroupId: deps.campaignGroupId, signal })
      await Promise.resolve()
      return takenNames.has(name) ? { code: 'budget_allocation.create.name.taken' } : undefined
    },
  },
})

export const totalBudgetField = defineField({
  schema: z
    .number({ error: 'budget_allocation.create.daily_budget.required' })
    .positive({ error: 'budget_allocation.create.daily_budget.positive' }),
})

export const kpiWindowField = defineField({
  schema: z.enum(KPI_WINDOW, { error: 'budget_allocation.create.attribution_delay.required' }),
})

export const setupStepGroup = defineGroupWithDeps<{ campaignGroupId: number }>()({
  schema: z.object({
    app: z.object(
      {
        appId: z.number().positive(),
        appName: z.string().optional(),
      },
      { error: 'budget_allocation.create.app.required' },
    ),
  }),
  children: { name: allocationNameField },
  childDeps: { name: ({ deps }) => ({ campaignGroupId: deps.campaignGroupId }) },
})

export const attributionGroup = defineGroup({
  schema: z.object({
    reAttrType: z.enum(RE_ATTR_TYPE, { error: 'budget_allocation.create.re_attr_type.required' }),
    claimType: z.enum(CLAIM_TYPE, { error: 'budget_allocation.create.claim_type.required' }),
  }),
})

export const goalGroup = defineGroup({
  schema: z.object({
    goalId: z.number({ error: 'budget_allocation.create.goal.required' }).int().positive(),
    attributedTime: z.enum(ATTRIBUTED_TIME, { error: 'budget_allocation.create.attributed_time.required' }),
  }),
  children: { kpiWindow: kpiWindowField },
  activeWhen: {
    kpiWindow: ({ value }) => value.attributedTime == ATTRIBUTED_TIME.INSTALL_TIME,
  },
})

export const kpiStepGroup = defineGroup({
  schema: z.object({ kpi: z.enum(KPI, { error: 'budget_allocation.create.kpi.required' }) }),
  children: { attribution: attributionGroup, goal: goalGroup },
  activeWhen: {
    attribution: ({ value }) => value.kpi == KPI.CPI || value.kpi == KPI.CPG,
    goal: ({ value }) => value.kpi == KPI.CPG,
  },
})

export const scheduleRowGroup = defineGroup({
  schema: z.object({
    id: z.number().int().positive().optional(),
    name: z.string().optional(),
    totalBudget: z
      .number({ error: 'budget_allocation.schedule_drawer.errors.amount_required' })
      .positive({ error: 'budget_allocation.schedule_drawer.errors.amount_invalid' }),
    dateList: z
      .array(z.string(), { error: 'budget_allocation.schedule_drawer.errors.dates_required' })
      .min(1, { error: 'budget_allocation.schedule_drawer.errors.dates_required' }),
  }),
})

export const budgetStepGroup = defineGroup({
  schema: z.object({
    strategy: z.enum(STRATEGY, { error: 'budget_allocation.create.cap_type.required' }),
  }),
  children: {
    totalBudget: totalBudgetField,
    schedules: arrayOf(scheduleRowGroup, {
      validate: rows => overlappingDates(rows),
    }),
  },
})

export const conditionGroup = defineGroupWithDeps<MetricDeps>()({
  schema: ({ deps }) =>
    z.object({
      metric: z
        .string({ error: 'guardrails.condition.metric.required' })
        .refine(id => deps.metrics.some(metric => metric.id == id), { error: 'guardrails.condition.metric.unknown' }),
      operator: z.enum(CONDITION_OPERATOR, { error: 'guardrails.condition.operator.required' }),
      value: z.number({ error: 'guardrails.condition.value.required' }),
    }),
})

export interface ConditionTreeInput {
  operator: 'AND' | 'OR'
  conditions: Array<InputOf<typeof conditionGroup>>
  groups: Array<ConditionTreeInput>
}

export const conditionTreeGroup: GroupDefinition<ConditionTreeInput, ConditionTreeInput, MetricDeps> =
  defineGroupWithDeps<MetricDeps>()({
    schema: z.object({ operator: z.enum(['AND', 'OR'], { error: 'guardrails.group.operator.required' }) }),
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
        ? { path: 'conditions', code: 'guardrails.group.empty' }
        : undefined,
  })

export const budgetAllocationGroup = defineGroupWithDeps<{ campaignGroupId: number } & MetricDeps>()({
  schema: z.object({
    campaignIdList: z
      .array(z.number().int().positive(), { error: 'budget_allocation.create.campaigns.required' })
      .min(1, { error: 'budget_allocation.create.campaigns.required' }),
  }),
  children: {
    setup: setupStepGroup,
    kpi: kpiStepGroup,
    budget: budgetStepGroup,
    guardrails: conditionTreeGroup,
  },
  childDeps: {
    setup: ({ deps }) => ({ campaignGroupId: deps.campaignGroupId }),
    guardrails: ({ deps }) => ({ metrics: deps.metrics }),
  },
})

interface ScheduleDraft {
  readonly dateList?: ReadonlyArray<string>
}

function overlappingDates(rows: ReadonlyArray<ScheduleDraft>) {
  const seen = new Set<string>()
  return rows.flatMap((row, index) => {
    return (row.dateList ?? []).flatMap(date => {
      if (seen.has(date)) {
        return [
          {
            path: `${index}.dateList`,
            code: 'budget_allocation.schedule_drawer.errors.date_overlap',
            params: { date },
          },
        ]
      }
      seen.add(date)
      return []
    })
  })
}
