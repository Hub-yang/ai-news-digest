import type { IssueItem, IssueSection, SnapshotItem, Source } from './types'
import sourcesData from '../../sources.json'
import { formatDate } from '../utils/format-date'

/** 每个分类最多发布多少条 */
export const ITEMS_PER_CATEGORY = 12
/**
 * 同一分类里单个来源最多占多少条。
 *
 * 不设限的话高产源会霸榜——实测「社区/独立博客」12 条里 9 条来自同一个
 * 链接微博客，读起来像某个人的时间线而不是一份周刊。
 */
export const ITEMS_PER_SOURCE_IN_CATEGORY = 4
/**
 * 判为同一事件的相似度阈值（IDF 加权 Jaccard，见 similarity()）。
 *
 * 这个值是量出来的，不是拍的。拿 110 条真实标题实测，同一事件的跨源标题对
 * 落在 0.155–0.187，而唯一一组误配（Google 的两条不相关报道）在 0.169——
 * 真假区间是**重叠**的，不存在既不漏又不误的分界线。所以这里取真对区间的
 * 顶端 0.18：宁可漏合，也不把两件不相干的事并成一条摆在读者面前。
 *
 * 代价是每周大约只合并 1~2 组。调这个值之前请先跑一遍 pnpm rebuild-issue
 * 看历史期的实际效果，不要凭感觉调。
 */
export const CLUSTER_THRESHOLD = 0.18

/**
 * 周刊的时间语义全部按 Asia/Shanghai（UTC+8）计算，而 CI 跑在 UTC。
 * 把时间戳加上 8 小时后，再读它的 UTC 字段，得到的就是北京时间的墙上时钟——
 * 这样不必引入任何时区库，也不受 runner 本地时区影响。
 */
const CST_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export interface DateWindow {
  /** 含，ISO */
  start: string
  /** 含，ISO */
  end: string
}

function toCstWallClock(date: Date): Date {
  return new Date(date.getTime() + CST_OFFSET_MS)
}

function fromCstWallClock(shifted: Date): Date {
  return new Date(shifted.getTime() - CST_OFFSET_MS)
}

/**
 * 最近一个「完整」的自然周：上周一 00:00:00 — 上周日 23:59:59.999（北京时间）。
 * 周一早上出刊时，覆盖的就是刚过去的那一周。
 */
export function lastCompleteWeek(reference: Date = new Date()): DateWindow {
  const cst = toCstWallClock(reference)
  // getUTCDay 在移位后的时间上读到的是北京时间的星期几；周日是 0，换算成「周一为 0」
  const daysSinceMonday = (cst.getUTCDay() + 6) % 7
  const thisMonday = Date.UTC(cst.getUTCFullYear(), cst.getUTCMonth(), cst.getUTCDate()) - daysSinceMonday * DAY_MS
  const lastMonday = thisMonday - 7 * DAY_MS

  return {
    start: fromCstWallClock(new Date(lastMonday)).toISOString(),
    end: fromCstWallClock(new Date(thisMonday - 1)).toISOString(),
  }
}

/**
 * 从现在往回数 n 天。冷启动出第 1 期时用——那时还没有「上一个完整周」的原料，
 * 手里只有刚采集的一两份快照。
 */
export function recentDays(days: number, reference: Date = new Date()): DateWindow {
  return {
    start: new Date(reference.getTime() - days * DAY_MS).toISOString(),
    end: reference.toISOString(),
  }
}

/** 「2026年7月27日 — 8月2日」；同月时省略后半段的年月 */
export function formatWindowLabel(window: DateWindow): string {
  const start = toCstWallClock(new Date(window.start))
  const end = toCstWallClock(new Date(window.end))
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth()

  const head = `${start.getUTCFullYear()}年${start.getUTCMonth() + 1}月${start.getUTCDate()}日`
  const tail = sameMonth
    ? `${end.getUTCDate()}日`
    : sameYear
      ? `${end.getUTCMonth() + 1}月${end.getUTCDate()}日`
      : `${end.getUTCFullYear()}年${end.getUTCMonth() + 1}月${end.getUTCDate()}日`

  return `${head} — ${tail}`
}

