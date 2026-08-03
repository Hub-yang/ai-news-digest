<script setup lang="ts">
import type { ArchivePage } from '../data/page-key'
import { useHead } from '@unhead/vue'
import { inject } from 'vue'
import { pageKey } from '../data/page-key'
import { siteUrl } from '../utils/site-url'

const page = inject(pageKey)
if (!page || page.kind !== 'archive') {
  throw new Error('archive page data not found — main.ts must provide(pageKey, ...) with kind "archive"')
}

const { issues } = page as ArchivePage

useHead({ title: '往期 — AI 周刊' })
</script>

<template>
  <h2 class="archive-title">
    往期
  </h2>

  <ul v-if="issues.length" class="archive-list">
    <li v-for="issue in issues" :key="issue.number" class="archive-row">
      <a class="archive-link" :href="siteUrl(`/issues/${issue.number}/`)">
        <span class="number">第 {{ issue.number }} 期</span>
        <span class="date">{{ issue.dateLabel }}</span>
        <span class="count">{{ issue.itemCount }} 条</span>
      </a>
    </li>
  </ul>

  <p v-else class="empty-state">
    还没有发布任何一期。
  </p>
</template>

<style scoped>
.archive-title {
  font-family: ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace;
  font-size: 0.78rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent);
  margin: 0 0 1rem;
}
.archive-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.archive-row {
  border-top: 1px solid var(--border);
}
.archive-row:first-child {
  border-top: none;
}
.archive-link {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  padding: 0.9rem 0;
  text-decoration: none;
  color: var(--fg);
}
.archive-link:hover .number {
  color: var(--accent);
}
.number {
  font-weight: 700;
  font-size: 1.02rem;
  white-space: nowrap;
}
.date {
  flex: 1;
  font-family: ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace;
  font-size: 0.8rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.count {
  font-family: ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace;
  font-size: 0.72rem;
  color: var(--muted);
  white-space: nowrap;
}
.empty-state {
  text-align: center;
  color: var(--muted);
  padding: 3rem 0;
}
</style>
