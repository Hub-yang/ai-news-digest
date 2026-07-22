<script setup lang="ts">
import { computed } from 'vue'
import IconMonitor from '~icons/lucide/monitor'
import IconMoon from '~icons/lucide/moon'
import IconSun from '~icons/lucide/sun'
import { useTheme } from '../composables/use-theme'

const { mode, cycle } = useTheme()

const icon = computed(() => ({ system: IconMonitor, light: IconSun, dark: IconMoon }[mode.value]))
const label = computed(() => ({ system: '跟随系统', light: '浅色模式', dark: '深色模式' }[mode.value]))
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="`当前：${label}，点击切换`"
    :title="label"
    @click="cycle"
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
