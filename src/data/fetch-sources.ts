import type { DigestState } from './digest-key'
import type { FeedItem, Source, SourceResult } from './types'
import Parser from 'rss-parser'
import sourcesData from '../../sources.json'
import { formatDate } from '../utils/format-date'
import { errorMessage, withTimeout } from '../utils/network'
import { translateTexts } from './translate'

const ITEMS_PER_SOURCE = 5
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

export async function fetchSource(source: Source): Promise<SourceResult> {
  try {
    const feed = await withTimeout(parser.parseURL(source.url), FETCH_TIMEOUT_MS)
    const seenLinks = new Set<string>()
    const items: FeedItem[] = (feed.items || [])
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
      .map((item) => {
        const title = item.title!.trim()
        const description = truncate(
          stripHtml(item.contentSnippet || item.content || item.summary || ''),
          DESCRIPTION_MAX_LENGTH,
        )
        // titleZh/descriptionZh 先临时等于原文，翻译成功后在下面统一回填；
        // 翻译失败/无 key 时保持原样，即页面默认展示的英文原文。
        return {
          title,
          titleZh: title,
          link: item.link!,
          formattedDate: formatDate(item.pubDate ? new Date(item.pubDate) : null),
          description,
          descriptionZh: description,
        }
      })

    const texts = items.flatMap(item => [item.title, item.description])
    const { texts: translatedTexts, translated } = await translateTexts(texts)
    items.forEach((item, i) => {
      item.titleZh = translatedTexts[i * 2] || item.title
      item.descriptionZh = translatedTexts[i * 2 + 1] || item.description
    })

    return { name: source.name, category: source.category, items, error: null, translated }
  }
  catch (err) {
    const message = errorMessage(err)
    console.warn(`[warn] failed to fetch "${source.name}" (${source.url}): ${message}`)
    return { name: source.name, category: source.category, items: [], error: message, translated: false }
  }
}

// vite-ssg invokes the SSR entry's createApp() twice per build (once to discover
// routes, once to render the page) — memoize so the RSS sources only get fetched once.
let digestPromise: Promise<DigestState> | undefined

export function fetchAllSources(): Promise<DigestState> {
  digestPromise ??= (async () => {
    const sources = sourcesData as Source[]
    const sections = await Promise.all(sources.map(fetchSource))

    const succeeded = sections.filter(r => !r.error).length
    console.log(`Fetched ${succeeded}/${sources.length} sources successfully.`)

    const dateLabel = new Date().toLocaleDateString('zh-CN', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    return { sections, dateLabel }
  })()

  return digestPromise
}
