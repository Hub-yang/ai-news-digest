<script setup lang="ts">
import { provide } from 'vue'
import { RouterView } from 'vue-router'
import { languageKey, useLanguage } from '../composables/use-language'
import { siteUrl } from '../utils/site-url'
import LangToggle from './LangToggle.vue'
import ThemeToggle from './ThemeToggle.vue'

// 只实例化一次，provide 给 LangToggle 和每个 IssueItem 共用
// （useStorage 在同一文档内多实例不互相同步，见 use-language.ts 注释）。
provide(languageKey, useLanguage())
</script>

<template>
  <div class="wrap">
    <header>
      <div class="header-top">
        <span class="eyebrow">每周精选</span>
        <div class="header-actions">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
      <h1>
        <a :href="siteUrl('/')">AI 周刊</a>
      </h1>
    </header>

    <RouterView />

    <footer>
      每周一自动出刊 · 聚合自 14 个 AI 相关 RSS 来源
    </footer>
  </div>
</template>

<style scoped>
.wrap {
  max-width: 700px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}
header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--fg);
}
.header-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.6rem;
}
.header-actions {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
header .eyebrow {
  display: block;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
}
header h1 {
  font-size: 2rem;
  margin: 0;
  letter-spacing: -0.01em;
  text-wrap: balance;
}
header h1 a {
  color: inherit;
  text-decoration: none;
}
footer {
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  text-align: center;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 0.72rem;
  color: var(--muted);
}
</style>
