<script setup lang="ts">
import type { IssuePage } from '../data/page-key'
import { useHead } from '@unhead/vue'
import { computed, inject } from 'vue'
import IconChevronLeft from '~icons/lucide/chevron-left'
import IconChevronRight from '~icons/lucide/chevron-right'
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
  const { collected, published, sourceCount } = issue.stats
  return `本期${published}条 · 选自${collected}条候选 · ${sourceCount}个来源`
})

useHead({
  title: () => issue ? `AI 周刊 第 ${issue.number} 期` : 'AI 周刊',
  link: () => issue
    // 首页和 /issues/N/ 是同一份内容，指明期号页为规范地址，避免重复内容
    ? [{ rel: 'canonical', href: siteUrl(`/issues/${issue.number}/`) }]
    : [],
})
</script>

<template>
  <template v-if="issue">
    <div class="issue-meta-bar">
      <span class="issue-meta-left">
        第{{ issue.number }}期 · {{ issue.dateLabel }}
      </span>
      <span class="issue-meta-right">{{ statsText }}</span>
    </div>

    <CategoryNav :categories="categories" />

    <IssueSection
      v-for="{ section, anchorId } in sections"
      :key="anchorId"
      :section="section"
      :anchor-id="anchorId"
    />

    <nav class="issue-pager" aria-label="期号导航">
      <a v-if="prev" class="pager-link" :href="siteUrl(`/issues/${prev}/`)">
        <IconChevronLeft class="pager-icon" />
        <span>第 {{ prev }} 期</span>
      </a>
      <span v-else class="pager-placeholder" />
      <a class="pager-link archive" :href="siteUrl('/issues/')">全部 {{ total }} 期</a>
      <a v-if="next" class="pager-link" :href="siteUrl(`/issues/${next}/`)">
        <span>第 {{ next }} 期</span>
        <IconChevronRight class="pager-icon" />
      </a>
      <span v-else class="pager-placeholder" />
    </nav>
  </template>

  <p v-else class="empty-state">
    还没有发布任何一期。
  </p>
</template>

<style scoped>
.issue-meta-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.35rem 1rem;
  margin-bottom: 1.5rem;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 0.75rem;
}
.issue-meta-left {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.issue-meta-right {
  color: var(--muted);
}
.issue-pager {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 90;
  display: flex;
  align-items: stretch;
  width: max-content;
  max-width: calc(100vw - 2rem);
  border-radius: 1rem;
  border: 1.5px solid color-mix(in srgb, var(--fg) 14%, transparent);
  background: color-mix(in srgb, var(--bg) 72%, transparent);
  box-shadow:
    0 12px 40px -8px rgba(0, 0, 0, 0.25),
    0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}
@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .issue-pager {
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
  }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .issue-pager {
    /* 不支持毛玻璃的浏览器退回不透明背景，避免半透明糊字 */
    background: var(--bg);
  }
}
:root[data-theme="dark"] .issue-pager {
  box-shadow:
    0 16px 48px -8px rgba(0, 0, 0, 0.6),
    0 2px 8px rgba(0, 0, 0, 0.3);
}
@media (prefers-color-scheme: dark) {
  .issue-pager {
    box-shadow:
      0 16px 48px -8px rgba(0, 0, 0, 0.6),
      0 2px 8px rgba(0, 0, 0, 0.3);
  }
}
:root[data-theme="light"] .issue-pager {
  box-shadow:
    0 12px 40px -8px rgba(0, 0, 0, 0.25),
    0 2px 8px rgba(0, 0, 0, 0.08);
}
.pager-link,
.pager-placeholder {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 1rem;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 0.78rem;
  color: var(--muted);
  text-decoration: none;
  white-space: nowrap;
}
.pager-link + .pager-link,
.pager-link + .pager-placeholder,
.pager-placeholder + .pager-link,
.pager-placeholder + .pager-placeholder {
  border-left: 1px solid var(--border);
}
.pager-link:hover {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.pager-link.archive {
  color: var(--accent);
  font-weight: 600;
}
.pager-icon {
  width: 0.9rem;
  height: 0.9rem;
  flex: none;
}
.pager-placeholder {
  min-width: 5.5rem;
}

@media (max-width: 640px) {
  .issue-pager {
    bottom: 1rem;
  }
  .pager-link,
  .pager-placeholder {
    padding: 0.45rem 0.7rem;
    font-size: 0.7rem;
    gap: 0.25rem;
  }
  .pager-icon {
    width: 0.8rem;
    height: 0.8rem;
  }
  .pager-placeholder {
    min-width: 4rem;
  }
}
.empty-state {
  text-align: center;
  color: var(--muted);
  padding: 3rem 0;
}
</style>
