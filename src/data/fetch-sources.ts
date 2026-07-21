import type { FeedItem, Source, SourceResult } from './types'
import Parser from 'rss-parser'

const ITEMS_PER_SOURCE = 5
const DESCRIPTION_MAX_LENGTH = 220
const FETCH_TIMEOUT_MS = 20000

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (ai-news-digest RSS reader)' },
})

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)),
  ])
}

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

function errorMessage(err: unknown): string {
  const e = err as { message?: string, code?: string }
  return e?.message || e?.code || String(err) || 'Unknown error'
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
        pubDate: item.pubDate ? new Date(item.pubDate) : null,
        description: truncate(
          stripHtml(item.contentSnippet || item.content || item.summary || ''),
          DESCRIPTION_MAX_LENGTH,
        ),
      }))
    return { name: source.name, items, error: null }
  }
  catch (err) {
    const message = errorMessage(err)
    console.warn(`[warn] failed to fetch "${source.name}" (${source.url}): ${message}`)
    return { name: source.name, items: [], error: message }
  }
}
