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
    class="pill-button"
    :aria-label="`当前：${label}，点击切换`"
    :title="label"
    @click="toggle"
  >
    <component :is="icon" />
  </button>
</template>
