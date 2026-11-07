<script setup lang="ts">
import { useData, withBase } from 'vitepress'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import { markdownFileOf } from '../theme/framework'
import { appliedFramework } from '../theme/framework-preference'

const COPY_STATE = {
  idle: 'idle',
  copied: 'copied',
  failed: 'failed',
} as const

type CopyState = (typeof COPY_STATE)[keyof typeof COPY_STATE]

const COPY_LABEL: Record<CopyState, string> = {
  idle: 'Copy page',
  copied: 'Copied',
  failed: 'Copy failed',
}

const RESET_DELAY_MS = 2000

const { page } = useData()

const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const items = useTemplateRef<Array<HTMLAnchorElement>>('items')

const copyState = ref<CopyState>(COPY_STATE.idle)
const open = ref(false)
const markdownUrl = ref('')

const assistantPrompt = computed(() => `Read ${markdownUrl.value} so I can ask questions about it.`)
const chatGptUrl = computed(() => `https://chatgpt.com/?hints=search&q=${encodeURIComponent(assistantPrompt.value)}`)
const claudeUrl = computed(() => `https://claude.ai/new?q=${encodeURIComponent(assistantPrompt.value)}`)

let resetTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => document.addEventListener('pointerdown', closeWhenOutside))

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeWhenOutside)
  clearTimeout(resetTimer)
})

function currentMarkdownUrl(): string {
  return new URL(withBase(`/${markdownFileOf(page.value.relativePath, appliedFramework())}`), location.origin).href
}

async function copyPage(): Promise<void> {
  const markdown = fetch(currentMarkdownUrl()).then(response => {
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }
    return response.text()
  })
  try {
    if (typeof ClipboardItem == 'undefined') {
      await navigator.clipboard.writeText(await markdown)
    } else {
      const blob = markdown.then(text => new Blob([text], { type: 'text/plain' }))
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })])
    }
    showCopyState(COPY_STATE.copied)
  } catch {
    showCopyState(COPY_STATE.failed)
  }
}

function showCopyState(state: CopyState): void {
  copyState.value = state
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    copyState.value = COPY_STATE.idle
  }, RESET_DELAY_MS)
}

async function openMenu(): Promise<void> {
  markdownUrl.value = currentMarkdownUrl()
  open.value = true
  await nextTick()
  items.value?.[0]?.focus()
}

function toggleMenu(): void {
  if (open.value) {
    open.value = false
  } else {
    void openMenu()
  }
}

function closeMenu(): void {
  open.value = false
  trigger.value?.focus()
}

function closeWhenOutside(event: PointerEvent): void {
  if (open.value && !root.value?.contains(event.target as Node)) {
    open.value = false
  }
}

function moveFocus(step: number): void {
  const links = items.value ?? []
  const current = links.findIndex(link => link == document.activeElement)
  links[(current + step + links.length) % links.length]?.focus()
}
</script>

<template>
  <div ref="root" class="copy-page" @keydown.esc="closeMenu">
    <div class="copy-page-buttons">
      <button type="button" class="copy-page-copy" @click="copyPage">
        <svg v-if="copyState == COPY_STATE.copied" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 12 5 5L20 7" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
        <span aria-live="polite">{{ COPY_LABEL[copyState] }}</span>
      </button>
      <button
        ref="trigger"
        type="button"
        class="copy-page-trigger"
        aria-haspopup="true"
        :aria-expanded="open"
        aria-label="More ways to use this page"
        @click="toggleMenu"
        @keydown.down.prevent="openMenu"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>

    <div v-show="open" class="copy-page-menu" @keydown.down.prevent="moveFocus(1)" @keydown.up.prevent="moveFocus(-1)">
      <a ref="items" class="copy-page-item" :href="markdownUrl" target="_blank" rel="noopener" @click="open = false">
        <span class="copy-page-item-title">View as Markdown</span>
        <span class="copy-page-item-detail">This page as plain text</span>
      </a>
      <a ref="items" class="copy-page-item" :href="chatGptUrl" target="_blank" rel="noopener" @click="open = false">
        <span class="copy-page-item-title">Open in ChatGPT</span>
        <span class="copy-page-item-detail">Ask questions about this page</span>
      </a>
      <a ref="items" class="copy-page-item" :href="claudeUrl" target="_blank" rel="noopener" @click="open = false">
        <span class="copy-page-item-title">Open in Claude</span>
        <span class="copy-page-item-detail">Ask questions about this page</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.copy-page {
  position: relative;
  float: right;
  z-index: 2;
  margin: 4px 0 12px 16px;
}

.copy-page-buttons {
  display: flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  overflow: hidden;
}

.copy-page-copy,
.copy-page-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: background-color 0.2s;
}

.copy-page-copy {
  padding: 5px 10px;
}

.copy-page-trigger {
  padding: 5px 7px;
  border-left: 1px solid var(--vp-c-divider);
}

.copy-page-copy:hover,
.copy-page-trigger:hover,
.copy-page-trigger[aria-expanded='true'] {
  background-color: var(--vp-c-default-soft);
}

.copy-page-copy:focus-visible,
.copy-page-trigger:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: -2px;
}

svg {
  flex: none;
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.copy-page-trigger svg {
  color: var(--vp-c-text-3);
}

.copy-page-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 240px;
  padding: 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background-color: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
}

.copy-page-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 7px 10px;
  border-radius: 6px;
  text-decoration: none;
  transition: background-color 0.2s;
}

.copy-page-item:hover,
.copy-page-item:focus-visible {
  background-color: var(--vp-c-default-soft);
  outline: none;
}

.copy-page-item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.copy-page-item-detail {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

@media (prefers-reduced-motion: reduce) {
  .copy-page-copy,
  .copy-page-trigger,
  .copy-page-item {
    transition: none;
  }
}
</style>
