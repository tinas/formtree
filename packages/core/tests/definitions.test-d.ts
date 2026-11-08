import type { DraftOf, FieldNode, Form, InputOf, OutputOf } from '../src'

import { describe, expectTypeOf, test } from 'vite-plus/test'
import { z } from 'zod'

import { arrayOf, createForm, defineField, defineGroup, defineGroupWithDeps } from '../src'
import {
  promotionGroup,
  conditionTreeGroup,
  rewardStepGroup,
  slotRowGroup,
  maxDiscountField,
} from './fixtures/promotion'

type Reward = 'FIXED' | 'PERCENT' | 'GIFT'
type GiftDelivery = 'SEPARATE' | 'WITH_ORDER'
type Wrapping = 'PAPER' | 'BOX'

declare const form: Form<typeof promotionGroup>

interface SavedOrder {
  readonly method: 'pickup'
  readonly lineItems: ReadonlyArray<{ readonly product: string; readonly quantity: number }>
}

declare const savedOrder: SavedOrder

const addressGroup = defineGroup({ schema: z.object({ street: z.string(), city: z.string() }) })
const lineItemGroup = defineGroup({ schema: z.object({ product: z.string(), quantity: z.number() }) })
const orderForm = defineGroup({
  schema: z.object({ method: z.enum(['pickup', 'shipping']), note: z.string().optional() }),
  children: { address: addressGroup, lineItems: arrayOf(lineItemGroup) },
  activeWhen: { address: ({ value }) => value.method == 'shipping' },
})

describe('definition types', () => {
  test('a field drafts its schema input and outputs its schema output', () => {
    expectTypeOf<DraftOf<typeof maxDiscountField>>().toEqualTypeOf<number | undefined>()
    expectTypeOf<InputOf<typeof maxDiscountField>>().toEqualTypeOf<number>()
    expectTypeOf<OutputOf<typeof maxDiscountField>>().toEqualTypeOf<number>()
  })

  test('declared structure is required in the draft, schema values may be empty', () => {
    expectTypeOf<DraftOf<typeof rewardStepGroup>>().toEqualTypeOf<{
      type?: Reward
      limits: { usage?: 'ONCE' | 'REPEAT'; scope?: 'CART' | 'ITEM' }
      gift: { giftId?: number; delivery?: GiftDelivery; wrapping?: Wrapping | undefined }
    }>()
  })

  test('children listed in activeWhen are optional in the output', () => {
    expectTypeOf<OutputOf<typeof rewardStepGroup>>().toEqualTypeOf<{
      type: Reward
      limits?: { usage: 'ONCE' | 'REPEAT'; scope: 'CART' | 'ITEM' }
      gift?: { giftId: number; delivery: GiftDelivery; wrapping?: Wrapping }
    }>()
  })

  test('declared arrays are always present in the draft', () => {
    expectTypeOf<DraftOf<typeof promotionGroup>['spending']['slots']>().toEqualTypeOf<
      Array<DraftOf<typeof slotRowGroup>>
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
    defineGroup({ schema: z.object({ amount: z.number() }), children: { amount: maxDiscountField } })
  })
})

describe('createForm types', () => {
  test('deps are required when the root definition needs them', () => {
    // @ts-expect-error deps missing
    createForm(promotionGroup)
    createForm(promotionGroup, { deps: { storeId: 1, attributes: [] } })
    createForm(maxDiscountField)
  })

  test('initialValue is a partial draft', () => {
    createForm(promotionGroup, {
      deps: { storeId: 1, attributes: [] },
      initialValue: { eligibility: { operator: 'AND' } },
    })
  })
})

describe('node navigation types', () => {
  test('paths resolve to typed field nodes', () => {
    expectTypeOf(form.field('setup.name')).toEqualTypeOf<FieldNode<string | undefined, string>>()
    expectTypeOf(form.field('reward.gift.wrapping')).toEqualTypeOf<FieldNode<Wrapping | undefined, Wrapping>>()
    expectTypeOf(form.field('categoryIds')).toEqualTypeOf<FieldNode<Array<number> | undefined, Array<number>>>()
  })

  test('unknown paths and wrong views are rejected', () => {
    // @ts-expect-error unknown key
    form.field('setup.nmae')
    // @ts-expect-error a list is not a group
    form.group('categoryIds')
    // @ts-expect-error a leaf is not an array
    form.array('spending.period')
  })

  test('declared array items are typed by their definition', () => {
    const row = form.array('spending.slots').items[0]
    expectTypeOf(row.key).toEqualTypeOf<string>()
    expectTypeOf(row.field('amount')).toEqualTypeOf<FieldNode<number | undefined, number>>()
    expectTypeOf(row.handleSubmit).parameter(0).parameter(0).toEqualTypeOf<OutputOf<typeof slotRowGroup>>()
  })

  test('recursive definitions keep navigating', () => {
    const nested = form.group('eligibility').array('groups').items[0]
    expectTypeOf(nested.field('operator').state.value).toEqualTypeOf<'AND' | 'OR' | undefined>()
    nested.array('conditions').push({ attribute: 'orders' })
    expectTypeOf<OutputOf<typeof conditionTreeGroup>['groups']>().toEqualTypeOf<
      Array<{
        operator: 'AND' | 'OR'
        conditions: Array<InputOf<typeof import('./fixtures/promotion').conditionGroup>>
        groups: Array<import('./fixtures/promotion').ConditionTreeInput>
      }>
    >()
  })

  test('a field definition can be a root', () => {
    expectTypeOf(createForm(maxDiscountField).state.value).toEqualTypeOf<number | undefined>()
  })
})

describe('reset types', () => {
  test('a reset takes a partial draft with readonly lists, like initialValue', () => {
    const order = createForm(orderForm, { initialValue: savedOrder })
    order.reset({ value: savedOrder })
    order.group('address').reset({ value: { street: 'Main Street' } })
  })

  test("a reset takes the output of the node's own submit", () => {
    const order = createForm(orderForm)
    order.handleSubmit(async submittedOrder => {
      order.reset({ value: submittedOrder })
    })
  })

  test('a reset value keeps the types of the draft', () => {
    const order = createForm(orderForm)
    // @ts-expect-error not a delivery method
    order.reset({ value: { method: 'courier' } })
  })
})
