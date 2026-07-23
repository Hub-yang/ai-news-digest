import type { InjectionKey } from 'vue'
import { useStorage } from '@vueuse/core'

export type Lang = 'en' | 'zh'

export function useLanguage() {
  const lang = useStorage<Lang>('lang', 'en')

  function toggle() {
    lang.value = lang.value === 'en' ? 'zh' : 'en'
  }

  return { lang, toggle }
}

// useStorage 在同一文档内多个实例之间不会自动同步（浏览器原生 storage 事件
// 只在其他标签页触发），所以 useLanguage() 必须只调用一次并通过 provide/inject
// 分发给所有消费者（按钮 + 各 SourceSection），不能各组件各自调用。
export const languageKey: InjectionKey<ReturnType<typeof useLanguage>> = Symbol('language')
