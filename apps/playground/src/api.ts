const LATENCY_MS = 400

const VALID_PROMO_CODES = ['WELCOME10', 'FREESHIP']

export const PRODUCTS = [
  { sku: 'MUG-01', name: 'Mug' },
  { sku: 'TEE-02', name: 'T-shirt' },
  { sku: 'CAP-03', name: 'Cap' },
]

export const COUNTRIES = [
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'TR', name: 'Türkiye' },
  { code: 'US', name: 'United States' },
]

export const SHIPPING_COUNTRIES = ['DE', 'NL', 'TR', 'US']

export const STORES = [
  { storeId: 'berlin', name: 'Berlin, Torstraße' },
  { storeId: 'amsterdam', name: 'Amsterdam, Damrak' },
]

export interface PromoCodeCheck {
  readonly code: string
  readonly cartId: string
}

export interface LineItemRequest {
  readonly id?: number
  readonly sku: string
  readonly quantity: number
}

export interface SavedLineItem {
  readonly id: number
  readonly sku: string
  readonly quantity: number
}

let lastLineItemId = 100

export async function checkPromoCode(check: PromoCodeCheck, signal: AbortSignal): Promise<boolean> {
  await delay(signal)
  return VALID_PROMO_CODES.includes(check.code)
}

export async function saveLineItem(item: LineItemRequest): Promise<SavedLineItem> {
  await delay()
  lastLineItemId += 1
  return {
    id: item.id ?? lastLineItemId,
    sku: item.sku,
    quantity: item.quantity,
  }
}

function delay(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, LATENCY_MS)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}
