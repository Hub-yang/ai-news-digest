<script setup lang="ts">
import type { IssuePage } from '../data/page-key'
import { useHead } from '@unhead/vue'
import { computed, inject } from 'vue'
import { pageKey } from '../data/page-key'
import { siteUrl } from '../utils/site-url'
import CategoryNav from './CategoryNav.vue'
import IssueSection from './IssueSection.vue'

const page = inject(pageKey)
if (!page || page.kind !== 'issue') {
  throw new Error('issue page data not found — main.ts must provide(pageKey, ...) with kind "issue"')
}

const { issue, prev, next, total } = page as IssuePage

// 分类名是中文，直接当锚点 id 会带来编码/转义的麻烦，用序号生成稳定 id
const sections = computed(() =>
  (issue?.sections ?? []).map((section, index) => ({
    section,
    anchorId: `section-${index}`,
  })),
)
const categories = computed(() =>
  sections.value.map(({ section, anchorId }) => ({ name: section.category, anchorId })),
)

const statsText = computed(() => {
  if (!issue)
    return ''
  const { collected, published, sourceCount, translated } = issue.stats
  const segments = [`本期 ${published} 条，选自 ${collected} 条候选 · ${sourceCount} 个来源`]
  if (!translated)
    segments.push('翻译未完成，展示英文原文')
  return segments.join(' · ')
})

useHead({
  title: () => issue ? `AI 周刊 第 ${issue.number} 期 — ${issue.dateLabel}` : 'AI 周刊',
  link: () => issue
    // 首页和 /issues/N/ 是同一份内容，指明期号页为规范地址，避免重复内容
    ? [{ rel: 'canonical', href: siteUrl(`/issues/${issue.number}/`) }]
    : [],
})
</script>

<template>
  <template v-if="issue">
    <div class="issue-meta">
      <span class="issue-number">第 {{ issue.number }} 期</span>
      <span class="issue-date">{{ issue.dateLabel }}</span>
    </div>
    <p class="issue-stats">
      {{ statsText }}
    </p>

    <CategoryNav :categories="categories" />

    <IssueSection
      v-for="{ section, anchorId } in sections"
      :key="anchorId"
      :section="section"
      :anchor-id="anchorId"
    />

    <nav class="issue-pager" aria-label="期号导航">
      <a v-if="prev" class="pager-link" :href="siteUrl(`/issues/${prev}/`)">← 第 {{ prev }} 期</a>
      <span v-else class="pager-placeholder" />
      <a class="pager-link archive" :href="siteUrl('/issues/')">全部 {{ total }} 期</a>
      <a v-if="next" class="pager-link" :href="siteUrl(`/issues/${next}/`)">第 {{ next }} 期 →</a>
      <span v-else class="pager-placeholder" />
    </nav>
  </template>

  <p v-else class="empty-state">
    还没有发布任何一期。
  </p>
</template>

<style scoped>
.issue-meta {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.75rem;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  margin-bottom: 0.35rem;
}
.issue-number {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent);
}
.issue-date {
  font-size: 0.85rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.issue-stats {
  margin: 0 0 1.5rem;
  text-align: center;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 0.75rem;
  color: var(--muted);
}
.issue-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}
.pager-link {
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 0.78rem;
  color: var(--muted);
  text-decoration: none;
  white-space: nowrap;
}
.pager-link:hover {
  color: var(--accent);
}
.pager-link.archive {
  color: var(--accent);
}
.pager-placeholder {
  flex: 1;
}
.empty-state {
  text-align: center;
  color: var(--muted);
  padding: 3rem 0;
}
</style>