/**
 * 链接归一化，用于跨快照去重：同一条目会连着好几天出现在每日快照里，
 * 这是原料里最大的一批重复。顺带剥掉各家 feed 附加的追踪参数，
 * 它们会让本质相同的链接看起来不同。
 */
function normalizeLink(link: string): string {
  try {
    const url = new URL(link)
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|ref$|source$|fbclid$|gclid$)/i.test(key))
        url.searchParams.delete(key)
    }
    url.hash = ''
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}${url.search}`.toLowerCase()
  }
  catch {
    return link.trim().toLowerCase()
  }
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'for',
  'nor',
  'so',
  'yet',
  'of',
  'in',
  'on',
  'at',
  'to',
  'from',
  'by',
  'with',
  'as',
  'into',
  'onto',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'has',
  'have',
  'had',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'you',
  'your',
  'we',
  'our',
  'how',
  'why',
  'what',
  'when',
  'who',
  'which',
  'can',
  'will',
  'just',
  'now',
  'new',
  'says',
  'said',
  'up',
  'out',
  'about',
  'over',
  'more',
  'than',
  'not',
])

/**
 * 标题 → 去噪后的 token 集合。聚类只在英文原文上做（翻译发生在选完之后），
 * 所以这里只处理英文分词。
 */
function titleTokens(title: string): Set<string> {
  const tokens = title
    .toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, ' ')
    // 保留 gpt-5.5 / o3-mini 这类型号里的连字符和小数点，但去掉首尾的
    .split(/\s+/)
    .map(token => token.replace(/^[.-]+|[.-]+$/g, ''))
    .filter(token => token.length > 1 && !STOP_WORDS.has(token))

  return new Set(tokens)
}

/**
 * 按逆文档频率给 token 加权。
 *
 * 不加权的话，"ai"（110 条标题里出现 52 次）和 "hugging"（出现 5 次）等价，
 * 于是共享 "ai" "data" 这类高频词的无关标题会和真正报道同一事件的标题拿到
 * 一样的分数——实测两者完全无法区分。稀有专名才是「说的是同一件事」的证据。
 */
function inverseDocumentFrequency(tokenSets: Set<string>[]): (token: string) => number {
  const documentFrequency = new Map<string, number>()
  for (const set of tokenSets) {
    for (const token of set)
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1)
  }

  const total = tokenSets.length
  return token => Math.log(total / (documentFrequency.get(token) ?? 1))
}

/** IDF 加权的 Jaccard：交集权重和 / 并集权重和 */
function similarity(a: Set<string>, b: Set<string>, idf: (token: string) => number): number {
  if (a.size === 0 || b.size === 0)
    return 0

  let intersection = 0
  let union = 0
  for (const token of new Set([...a, ...b])) {
    const weight = idf(token)
    union += weight
    if (a.has(token) && b.has(token))
      intersection += weight
  }

  return union === 0 ? 0 : intersection / union
}

interface RankedItem extends SnapshotItem {
  priority: number
  time: number
}

interface Cluster {
  representative: RankedItem
  tokens: Set<string>
  members: RankedItem[]
}

function sourcePriorities(): Map<string, number> {
  const map = new Map<string, number>()
  for (const source of sourcesData as Source[])
    map.set(source.name, source.priority ?? 1)
  return map
}

/** 分类顺序沿用来源在 sources.json 里首次出现的顺序，与站点既有的分类导航一致 */
function categoryOrder(): string[] {
  return [...new Set((sourcesData as Source[]).map(source => source.category))]
}

/**
 * 跨源聚类：把同一件事的多家报道合并成一簇。
 *
 * 贪心凝聚，且只与各簇的「代表条」比较而不是簇内全部成员——后者会产生链式
 * 合并（A 像 B、B 像 C，于是 A 和 C 被塞进同一簇，哪怕两者毫不相干）。
 */
export function clusterItems(items: RankedItem[]): Cluster[] {
  // 先按权重、再按发布时间升序，让「首报 + 高权重源」自然成为代表条
  const ordered = [...items].sort((a, b) => b.priority - a.priority || a.time - b.time)
  const tokenSets = ordered.map(item => titleTokens(item.title))
  // IDF 在「本期窗口内的全部标题」这个语料上统计，所以权重随每期内容自适应
  const idf = inverseDocumentFrequency(tokenSets)

  const clusters: Cluster[] = []
  ordered.forEach((item, index) => {
    const tokens = tokenSets[index]!
    const hit = clusters.find(cluster => similarity(cluster.tokens, tokens, idf) >= CLUSTER_THRESHOLD)
    if (hit)
      hit.members.push(item)
    else
      clusters.push({ representative: item, tokens, members: [item] })
  })

  return clusters
}

export interface SelectionResult {
  sections: IssueSection[]
  collected: number
  published: number
  sourceCount: number
}

/**
 * 原料 → 一期周刊的正文（尚未翻译，titleZh/descriptionZh 先等于原文）。
 *
 * 纯函数，不碰文件系统也不发网络请求，publish 与 rebuild-issue 共用同一套逻辑。
 */
export function selectIssueItems(rawItems: SnapshotItem[], window: DateWindow): SelectionResult {
  const priorities = sourcePriorities()
  const startTime = new Date(window.start).getTime()
  const endTime = new Date(window.end).getTime()

  // 1. 跨快照按链接去重，保留最早出现的那一条
  const byLink = new Map<string, SnapshotItem>()
  for (const item of rawItems) {
    const key = normalizeLink(item.link)
    const existing = byLink.get(key)
    if (!existing || (item.pubDate && existing.pubDate && item.pubDate < existing.pubDate))
      byLink.set(key, item)
  }

  // 2. 过滤到本期窗口。pubDate 缺失的条目直接丢弃——无法判断它属于哪一期，
  //    留着会让同一条在多期之间反复出现。
  const ranked: RankedItem[] = []
  for (const item of byLink.values()) {
    if (!item.pubDate)
      continue
    const time = new Date(item.pubDate).getTime()
    if (Number.isNaN(time) || time < startTime || time > endTime)
      continue
    ranked.push({ ...item, priority: priorities.get(item.source) ?? 1, time })
  }

  // 3. 聚类
  const clusters = clusterItems(ranked)

  // 4. 按分类分组并排序：报道家数 → 来源权重 → 新鲜度
  const grouped = new Map<string, Cluster[]>()
  for (const cluster of clusters) {
    const category = cluster.representative.category
    const bucket = grouped.get(category)
    if (bucket)
      bucket.push(cluster)
    else
      grouped.set(category, [cluster])
  }

  const sections: IssueSection[] = []
  const contributingSources = new Set<string>()
  let published = 0

  for (const category of categoryOrder()) {
    const bucket = grouped.get(category)
    if (!bucket?.length)
      continue

    const perSource = new Map<string, number>()
    const items: IssueItem[] = bucket
      .sort((a, b) =>
        b.members.length - a.members.length
        || b.representative.priority - a.representative.priority
        || b.representative.time - a.representative.time,
      )
      // 先按单源配额过滤，再取前 N——顺序反过来的话，被霸榜的分类会因为
      // 先截断而选不满，白白浪费坐位。
      .filter((cluster) => {
        const source = cluster.representative.source
        const used = perSource.get(source) ?? 0
        if (used >= ITEMS_PER_SOURCE_IN_CATEGORY)
          return false
        perSource.set(source, used + 1)
        return true
      })
      .slice(0, ITEMS_PER_CATEGORY)
      .map((cluster) => {
        const { representative } = cluster
        const alsoReportedBy = [...new Set(
          cluster.members
            .filter(member => member.source !== representative.source)
            .map(member => member.source),
        )]

        contributingSources.add(representative.source)

        return {
          title: representative.title,
          // 翻译发生在选完之后（见 scripts/publish.ts）；这里先让中文字段等于
          // 原文，翻译失败时它就是最终的降级结果。
          titleZh: representative.title,
          description: representative.description,
          descriptionZh: representative.description,
          link: representative.link,
          formattedDate: formatDate(new Date(representative.pubDate)),
          source: representative.source,
          alsoReportedBy,
        }
      })

    published += items.length
    sections.push({ category, items })
  }

  return {
    sections,
    collected: ranked.length,
    published,
    sourceCount: contributingSources.size,
  }
}
