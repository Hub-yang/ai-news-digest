import type { DateWindow } from './build-issue'
import type { Issue, IssueSection } from './types'
import { formatWindowLabel, selectIssueItems } from './build-issue'
import { readSnapshotItems } from './content-store'
import { translateTexts } from './translate'

/**
 * 组装一期周刊：读原料 → 去重/聚类/选取 → 翻译入选条目 → 返回成品。
 *
 * 只组装不落盘，publish 与 rebuild-issue 共用；两者的差别仅在于窗口和期号
 * 从哪里来。
 */

/**
 * 逐个板块翻译。一个板块最多 12 条 = 24 段文本，远低于 DeepL 单请求 50 段的
 * 上限；分板块发也让某一批失败时只影响那个板块，其余仍是中文。
 */
async function translateSection(section: IssueSection): Promise<boolean> {
  const texts = section.items.flatMap(item => [item.title, item.description])
  const { texts: translated, translated: ok } = await translateTexts(texts)

  section.items.forEach((item, i) => {
    item.titleZh = translated[i * 2] || item.title
    item.descriptionZh = translated[i * 2 + 1] || item.description
  })

  return ok
}

export interface AssembleOptions {
  number: number
  window: DateWindow
  /** 跳过翻译（本地调参时用，避免白烧额度） */
  skipTranslation?: boolean
}

export async function assembleIssue({ number, window, skipTranslation }: AssembleOptions): Promise<Issue> {
  const rawItems = await readSnapshotItems(window)
  const { sections, collected, published, sourceCount } = selectIssueItems(rawItems, window)

  let translated = false
  if (!skipTranslation && sections.length > 0) {
    const results = await Promise.all(sections.map(translateSection))
    // 只要有一个板块没翻成，就在页脚如实提示读者看到的是英文原文
    translated = results.every(Boolean)
  }

  return {
    number,
    startDate: window.start,
    endDate: window.end,
    dateLabel: formatWindowLabel(window),
    publishedAt: new Date().toISOString(),
    sections,
    stats: { collected, published, sourceCount, translated },
  }
}
