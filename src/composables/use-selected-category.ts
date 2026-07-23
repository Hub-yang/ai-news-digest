import { useStorage } from '@vueuse/core'

export function useSelectedCategory() {
  return useStorage<string | null>('category', null)
}
