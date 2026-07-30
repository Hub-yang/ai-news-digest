<script setup lang="ts">
import { computed } from 'vue'
import IconMoon from '~icons/lucide/moon'
import IconSun from '~icons/lucide/sun'
import { useTheme } from '../composables/use-theme'

const { isDark, toggle } = useTheme()

const icon = computed(() => isDark.value ? IconMoon : IconSun)
const label = computed(() => isDark.value ? '深色模式' : '浅色模式')
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="`当前：${label}，点击切换`"
    :title="label"
    @click="toggle"
  >
    <component :is="icon" />
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--fg);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.theme-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.theme-toggle svg {
  width: 1.1rem;
  height: 1.1rem;
}
</style>
