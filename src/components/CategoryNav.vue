<script setup lang="ts">
defineProps<{
  categories: { name: string, anchorId: string }[]
}>()

/**
 * 锚点目录，不是筛选器——一期周刊是一份完整读物，点某个分类只应该把读者
 * 送到那个板块，而不该把其余内容藏起来。
 *
 * 用 <a href="#..."> 而不是 JS 滚动：无 JS 时依然可用，滚动行为交给 CSS 的
 * scroll-behavior，锚点偏移交给板块自己的 scroll-margin-top。
 */
</script>

<template>
  <nav class="category-nav" aria-label="板块目录">
    <a
      v-for="category in categories"
      :key="category.anchorId"
      class="nav-item"
      :href="`#${category.anchorId}`"
    >
      {{ category.name }}
    </a>
  </nav>
</template>

<style scoped>
.category-nav {
  position: sticky;
  top: var(--header-height);
  z-index: 10;
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 0;
  margin-bottom: 2rem;
  scrollbar-width: none;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}
.category-nav::-webkit-scrollbar {
  display: none;
}
.nav-item {
  flex: none;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  text-decoration: none;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}
.nav-item:hover {
  color: var(--bg);
  background: var(--accent);
  border-color: var(--accent);
}
</style>
