<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, inject, ref } from 'vue'
import { digestKey } from '../data/digest-key'
import CategoryNav from './CategoryNav.vue'
import SourceSection from './SourceSection.vue'
import ThemeToggle from './ThemeToggle.vue'

const digest = inject(digestKey)
if (!digest) {
  throw new Error('digest state not found — main.ts must call app.provide(digestKey, ...) before mounting App')
}

const sections = computed(() => digest.sections)
const dateLabel = computed(() => digest.dateLabel)

const nonEmptySections = computed(() => sections.value.filter(s => s.items.length > 0))
const hasAnyItems = computed(() => nonEmptySections.value.length > 0)

// 分类顺序取自 sources.json 中各来源首次出现的顺序；只统计有内容的来源，
// 避免点进去发现是空分类。
const categories = computed(() => [...new Set(nonEmptySections.value.map(s => s.category))])
const selectedCategory = ref<string | null>(null)
const filteredSections = computed(() =>
  selectedCategory.value === null
    ? nonEmptySections.value
    : nonEmptySections.value.filter(s => s.category === selectedCategory.value),
)
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
      <div class="header-top">
        <span class="eyebrow">每日快讯</span>
        <ThemeToggle />
      </div>
      <h1>AI 日报</h1>
      <div class="subtitle">
        {{ dateLabel }}
      </div>
    </header>
    <template v-if="hasAnyItems">
      <CategoryNav v-model="selectedCategory" :categories="categories" />
      <SourceSection v-for="section in filteredSections" :key="section.name" :section="section" />
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
.header-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.6rem;
}
.header-top :deep(.theme-toggle) {
  position: absolute;
  right: 0;
}
header .eyebrow {
  display: block;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
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
