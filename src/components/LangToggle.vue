<script setup lang="ts">
import { computed, inject } from 'vue'
import { languageKey } from '../composables/use-language'

const language = inject(languageKey)
if (!language) {
  throw new Error('language state not found — App.vue must call provide(languageKey, ...) before mounting LangToggle')
}

const { lang, toggle } = language

const label = computed(() => lang.value === 'en' ? 'EN' : '中')
const nextLabel = computed(() => lang.value === 'en' ? '中文' : 'English')
</script>

<template>
  <button
    type="button"
    class="lang-toggle"
    :aria-label="`当前：${lang === 'en' ? '英文原文' : '中文译文'}，点击切换为${nextLabel}`"
    :title="`切换为${nextLabel}`"
    @click="toggle"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.lang-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.5rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--fg);
  cursor: pointer;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 0.78rem;
  font-weight: 600;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.lang-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
