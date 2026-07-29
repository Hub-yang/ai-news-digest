import type { InjectionKey } from 'vue'
import type { Issue, IssueSummary } from './types'

/**
 * 每个页面拿到的数据。
 *
 * vite-ssg 会对每个路由单独调一次 createApp 并把 initialState 序列化进那一页的
 * HTML，所以这里装的永远只是「当前这一页需要的东西」——往期正文不会被塞进
 * 客户端 bundle（见 src/main.ts）。
 */

export interface IssuePage {
  kind: 'issue'
  /** 一期都还没有时为 null，页面展示空状态 */
  issue: Issue | null
  /** 上一期 / 下一期的期号，没有则为 null */
  prev: number | null
  next: number | null
  /** 总期数，用于页脚和「往期」入口 */
  total: number
}

export interface ArchivePage {
  kind: 'archive'
  issues: IssueSummary[]
}

export type PageData = IssuePage | ArchivePage

export const pageKey: InjectionKey<PageData> = Symbol('page')
