<script setup lang="ts">
import type { Framework } from '../theme/framework'

import { useRoute } from 'vitepress'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import { DEFAULT_FRAMEWORK, FRAMEWORK, FRAMEWORK_LABEL } from '../theme/framework'
import { appliedFramework, applyFramework } from '../theme/framework-preference'

interface IconPath {
  readonly d: string
  readonly fill?: string
  readonly stroke?: string
  readonly transform?: string
}

interface Icon {
  readonly viewBox: string
  readonly paths: ReadonlyArray<IconPath>
}

const REACT_ORBIT = 'M-11 0a11 4.2 0 1 0 22 0a11 4.2 0 1 0-22 0'

const FRAMEWORK_ICON: Record<Framework, Icon> = {
  vue: {
    viewBox: '0 0 128 128',
    paths: [
      { fill: '#42b883', d: 'M78.8 10 64 35.4 49.2 10H0l64 110 64-110z' },
      { fill: '#35495e', d: 'M78.8 10 64 35.4 49.2 10H25.6L64 76l38.4-66z' },
    ],
  },
  react: {
    viewBox: '-11.5 -10.23 23 20.46',
    paths: [
      { fill: '#58c4dc', d: 'M-2.05 0a2.05 2.05 0 1 0 4.1 0a2.05 2.05 0 1 0-4.1 0' },
      { fill: 'none', stroke: '#58c4dc', d: REACT_ORBIT },
      { fill: 'none', stroke: '#58c4dc', d: REACT_ORBIT, transform: 'rotate(60)' },
      { fill: 'none', stroke: '#58c4dc', d: REACT_ORBIT, transform: 'rotate(120)' },
    ],
  },
  javascript: {
    viewBox: '0 0 24 24',
    paths: [
      {
        fill: '#f7df1e',
        d: 'M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z',
      },
    ],
  },
}

const FRAMEWORKS = Object.values(FRAMEWORK)

const route = useRoute()
const visible = computed(() => route.path.startsWith('/guide/'))

const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const options = useTemplateRef<Array<HTMLButtonElement>>('options')

const selected = ref<Framework>(DEFAULT_FRAMEWORK)
const ready = ref(false)
const open = ref(false)

onMounted(() => {
  selected.value = appliedFramework()
  ready.value = true
  document.addEventListener('pointerdown', closeWhenOutside)
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', closeWhenOutside))

function closeWhenOutside(event: PointerEvent): void {
  if (open.value && !root.value?.contains(event.target as Node)) {
    open.value = false
  }
}

async function openList(): Promise<void> {
  open.value = true
  await nextTick()
  options.value?.[FRAMEWORKS.indexOf(selected.value)]?.focus()
}

function toggleList(): void {
  if (open.value) {
    open.value = false
  } else {
    void openList()
  }
}

function closeList(): void {
  open.value = false
  trigger.value?.focus()
}

function selectFramework(framework: Framework): void {
  selected.value = framework
  applyFramework(framework)
  closeList()
}

function moveFocus(step: number): void {
  const buttons = options.value ?? []
  const current = buttons.findIndex(button => button == document.activeElement)
  buttons[(current + step + buttons.length) % buttons.length]?.focus()
}
</script>

<template>
  <div v-if="visible" ref="root" class="framework-select" :class="{ ready }" @keydown.esc="closeList">
    <button
      ref="trigger"
      type="button"
      class="framework-trigger"
      aria-haspopup="true"
      :aria-expanded="open"
      :aria-label="`Framework: ${FRAMEWORK_LABEL[selected]}`"
      @click="toggleList"
      @keydown.down.prevent="openList"
    >
      <svg class="framework-icon" :viewBox="FRAMEWORK_ICON[selected].viewBox" aria-hidden="true">
        <path v-for="(path, index) in FRAMEWORK_ICON[selected].paths" :key="index" v-bind="path" />
      </svg>
      <span class="framework-name">{{ FRAMEWORK_LABEL[selected] }}</span>
      <svg class="framework-chevron" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div v-show="open" class="framework-menu" @keydown.down.prevent="moveFocus(1)" @keydown.up.prevent="moveFocus(-1)">
      <button
        v-for="framework in FRAMEWORKS"
        :key="framework"
        ref="options"
        type="button"
        class="framework-option"
        :aria-current="framework == selected"
        @click="selectFramework(framework)"
      >
        <svg class="framework-icon" :viewBox="FRAMEWORK_ICON[framework].viewBox" aria-hidden="true">
          <path v-for="(path, index) in FRAMEWORK_ICON[framework].paths" :key="index" v-bind="path" />
        </svg>
        <span class="framework-name">{{ FRAMEWORK_LABEL[framework] }}</span>
        <svg v-if="framework == selected" class="framework-check" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.framework-select {
  position: relative;
  margin: 16px 0 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.framework-select:not(.ready) {
  visibility: hidden;
}

.framework-trigger,
.framework-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  text-align: left;
  cursor: pointer;
}

.framework-trigger {
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  transition: border-color 0.2s;
}

.framework-trigger:hover,
.framework-trigger[aria-expanded='true'] {
  border-color: var(--vp-c-brand-1);
}

.framework-name {
  flex: 1;
}

.framework-icon {
  flex: none;
  width: 18px;
  height: 18px;
}

.framework-chevron,
.framework-check {
  flex: none;
  width: 14px;
  height: 14px;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.framework-chevron {
  stroke: var(--vp-c-text-3);
  transition: transform 0.2s;
}

.framework-trigger[aria-expanded='true'] .framework-chevron {
  transform: rotate(180deg);
}

.framework-check {
  stroke: var(--vp-c-brand-1);
}

.framework-menu {
  position: absolute;
  top: calc(100% - 10px);
  right: 0;
  left: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background-color: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
}

.framework-option {
  padding: 7px 10px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.framework-option:hover,
.framework-option:focus-visible {
  background-color: var(--vp-c-default-soft);
  outline: none;
}

.framework-option[aria-current='true'] {
  color: var(--vp-c-brand-1);
}

.framework-trigger:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .framework-chevron,
  .framework-trigger,
  .framework-option {
    transition: none;
  }
}
</style>
