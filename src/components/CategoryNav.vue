<script setup lang="ts">
defineProps<{
  categories: string[]
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()
</script>

<template>
  <nav class="category-nav" aria-label="分类筛选">
    <button
      type="button"
      class="nav-item"
      :class="{ active: modelValue === null }"
      :aria-pressed="modelValue === null"
      @click="emit('update:modelValue', null)"
    >
      首页
    </button>
    <button
      v-for="category in categories"
      :key="category"
      type="button"
      class="nav-item"
      :class="{ active: modelValue === category }"
      :aria-pressed="modelValue === category"
      @click="emit('update:modelValue', category)"
    >
      {{ category }}
    </button>
  </nav>
</template>

<style scoped>
.category-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 0;
  margin-bottom: 2rem;
  scrollbar-width: none;
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
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.nav-item:hover {
  color: var(--fg);
  border-color: var(--muted);
}
.nav-item.active {
  color: var(--bg);
  background: var(--accent);
  border-color: var(--accent);
}
</style>
