import { usePreferredDark, useStorage } from '@vueuse/core'
import { computed, watchEffect } from 'vue'

export type ThemeMode = 'system' | 'light' | 'dark'

const MODES: ThemeMode[] = ['system', 'light', 'dark']

export function useTheme() {
  const mode = useStorage<ThemeMode>('theme', 'system')
  const systemPrefersDark = usePreferredDark()

  const isDark = computed(() =>
    mode.value === 'system' ? systemPrefersDark.value : mode.value === 'dark',
  )

  // 只在用户显式选择浅色/深色时才写 data-theme；选“跟随系统”时移除该属性，
  // 交还给 base.css 里已有的 @media (prefers-color-scheme: dark) 规则接管。
  watchEffect(() => {
    if (typeof document === 'undefined')
      return
    const el = document.documentElement
    if (mode.value === 'system')
      el.removeAttribute('data-theme')
    else
      el.dataset.theme = mode.value
  })

  function cycle() {
    const next = MODES[(MODES.indexOf(mode.value) + 1) % MODES.length]
    mode.value = next
  }

  return { mode, isDark, cycle }
}
