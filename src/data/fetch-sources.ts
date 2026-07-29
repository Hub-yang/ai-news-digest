import type { Snapshot, SnapshotItem, SnapshotSourceError, Source } from './types'
import Parser from 'rss-parser'
import sourcesData from '../../sources.json'
import { errorMessage, withTimeout } from '../utils/network'

/**
 * 每源每次采集的条目上限。翻译已挪到出刊阶段（只翻入选的几十条），采集本身
 * 不再消耗 DeepL 额度，所以这里可以放得比较宽——HN AI 这类高频源一天远不止
 * 5 条，上限太低会让一周的原料缺一大块。
 */
const ITEMS_PER_SOURCE = 20
const DESCRIPTION_MAX_LENGTH = 220
const FETCH_TIMEOUT_MS = 20000

const parser = new Parser({
  timeout: 15000,
  // rss-parser 默认发送 Accept: application/rss+xml，个别源（如 InfoQ）对这个
  // 过窄的 Accept 做严格内容协商，直接 406；放宽成更通用的 XML/通配写法。
  headers: {
    'User-Agent': 'Mozilla/5.0 (ai-news-digest RSS reader)',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8',
  },
})

// XML 解析只会解码标准 XML 实体（amp/lt/gt/quot/apos）；不少 feed 把 HTML
// 内容塞进 CDATA，里面的 &rsquo; &mdash; 等 HTML 实体不会被解码，若不处理会
// 原样显示成 "AI&rsquo;s new model" 这类文本。
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '\'',
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
}

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X'
      const code = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10)
      return Number.isNaN(code) ? match : String.fromCodePoint(code)
    }
    return NAMED_HTML_ENTITIES[entity.toLowerCase()] ?? match
  })
}

function stripHtml(html: string | undefined): string {
  if (!html)
    return ''
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength)
    return text
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, '')}…`
}

function timeOrNaN(pubDate: string | undefined): number {
  return pubDate ? new Date(pubDate).getTime() : Number.NaN
}

/**
 * 把 feed 里的 pubDate 规整成 ISO 字符串。缺失或畸形一律返回 ''——
 * 快照必须是 JSON 安全的纯字符串，不能出现 Date 对象（见 types.ts 注释）。
 */
function toIsoDate(pubDate: string | undefined): string {
  const time = timeOrNaN(pubDate)
  return Number.isNaN(time) ? '' : new Date(time).toISOString()
}

export interface FetchSourceResult {
  items: SnapshotItem[]
  error: string | null
}

export async function fetchSource(source: Source): Promise<FetchSourceResult> {
  try {
    const feed = await withTimeout(parser.parseURL(source.url), FETCH_TIMEOUT_MS)
    const seenLinks = new Set<string>()
    const items: SnapshotItem[] = (feed.items || [])
      .filter((item) => {
        // 只接受 http(s) 链接（防止恶意/畸形 feed 塞入 javascript: 等危险 scheme），
        // 并按 link 去重（个别聚合 feed 会重复出现同一篇文章）。
        if (!item.link || !item.title || !/^https?:\/\//i.test(item.link))
          return false
        if (seenLinks.has(item.link))
          return false
        seenLinks.add(item.link)
        return true
      })
      .sort((a, b) => {
        const aTime = timeOrNaN(a.pubDate)
        const bTime = timeOrNaN(b.pubDate)
        // 缺失/畸形的 pubDate 会让 Date#getTime() 返回 NaN，直接参与减法比较
        // 的结果是 undefined 行为；这里显式把它们排到最后。
        if (Number.isNaN(aTime) && Number.isNaN(bTime))
          return 0
        if (Number.isNaN(aTime))
          return 1
        if (Number.isNaN(bTime))
          return -1
        return bTime - aTime
      })
      .slice(0, ITEMS_PER_SOURCE)
      .map(item => ({
        title: item.title!.trim(),
        link: item.link!,
        description: truncate(
          stripHtml(item.contentSnippet || item.content || item.summary || ''),
          DESCRIPTION_MAX_LENGTH,
        ),
        pubDate: toIsoDate(item.pubDate),
        source: source.name,
        category: source.category,
      }))

    return { items, error: null }
  }
  catch (err) {
    const message = errorMessage(err)
    console.warn(`[warn] failed to fetch "${source.name}" (${source.url}): ${message}`)
    return { items: [], error: message }
  }
}

/**
 * 并发抓取全部来源，汇总成一份当日快照。
 *
 * 单源失败被 fetchSource 内部吞掉并记进 errors，不会让整次采集失败——
 * 延续「一个坏源不拖垮全局」的既有哲学。
 */
export async function collectSnapshot(): Promise<Snapshot> {
  const sources = sourcesData as Source[]
  const results = await Promise.all(sources.map(fetchSource))

  const items: SnapshotItem[] = []
  const errors: SnapshotSourceError[] = []
  results.forEach((result, i) => {
    items.push(...result.items)
    if (result.error)
      errors.push({ source: sources[i]!.name, message: result.error })
  })

  console.log(`Collected ${items.length} items from ${sources.length - errors.length}/${sources.length} sources.`)

  return {
    collectedAt: new Date().toISOString(),
    items,
    errors,
  }
}
