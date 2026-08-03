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
      #{{ category.name }}
    </a>
  </nav>
</template>

<style scoped>
.category-nav {
  position: sticky;
  top: var(--header-height);
  z-index: 10;
  display: flex;
  gap: 1rem;
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
  cursor: pointer;
  white-space: nowrap;
  background-image: linear-gradient(var(--accent), var(--accent));
  background-repeat: no-repeat;
  background-position: 0 100%;
  background-size: 0% 1px;
  transition:
    color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    background-size 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
.nav-item:hover {
  color:var(--accent);
  background-size: 100% 1px;
}
</style>
