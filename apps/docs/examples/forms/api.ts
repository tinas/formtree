const LATENCY_MS = 400

const VALID_PROMO_CODES = ['WELCOME10', 'FREESHIP']

export const SHIPPING_COUNTRIES = ['DE', 'NL', 'TR', 'US']

export const ATTRIBUTES = [
  { id: 'country', label: 'Country' },
  { id: 'plan', label: 'Plan' },
  { id: 'device', label: 'Device' },
]

export interface PromoCodeCheck {
  readonly code: string
  readonly cartId: string
}

export interface AddressCheck {
  readonly street: string
  readonly postalCode: string
  readonly country: string
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

export interface ContactMessage {
  readonly name: string
  readonly email: string
  readonly message: string
}

let lastLineItemId = 100

export async function checkPromoCode(
  check: PromoCodeCheck,
  signal?: AbortSignal,
): Promise<boolean> {
  await delay(signal)
  return VALID_PROMO_CODES.includes(check.code)
}

export async function verifyAddress(
  address: AddressCheck,
  signal?: AbortSignal,
): Promise<boolean> {
  await delay(signal)
  return /\d/.test(address.street)
}

export async function saveLineItem(
  item: LineItemRequest,
): Promise<SavedLineItem> {
  await delay()
  lastLineItemId += 1
  return {
    id: item.id ?? lastLineItemId,
    sku: item.sku,
    quantity: item.quantity,
  }
}

export async function updatePrice(price: number): Promise<number> {
  await delay()
  return price
}

export async function sendMessage(
  contact: ContactMessage,
): Promise<ContactMessage> {
  await delay()
  return contact
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
