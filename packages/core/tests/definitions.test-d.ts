import type { DraftOf, FieldNode, Form, InputOf, OutputOf } from '../src'

import { describe, expectTypeOf, test } from 'vite-plus/test'
import { z } from 'zod'

import { arrayOf, createForm, defineField, defineGroup, defineGroupWithDeps } from '../src'
import {
  budgetAllocationGroup,
  conditionTreeGroup,
  kpiStepGroup,
  scheduleRowGroup,
  totalBudgetField,
} from './fixtures/budget-allocation'

type Kpi = 'CPA' | 'CPI' | 'CPG'
type AttributedTime = 'INSTALL_TIME' | 'EVENT_TIME'
type KpiWindow = 'D1' | 'D7'

declare const form: Form<typeof budgetAllocationGroup>

describe('definition types', () => {
  test('a field drafts its schema input and outputs its schema output', () => {
    expectTypeOf<DraftOf<typeof totalBudgetField>>().toEqualTypeOf<number | undefined>()
    expectTypeOf<InputOf<typeof totalBudgetField>>().toEqualTypeOf<number>()
    expectTypeOf<OutputOf<typeof totalBudgetField>>().toEqualTypeOf<number>()
  })

  test('declared structure is required in the draft, schema values may be empty', () => {
    expectTypeOf<DraftOf<typeof kpiStepGroup>>().toEqualTypeOf<{
      kpi?: Kpi
      attribution: { reAttrType?: 'EXCLUDE' | 'INCLUDE'; claimType?: 'CLICK' | 'VIEW' }
      goal: { goalId?: number; attributedTime?: AttributedTime; kpiWindow?: KpiWindow | undefined }
    }>()
  })

  test('children listed in activeWhen are optional in the output', () => {
    expectTypeOf<OutputOf<typeof kpiStepGroup>>().toEqualTypeOf<{
      kpi: Kpi
      attribution?: { reAttrType: 'EXCLUDE' | 'INCLUDE'; claimType: 'CLICK' | 'VIEW' }
      goal?: { goalId: number; attributedTime: AttributedTime; kpiWindow?: KpiWindow }
    }>()
  })

  test('declared arrays are always present in the draft', () => {
    expectTypeOf<DraftOf<typeof budgetAllocationGroup>['budget']['schedules']>().toEqualTypeOf<
      Array<DraftOf<typeof scheduleRowGroup>>
    >()
  })

  test('activeWhen and validate see typed values', () => {
    defineGroup({
      schema: z.object({ kind: z.enum(['a', 'b']) }),
      children: { extra: defineField({ schema: z.string() }) },
      activeWhen: {
        extra: ({ value }) => {
          expectTypeOf(value).toEqualTypeOf<{ kind?: 'a' | 'b' }>()
          return value.kind == 'b'
        },
      },
      validate: ({ value }) => {
        expectTypeOf(value).toEqualTypeOf<{ kind?: 'a' | 'b'; extra?: string | undefined }>()
        return undefined
      },
    })
  })

  test('a child that needs deps makes childDeps required', () => {
    const childGroup = defineGroupWithDeps<{ limit: number }>()({
      schema: ({ deps }) => z.object({ amount: z.number().max(deps.limit) }),
    })
    // @ts-expect-error childDeps is required
    defineGroup({ children: { child: childGroup } })
    defineGroup({
      schema: z.object({ limit: z.number() }),
      children: { child: childGroup },
      childDeps: { child: ({ value }) => ({ limit: value.limit ?? 0 }) },
    })
  })

  test('a group nested inline without children needs no childDeps', () => {
    const parentGroup = defineGroup({
      children: {
        setup: defineGroup({ schema: z.object({ name: z.string() }) }),
        rows: arrayOf(defineGroup({ schema: z.object({ amount: z.number() }) })),
      },
    })

    expectTypeOf<OutputOf<typeof parentGroup>>().toEqualTypeOf<{
      setup: { name: string }
      rows: Array<{ amount: number }>
    }>()
  })

  test('a key may not be declared in both schema and children', () => {
    // @ts-expect-error amount is in both
    defineGroup({ schema: z.object({ amount: z.number() }), children: { amount: totalBudgetField } })
  })
})

describe('createForm types', () => {
  test('deps are required when the root definition needs them', () => {
    // @ts-expect-error deps missing
    createForm(budgetAllocationGroup)
    createForm(budgetAllocationGroup, { deps: { campaignGroupId: 1, metrics: [] } })
    createForm(totalBudgetField)
  })

  test('initialValue is a partial draft', () => {
    createForm(budgetAllocationGroup, {
      deps: { campaignGroupId: 1, metrics: [] },
      initialValue: { guardrails: { operator: 'AND' } },
    })
  })
})

describe('node navigation types', () => {
  test('paths resolve to typed field nodes', () => {
    expectTypeOf(form.field('setup.name')).toEqualTypeOf<FieldNode<string | undefined, string>>()
    expectTypeOf(form.field('kpi.goal.kpiWindow')).toEqualTypeOf<FieldNode<KpiWindow | undefined, KpiWindow>>()
    expectTypeOf(form.field('campaignIdList')).toEqualTypeOf<FieldNode<Array<number> | undefined, Array<number>>>()
  })

  test('unknown paths and wrong views are rejected', () => {
    // @ts-expect-error unknown key
    form.field('setup.nmae')
    // @ts-expect-error a list is not a group
    form.group('campaignIdList')
    // @ts-expect-error a leaf is not an array
    form.array('budget.strategy')
  })

  test('declared array items are typed by their definition', () => {
    const row = form.array('budget.schedules').items[0]
    expectTypeOf(row.key).toEqualTypeOf<string>()
    expectTypeOf(row.field('totalBudget')).toEqualTypeOf<FieldNode<number | undefined, number>>()
    expectTypeOf(row.handleSubmit).parameter(0).parameter(0).toEqualTypeOf<OutputOf<typeof scheduleRowGroup>>()
  })

  test('recursive definitions keep navigating', () => {
    const nested = form.group('guardrails').array('groups').items[0]
    expectTypeOf(nested.field('operator').state.value).toEqualTypeOf<'AND' | 'OR' | undefined>()
    nested.array('conditions').push({ metric: 'cpa' })
    expectTypeOf<OutputOf<typeof conditionTreeGroup>['groups']>().toEqualTypeOf<
      Array<{
        operator: 'AND' | 'OR'
        conditions: Array<InputOf<typeof import('./fixtures/budget-allocation').conditionGroup>>
        groups: Array<import('./fixtures/budget-allocation').ConditionTreeInput>
      }>
    >()
  })

  test('a field definition can be a root', () => {
    expectTypeOf(createForm(totalBudgetField).state.value).toEqualTypeOf<number | undefined>()
  })
})
