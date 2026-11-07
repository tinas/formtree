<script setup lang="ts">
const NODE_STATUS = {
  covered: 'covered',
  outside: 'outside',
  inactive: 'inactive',
} as const

type NodeStatus = (typeof NODE_STATUS)[keyof typeof NODE_STATUS]

interface TreeRow {
  readonly name: string
  readonly depth: number
  readonly status: NodeStatus
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

const ROWS: ReadonlyArray<TreeRow> = [
  { name: 'checkout', depth: 0, status: NODE_STATUS.outside },
  { name: 'contact', depth: 1, status: NODE_STATUS.outside },
  { name: 'email', depth: 2, status: NODE_STATUS.outside },
  { name: 'delivery', depth: 1, status: NODE_STATUS.covered },
  { name: 'address', depth: 2, status: NODE_STATUS.covered },
  { name: 'state', depth: 3, status: NODE_STATUS.inactive },
  { name: 'store', depth: 2, status: NODE_STATUS.inactive },
  { name: 'payment', depth: 1, status: NODE_STATUS.outside },
  { name: 'card', depth: 2, status: NODE_STATUS.outside },
  { name: 'invoice', depth: 2, status: NODE_STATUS.outside },
  { name: 'lineItems', depth: 1, status: NODE_STATUS.outside },
  { name: 'promoCode', depth: 1, status: NODE_STATUS.outside },
]

const SUBMITTED_ROOT = 'delivery'
const TOP = 12
const ROW_PITCH = 30
const INDENT = 28
const NOTE_X = 196
const BOX_RIGHT = 292

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
    <svg viewBox="0 0 480 384" role="img" aria-labelledby="submit-tree-title submit-tree-description">
      <title id="submit-tree-title">What a submit of the delivery step covers</title>
      <desc id="submit-tree-description">
        The checkout tree. A dashed box marks delivery and everything below it, which a submit of delivery validates.
        The root, contact, payment, the line items and the promo code are outside the box and do not count. Inside it,
        the store and the state are inactive while the customer has chosen shipping to a country other than the US, so
        they do not count either.
      </desc>

      <rect
        :x="dotX(1) - 14"
        :y="rowCenter(SUBMITTED_RANGE.first) - 15"
        :width="BOX_RIGHT - dotX(1) + 14"
        :height="rowCenter(SUBMITTED_RANGE.last) - rowCenter(SUBMITTED_RANGE.first) + 30"
        rx="8"
        class="submit-box"
      />
      <text :x="BOX_RIGHT + 14" :y="rowCenter(SUBMITTED_RANGE.first) + 4" class="submit-label">delivery's submit</text>
      <text :x="BOX_RIGHT + 14" :y="rowCenter(SUBMITTED_RANGE.first) + 20" class="submit-detail">
        checks this part only
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
        <text v-if="row.status == NODE_STATUS.inactive" :x="NOTE_X" :y="rowCenter(index) + 4.5" class="note">
          inactive
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
  max-width: 560px;
  min-width: 400px;
  height: auto;
}

.connector {
  stroke: var(--vp-c-divider);
  stroke-width: 1.5;
}

.submit-box {
  fill: var(--vp-c-brand-soft);
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

.dot.covered {
  fill: var(--vp-c-brand-1);
}

.dot.outside {
  fill: var(--vp-c-text-3);
}

.dot.inactive {
  fill: var(--vp-c-bg);
  stroke: var(--vp-c-text-3);
  stroke-width: 1.25;
}

.name {
  font: 13px var(--vp-font-family-mono);
}

.name.covered {
  fill: var(--vp-c-text-1);
}

.name.outside {
  fill: var(--vp-c-text-2);
}

.name.inactive {
  fill: var(--vp-c-text-3);
}

.note {
  font: italic 12px var(--vp-font-family-base);
  fill: var(--vp-c-text-3);
}
</style>
