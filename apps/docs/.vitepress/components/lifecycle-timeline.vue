<script setup lang="ts">
interface Step {
  readonly title: string
  readonly detail: string
  readonly outcome?: string
}

interface Lane {
  readonly label: string
  readonly event: string
  readonly x: number
  readonly width: number
  readonly boxWidth: number
  readonly steps: ReadonlyArray<Step>
  readonly result?: string
}

const STEP_HEIGHT = 44
const STEP_PITCH = 60
const FIRST_STEP_Y = 68
const OUTCOME_GAP = 20
const RESULT_WIDTH = 80

const LANES: ReadonlyArray<Lane> = [
  {
    label: 'CHANGE',
    event: "city.setValue('Berlin')",
    x: 0,
    width: 210,
    boxWidth: 210,
    steps: [
      { title: 'Write the draft', detail: "drops clearOn 'change' errors" },
      { title: 'Walk the tree', detail: 'activeWhen and childDeps' },
      { title: 'Run schemas and rules', detail: 'changed nodes, parent first' },
      { title: 'Reconcile async checks', detail: 'cache, debounce or wait' },
      { title: 'Notify subscribers', detail: 'once per change or batch' },
    ],
  },
  {
    label: 'BLUR',
    event: 'city.blur()',
    x: 226,
    width: 170,
    boxWidth: 170,
    steps: [
      { title: 'Mark as touched', detail: 'errors may show now' },
      { title: 'Start blur checks', detail: "field's and ancestors'" },
    ],
  },
  {
    label: 'SUBMIT',
    event: 'delivery.handleSubmit(save)()',
    x: 412,
    width: 276,
    boxWidth: 190,
    steps: [
      { title: 'Skip?', detail: 'submitting or inactive', outcome: 'skipped' },
      { title: 'Begin', detail: 'submitting, submitCount + 1' },
      { title: 'Settle the subtree', detail: 'run and await its checks' },
      { title: 'Errors in the subtree?', detail: 'reveal, focus, onInvalid', outcome: 'invalid' },
      { title: 'Call the handler', detail: "with the node's output" },
      { title: 'Errors returned?', detail: 'stored as server errors', outcome: 'rejected' },
    ],
    result: 'success',
  },
]

function stepY(index: number): number {
  return FIRST_STEP_Y + index * STEP_PITCH
}

function centerX(lane: Lane): number {
  return lane.x + lane.boxWidth / 2
}

function hasArrowBelow(lane: Lane, index: number): boolean {
  return index < lane.steps.length - 1 || lane.result != undefined
}

function outcomeX(lane: Lane): number {
  return lane.x + lane.boxWidth + OUTCOME_GAP
}
</script>

