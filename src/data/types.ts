export interface Source {
  name: string
  url: string
  category: string
  /** 来源权重，聚类后决定哪条当代表条、同分时谁排前面；缺省 1 */
  priority?: number
}

/**
 * 每日采集的单条原料。只有英文原文——翻译已挪到出刊时只翻入选条目，
 * 采集阶段不调用任何 API（见 CLAUDE.md「翻译时机」）。
 */
export interface SnapshotItem {
  title: string
  link: string
  description: string
  /** ISO 字符串；feed 里缺失或畸形时为 ''（不能放 Date 对象，见下方说明） */
  pubDate: string
  source: string
  category: string
}

export interface SnapshotSourceError {
  source: string
  message: string
}

/**
 * 一天一份，落在 content/snapshots/YYYY-MM-DD.json。
 * 出刊时读取一个时间窗口内的多份快照作为原料。
 */
export interface Snapshot {
  collectedAt: string
  items: SnapshotItem[]
  /** 当日抓取失败的来源，仅供排查，不参与出刊 */
  errors: SnapshotSourceError[]
}

/**
 * 出刊后固化的成品条目，中英双份。
 *
 * 所有字段必须是 JSON 安全的（字符串/数字/数组）——这份数据会经由
 * initialState 序列化穿过 SSR→客户端边界，Date 对象到浏览器会掉原型，
 * hydration 时调用 .toLocaleDateString() 就会抛错。
 */
export interface IssueItem {
  title: string
  titleZh: string
  description: string
  descriptionZh: string
  link: string
  formattedDate: string
  /** 署名来源：簇内权重最高（并列时最早发布）的那条 */
  source: string
  /** 同一事件的其余报道方，用于「另有 N 家报道」 */
  alsoReportedBy: string[]
}

export interface IssueSection {
  category: string
  items: IssueItem[]
}

export interface IssueStats {
  /** 本期窗口内去重后的原料总数 */
  collected: number
  /** 实际入选发布的条目数 */
  published: number
  /** 贡献了入选条目的来源数 */
  sourceCount: number
  /** 本期是否成功翻译；false 时正文展示英文原文 */
  translated: boolean
}

/** 一期周刊，落在 content/issues/00N.json，除非显式重算否则不可变 */
export interface Issue {
  number: number
  /** 覆盖窗口，ISO 日期（含） */
  startDate: string
  endDate: string
  /** 展示用的中文区间，如「2026年7月27日 — 8月2日」 */
  dateLabel: string
  publishedAt: string
  sections: IssueSection[]
  stats: IssueStats
}

/** 往期列表页用的轻量摘要，不含正文 */
export interface IssueSummary {
  number: number
  startDate: string
  endDate: string
  dateLabel: string
  publishedAt: string
  itemCount: number
}
