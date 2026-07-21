import type { InjectionKey } from 'vue'
import type { SourceResult } from './types'

export interface DigestState {
  sections: SourceResult[]
  dateLabel: string
}

export const digestKey: InjectionKey<DigestState> = Symbol('digest')