<template>
  <figure class="diagram">
    <svg viewBox="0 0 688 464" role="img" aria-labelledby="lifecycle-timeline-title lifecycle-timeline-description">
      <title id="lifecycle-timeline-title">The lifecycle of a field</title>
      <desc id="lifecycle-timeline-description">
        A change, a blur and a submit of the delivery step, each with the steps it runs in order. A submit ends as
        skipped, invalid, rejected or success.
      </desc>
      <defs>
        <marker
          id="lifecycle-timeline-arrow"
          viewBox="0 0 8 8"
          refX="8"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0 0 L8 4 L0 8 z" class="arrowhead" />
        </marker>
      </defs>

      <line x1="0" y1="30" x2="682" y2="30" class="axis" marker-end="url(#lifecycle-timeline-arrow)" />

      <g v-for="lane in LANES" :key="lane.label">
        <text :x="lane.x" y="14" class="lane-label">{{ lane.label }}</text>
        <circle :cx="lane.x + 6" cy="30" r="4" class="event-marker" />
        <text :x="lane.x" y="52" class="event">{{ lane.event }}</text>

        <g v-for="(step, index) in lane.steps" :key="step.title">
          <rect
            :x="lane.x"
            :y="stepY(index)"
            :width="lane.boxWidth"
            :height="STEP_HEIGHT"
            rx="6"
            :class="step.outcome ? 'decision' : 'step'"
          />
          <text :x="lane.x + 12" :y="stepY(index) + 19" class="title">{{ step.title }}</text>
          <text :x="lane.x + 12" :y="stepY(index) + 35" class="detail">{{ step.detail }}</text>

          <line
            v-if="hasArrowBelow(lane, index)"
            :x1="centerX(lane)"
            :y1="stepY(index) + STEP_HEIGHT"
            :x2="centerX(lane)"
            :y2="stepY(index + 1) - 1"
            class="flow"
            marker-end="url(#lifecycle-timeline-arrow)"
          />

          <g v-if="step.outcome">
            <text :x="centerX(lane) + 6" :y="stepY(index) + STEP_HEIGHT + 12" class="branch-label">no</text>
            <line
              :x1="lane.x + lane.boxWidth"
              :y1="stepY(index) + STEP_HEIGHT / 2"
              :x2="outcomeX(lane) - 1"
              :y2="stepY(index) + STEP_HEIGHT / 2"
              class="flow"
              marker-end="url(#lifecycle-timeline-arrow)"
            />
            <text
              :x="lane.x + lane.boxWidth + OUTCOME_GAP / 2"
              :y="stepY(index) + STEP_HEIGHT / 2 - 5"
              class="branch-label"
              text-anchor="middle"
            >
              yes
            </text>
            <rect
              :x="outcomeX(lane)"
              :y="stepY(index) + 9"
              :width="lane.width - lane.boxWidth - OUTCOME_GAP"
              height="26"
              rx="13"
              :class="['outcome', step.outcome]"
            />
            <text
              :x="outcomeX(lane) + (lane.width - lane.boxWidth - OUTCOME_GAP) / 2"
              :y="stepY(index) + 26"
              text-anchor="middle"
              :class="['outcome-text', step.outcome]"
            >
              {{ step.outcome }}
            </text>
          </g>
        </g>

        <g v-if="lane.result">
          <rect
            :x="centerX(lane) - RESULT_WIDTH / 2"
            :y="stepY(lane.steps.length)"
            :width="RESULT_WIDTH"
            height="26"
            rx="13"
            :class="['outcome', lane.result]"
          />
          <text
            :x="centerX(lane)"
            :y="stepY(lane.steps.length) + 17"
            text-anchor="middle"
            :class="['outcome-text', lane.result]"
          >
            {{ lane.result }}
          </text>
        </g>
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

.axis {
  stroke: var(--vp-c-divider);
  stroke-width: 1.5;
}

.arrowhead {
  fill: var(--vp-c-text-3);
}

.event-marker {
  fill: var(--vp-c-brand-1);
}

.lane-label {
  font: 600 11px var(--vp-font-family-base);
  letter-spacing: 0.08em;
  fill: var(--vp-c-text-2);
}

.event {
  font: 500 12.5px var(--vp-font-family-mono);
  fill: var(--vp-c-brand-1);
}

.step {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-divider);
}

.decision {
  fill: var(--vp-c-bg);
  stroke: var(--vp-c-text-3);
  stroke-dasharray: 4 3;
}

.title {
  font: 600 13px var(--vp-font-family-base);
  fill: var(--vp-c-text-1);
}

.detail {
  font: 12px var(--vp-font-family-base);
  fill: var(--vp-c-text-2);
}

.flow {
  stroke: var(--vp-c-text-3);
  stroke-width: 1.25;
}

.branch-label {
  font: 10px var(--vp-font-family-base);
  fill: var(--vp-c-text-2);
}

.outcome {
  stroke-width: 1.25;
}

.outcome-text {
  font: 500 12px var(--vp-font-family-mono);
}

.outcome.skipped {
  fill: var(--vp-c-default-soft);
  stroke: var(--vp-c-text-3);
}

.outcome-text.skipped {
  fill: var(--vp-c-text-2);
}

.outcome.invalid,
.outcome.rejected {
  fill: var(--vp-c-danger-soft);
  stroke: var(--vp-c-danger-1);
}

.outcome-text.invalid,
.outcome-text.rejected {
  fill: var(--vp-c-danger-1);
}

.outcome.success {
  fill: var(--vp-c-brand-soft);
  stroke: var(--vp-c-brand-1);
}

.outcome-text.success {
  fill: var(--vp-c-brand-1);
}
</style>
