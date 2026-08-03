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
    class="pill-button lang-toggle"
    :aria-label="`当前：${lang === 'en' ? '英文原文' : '中文译文'}，点击切换为${nextLabel}`"
    :title="`切换为${nextLabel}`"
    @click="toggle"
  >
    {{ label }}
  </button>
</template>

<style scoped>
/* 其余样式来自全局 .pill-button，这里只补文字按钮特有的排版 */
.lang-toggle {
  padding: 0 0.5rem;
  font-family: ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace;
  font-size: 0.78rem;
  font-weight: 600;
}
</style>
