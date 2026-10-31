import type { CreateFormOptions } from '../../src'

import { createForm } from '../../src'
import { promotionGroup } from './promotion'

export const PROMOTION_DEPS = {
  storeId: 42,
  attributes: [{ id: 'orders' }],
}

export function createPromotionForm(options: CreateFormOptions<typeof promotionGroup> = {}) {
  return createForm(promotionGroup, {
    id: 'promotion',
    deps: PROMOTION_DEPS,
    initialValue: { eligibility: { operator: 'AND' } },
    ...options,
  })
}
