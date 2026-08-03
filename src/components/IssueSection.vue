<script setup lang="ts">
import type { IssueSection } from '../data/types'
import IssueItem from './IssueItem.vue'

defineProps<{ section: IssueSection, anchorId: string }>()
</script>

<template>
  <section :id="anchorId" class="issue-section">
    <h2 class="category-name">
      {{ section.category }}
    </h2>
    <ul class="item-list">
      <IssueItem v-for="item in section.items" :key="item.link" :item="item" />
    </ul>
  </section>
</template>

<style scoped>
.issue-section {
  margin-bottom: 2.5rem;
  /* 锚点跳转时既要躲开固定页头，也要躲开吸顶的分类导航（4rem 是它自己的高度） */
  scroll-margin-top: calc(var(--header-height) + 4rem);
}
.category-name {
  font-family: ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace;
  font-size: 0.78rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent);
  margin: 0 0 0.9rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}
.item-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
