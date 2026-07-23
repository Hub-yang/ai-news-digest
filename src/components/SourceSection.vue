<script setup lang="ts">
import type { FeedItem, SourceResult } from '../data/types'
import { inject } from 'vue'
import { languageKey } from '../composables/use-language'

defineProps<{ section: SourceResult }>()

const language = inject(languageKey)
if (!language) {
  throw new Error('language state not found — App.vue must call provide(languageKey, ...) before mounting SourceSection')
}
const { lang } = language

function displayTitle(item: FeedItem) {
  return lang.value === 'zh' ? item.titleZh : item.title
}
function displayDescription(item: FeedItem) {
  return lang.value === 'zh' ? item.descriptionZh : item.description
}
</script>

<template>
  <section class="source-section">
    <h2 class="source-name">
      {{ section.name }}
    </h2>
    <ul class="item-list">
      <li v-for="item in section.items" :key="item.link" class="item">
        <div class="item-line">
          <a class="item-title" :href="item.link" target="_blank" rel="noopener noreferrer">{{ displayTitle(item) }}</a>
          <span v-if="item.formattedDate" class="item-date">{{ item.formattedDate }}</span>
        </div>
        <p v-if="item.description" class="item-desc">
          {{ displayDescription(item) }}
        </p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.source-section {
  margin-bottom: 2.5rem;
}
.source-name {
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 0.78rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent);
  margin: 0 0 0.9rem;
}
.item-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.item {
  padding: 1rem 0;
  border-top: 1px solid var(--border);
}
.item:first-child {
  border-top: none;
}
.item-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}
.item-title {
  color: var(--fg);
  font-weight: 700;
  font-size: 1.08rem;
  text-decoration: none;
  text-wrap: balance;
}
.item-title:hover {
  color: var(--accent);
}
.item-date {
  flex-shrink: 0;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
  white-space: nowrap;
}
.item-desc {
  margin: 0.4rem 0 0;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
    sans-serif;
  font-size: 0.92rem;
  color: var(--muted);
  overflow-wrap: break-word;
  max-width: 65ch;
}
</style>
