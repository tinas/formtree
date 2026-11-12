export interface Destination {
  readonly code: string
  readonly city: string
  readonly international: boolean
}

const LATENCY_MS = 400

const DESTINATIONS: ReadonlyArray<Destination> = [
  { code: 'denver', city: 'Denver', international: false },
  { code: 'seattle', city: 'Seattle', international: false },
  { code: 'lisbon', city: 'Lisbon', international: true },
  { code: 'tokyo', city: 'Tokyo', international: true },
]

export function fetchDestinations(): Promise<ReadonlyArray<Destination>> {
  return new Promise(resolve => {
    setTimeout(() => resolve(DESTINATIONS), LATENCY_MS)
  })
}
