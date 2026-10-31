<script setup lang="ts">
const NODE_STATUS = {
  revalidated: 'revalidated',
  changed: 'changed',
  cached: 'cached',
  inactive: 'inactive',
} as const

type NodeStatus = (typeof NODE_STATUS)[keyof typeof NODE_STATUS]

interface TreeRow {
  readonly name: string
  readonly depth: number
  readonly status: NodeStatus
  readonly note?: string
}

interface Rail {
  readonly x: number
  readonly from: number
  readonly to: number
}

interface RowRange {
  readonly first: number
  readonly last: number
}

const STATUS_LABELS: Record<NodeStatus, string> = {
  revalidated: 'runs again',
  changed: 'changed',
  cached: 'cached',
  inactive: 'inactive',
}

const ROWS: ReadonlyArray<TreeRow> = [
  { name: 'checkout', depth: 0, status: NODE_STATUS.revalidated, note: 'the root' },
  { name: 'contact', depth: 1, status: NODE_STATUS.cached },
  { name: 'email', depth: 2, status: NODE_STATUS.cached },
  { name: 'delivery', depth: 1, status: NODE_STATUS.revalidated },
  { name: 'address', depth: 2, status: NODE_STATUS.revalidated },
  { name: 'city', depth: 3, status: NODE_STATUS.changed, note: "a key of address's schema" },
  { name: 'state', depth: 3, status: NODE_STATUS.inactive, note: 'country is not US' },
  { name: 'store', depth: 2, status: NODE_STATUS.inactive, note: 'method is shipping' },
  { name: 'payment', depth: 1, status: NODE_STATUS.cached },
  { name: 'card', depth: 2, status: NODE_STATUS.cached },
  { name: 'invoice', depth: 2, status: NODE_STATUS.inactive, note: 'method is card' },
  { name: 'lineItems', depth: 1, status: NODE_STATUS.cached },
  { name: 'promoCode', depth: 1, status: NODE_STATUS.cached },
]

const SUBMITTED_ROOT = 'delivery'
const TOP = 12
const ROW_PITCH = 30
const INDENT = 28
const NOTE_X = 200
const CHIP_X = 420
const CHIP_WIDTH = 96
const BOX_RIGHT = 528

const RAILS = ROWS.flatMap((_row, index) => railOf(index))
const SUBMITTED_RANGE = subtreeRange(SUBMITTED_ROOT)

function rowCenter(index: number): number {
  return TOP + index * ROW_PITCH + 12
}

function dotX(depth: number): number {
  return 24 + depth * INDENT
}

function lastDescendant(index: number): number {
  const depth = ROWS[index].depth
  let last = index
  while (last + 1 < ROWS.length && ROWS[last + 1].depth > depth) {
    last += 1
  }
  return last
}

function lastChild(index: number): number | undefined {
  const depth = ROWS[index].depth
  let last: number | undefined
  for (let childIndex = index + 1; childIndex <= lastDescendant(index); childIndex += 1) {
    if (ROWS[childIndex].depth == depth + 1) {
      last = childIndex
    }
  }
  return last
}

function railOf(index: number): Array<Rail> {
  const last = lastChild(index)
  if (last == undefined) {
    return []
  }
  return [{ x: dotX(ROWS[index].depth), from: rowCenter(index) + 5, to: rowCenter(last) }]
}

function subtreeRange(name: string): RowRange {
  const first = ROWS.findIndex(row => row.name == name)
  return { first, last: lastDescendant(first) }
}
</script>

