<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, inject } from 'vue'
import { digestKey } from '../data/digest-key'
import SourceSection from './SourceSection.vue'

const digest = inject(digestKey)
if (!digest) {
  throw new Error('digest state not found — main.ts must call app.provide(digestKey, ...) before mounting App')
}

const sections = computed(() => digest.sections)
const dateLabel = computed(() => digest.dateLabel)

const nonEmptySections = computed(() => sections.value.filter(s => s.items.length > 0))
const hasAnyItems = computed(() => nonEmptySections.value.length > 0)
const failedCount = computed(() => sections.value.filter(s => s.error).length)
const untranslatedCount = computed(() => nonEmptySections.value.filter(s => !s.translated).length)

const footerText = computed(() => {
  const segments = [`聚合自 ${sections.value.length} 个 RSS 来源`]
  if (failedCount.value)
    segments.push(`有 ${failedCount.value} 个来源今日不可用`)
  if (untranslatedCount.value)
    segments.push(`有 ${untranslatedCount.value} 个来源翻译失败，展示英文原文`)
  return `${segments.join(' · ')}。`
})

useHead({
  title: () => `AI 日报 — ${dateLabel.value}`,
})
</script>

<template>
  <div class="wrap">
    <header>
      <span class="eyebrow">每日快讯</span>
      <h1>AI 日报</h1>
      <div class="subtitle">
        {{ dateLabel }}
      </div>
    </header>
    <template v-if="hasAnyItems">
      <SourceSection v-for="section in nonEmptySections" :key="section.name" :section="section" />
    </template>
    <p v-else class="empty-state">
      今日暂无可用文章。
    </p>
    <footer>
      {{ footerText }}
    </footer>
  </div>
</template>

<style scoped>
.wrap {
  max-width: 700px;
  margin: 0 auto;
  padding: 3rem 1.5rem 4rem;
}
header {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid var(--fg);
}
header .eyebrow {
  display: block;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 0.6rem;
}
header h1 {
  font-size: 2rem;
  margin: 0 0 0.5rem;
  letter-spacing: -0.01em;
  text-wrap: balance;
}
header .subtitle {
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  color: var(--muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
footer {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  text-align: center;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 0.75rem;
  color: var(--muted);
}
.empty-state {
  text-align: center;
  color: var(--muted);
  padding: 3rem 0;
}
</style>
