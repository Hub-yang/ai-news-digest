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
  headers: { 'User-Agent': 'Mozilla/5.0 (ai-news-digest RSS reader)' },
})

function stripHtml(html: string | undefined): string {
  if (!html)
    return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength)
    return text
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, '')}…`
}

export async function fetchSource(source: Source): Promise<SourceResult> {
  try {
    const feed = await withTimeout(parser.parseURL(source.url), FETCH_TIMEOUT_MS)
    const items: FeedItem[] = (feed.items || [])
      .filter(item => item.link && item.title)
      .sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime())
      .slice(0, ITEMS_PER_SOURCE)
      .map(item => ({
        title: item.title!.trim(),
        link: item.link!,
        formattedDate: formatDate(item.pubDate ? new Date(item.pubDate) : null),
        description: truncate(
          stripHtml(item.contentSnippet || item.content || item.summary || ''),
          DESCRIPTION_MAX_LENGTH,
        ),
      }))

    const texts = items.flatMap(item => [item.title, item.description])
    const translated = await translateTexts(texts)
    items.forEach((item, i) => {
      item.title = translated[i * 2] || item.title
      item.description = translated[i * 2 + 1] || item.description
    })

    return { name: source.name, items, error: null }
  }
  catch (err) {
    const message = errorMessage(err)
    console.warn(`[warn] failed to fetch "${source.name}" (${source.url}): ${message}`)
    return { name: source.name, items: [], error: message }
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