<template>
  <figure class="diagram">
    <svg viewBox="0 0 688 400" role="img" aria-labelledby="lifecycle-tree-title lifecycle-tree-description">
      <title id="lifecycle-tree-title">What a change of city validates and what a submit of delivery covers</title>
      <desc id="lifecycle-tree-description">
        The checkout tree. After city changes, the schemas and rules of checkout, delivery and address run again,
        contact, payment, the line items and the promo code keep their cached results, and state, store and invoice are
        inactive. A dashed box marks the delivery subtree, which a submit of delivery covers.
      </desc>

      <rect
        :x="dotX(1) - 14"
        :y="rowCenter(SUBMITTED_RANGE.first) - 15"
        :width="BOX_RIGHT - dotX(1) + 14"
        :height="rowCenter(SUBMITTED_RANGE.last) - rowCenter(SUBMITTED_RANGE.first) + 30"
        rx="8"
        class="submit-box"
      />
      <text :x="BOX_RIGHT + 12" :y="rowCenter(SUBMITTED_RANGE.first) + 4" class="submit-label">delivery's submit</text>
      <text :x="BOX_RIGHT + 12" :y="rowCenter(SUBMITTED_RANGE.first) + 20" class="submit-detail">
        counts errors here
      </text>

      <line
        v-for="rail in RAILS"
        :key="`${rail.x}-${rail.from}`"
        :x1="rail.x"
        :y1="rail.from"
        :x2="rail.x"
        :y2="rail.to"
        class="connector"
      />

      <g v-for="(row, index) in ROWS" :key="row.name">
        <line
          v-if="row.depth > 0"
          :x1="dotX(row.depth - 1)"
          :y1="rowCenter(index)"
          :x2="dotX(row.depth) - 6"
          :y2="rowCenter(index)"
          class="connector"
        />
        <circle :cx="dotX(row.depth)" :cy="rowCenter(index)" r="4.5" :class="['dot', row.status]" />
        <text :x="dotX(row.depth) + 12" :y="rowCenter(index) + 4.5" :class="['name', row.status]">{{ row.name }}</text>
        <text v-if="row.note" :x="NOTE_X" :y="rowCenter(index) + 4.5" class="note">{{ row.note }}</text>
        <rect
          :x="CHIP_X"
          :y="rowCenter(index) - 11"
          :width="CHIP_WIDTH"
          height="22"
          rx="11"
          :class="['chip', row.status]"
        />
        <text
          :x="CHIP_X + CHIP_WIDTH / 2"
          :y="rowCenter(index) + 4"
          text-anchor="middle"
          :class="['chip-text', row.status]"
        >
          {{ STATUS_LABELS[row.status] }}
        </text>
      </g>
    </svg>
  </figure>
</template>

<style scoped>
.diagram {
  margin: 24px 0;
  overflow-x: auto;
}

svg {
  display: block;
  width: 100%;
  min-width: 560px;
  height: auto;
}

.connector {
  stroke: var(--vp-c-divider);
  stroke-width: 1.5;
}

.submit-box {
  fill: none;
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.25;
  stroke-dasharray: 6 4;
}

.submit-label {
  font: 600 12px var(--vp-font-family-mono);
  fill: var(--vp-c-brand-1);
}

.submit-detail {
  font: 12px var(--vp-font-family-base);
  fill: var(--vp-c-text-2);
}

.dot.revalidated,
.dot.changed {
  fill: var(--vp-c-brand-1);
}

.dot.cached {
  fill: var(--vp-c-text-3);
}

.dot.inactive {
  fill: var(--vp-c-bg);
  stroke: var(--vp-c-text-3);
  stroke-width: 1.25;
}

.name {
  font: 13px var(--vp-font-family-mono);
  fill: var(--vp-c-text-1);
}

.name.inactive {
  fill: var(--vp-c-text-3);
}

.note {
  font: 12px var(--vp-font-family-base);
  fill: var(--vp-c-text-2);
}

.chip.revalidated {
  fill: var(--vp-c-brand-soft);
}

.chip.changed {
  fill: var(--vp-c-brand-1);
}

.chip.cached {
  fill: var(--vp-c-default-soft);
}

.chip.inactive {
  fill: none;
  stroke: var(--vp-c-text-3);
  stroke-dasharray: 3 3;
}

.chip-text {
  font: 500 11.5px var(--vp-font-family-base);
}

.chip-text.revalidated {
  fill: var(--vp-c-brand-1);
}

.chip-text.changed {
  fill: var(--vp-c-white);
}

.chip-text.cached,
.chip-text.inactive {
  fill: var(--vp-c-text-2);
}
</style>
