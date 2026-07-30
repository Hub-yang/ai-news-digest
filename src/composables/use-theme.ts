import { usePreferredDark, useStorage } from '@vueuse/core'
import { computed, watchEffect } from 'vue'

export type ThemeMode = 'light' | 'dark'

export function useTheme() {
  const mode = useStorage<ThemeMode | null>('theme', null, undefined, { writeDefaults: false })
  const systemPrefersDark = usePreferredDark()

  // 非 light/dark 的值（null，或老用户 localStorage 里残留的历史值 'system'）
  // 都视为“未显式选择”，此时跟随系统偏好。
  const explicitMode = computed(() => mode.value === 'light' || mode.value === 'dark' ? mode.value : null)

  const isDark = computed(() =>
    explicitMode.value ? explicitMode.value === 'dark' : systemPrefersDark.value,
  )

  // 只在用户显式选择浅色/深色时才写 data-theme；未选择时移除该属性，
  // 交还给 base.css 里已有的 @media (prefers-color-scheme: dark) 规则接管。
  watchEffect(() => {
    if (typeof document === 'undefined')
      return
    const el = document.documentElement
    if (explicitMode.value)
      el.dataset.theme = explicitMode.value
    else
      el.removeAttribute('data-theme')
  })

  function toggle() {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  return { mode, isDark, toggle }
}
