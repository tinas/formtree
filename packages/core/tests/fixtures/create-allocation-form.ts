import type { CreateFormOptions } from '../../src'

import { createForm } from '../../src'
import { budgetAllocationGroup } from './budget-allocation'

export const ALLOCATION_DEPS = {
  campaignGroupId: 42,
  metrics: [{ id: 'cpa' }],
}

export function createAllocationForm(options: CreateFormOptions<typeof budgetAllocationGroup> = {}) {
  return createForm(budgetAllocationGroup, {
    id: 'allocation',
    deps: ALLOCATION_DEPS,
    initialValue: { guardrails: { operator: 'AND' } },
    ...options,
  })
}
