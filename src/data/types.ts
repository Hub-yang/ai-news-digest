export interface Source {
  name: string
  url: string
  category: string
}

export interface FeedItem {
  title: string
  link: string
  formattedDate: string
  description: string
}

export interface SourceResult {
  name: string
  category: string
  items: FeedItem[]
  error: string | null
  /** 本来源今日是否成功翻译（无 key / 超时 / 接口失败时为 false，展示英文原文） */
  translated: boolean
}
