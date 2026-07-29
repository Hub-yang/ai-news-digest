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
  /* 顶部有吸顶的锚点导航，锚点跳转时留出它的高度，别把标题顶到导航底下 */
  scroll-margin-top: 4rem;
}
.category-name {
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
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
