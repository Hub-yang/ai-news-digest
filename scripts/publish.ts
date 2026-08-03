import type { DateWindow } from '../src/data/build-issue'
import process from 'node:process'
import { assembleIssue } from '../src/data/assemble-issue'
import { lastCompleteWeek, recentDays } from '../src/data/build-issue'
import { listIssueNumbers, nextIssueNumber, readIssue, writeIssue } from '../src/data/content-store'
import { loadEnv } from './load-env'

loadEnv()

/**
 * 出刊：把一个时间窗口内的快照聚合成新的一期。
 *
 * 用法：
 *   pnpm publish                  接着上一期继续，截到本周一 00:00（周一出刊的默认行为）
 *   pnpm publish --recent 7       过去 7 天（冷启动出第 1 期时用）
 *   pnpm publish --skip-translation
 *   pnpm publish --dry-run        只打印结果，不写文件
 */

const args = process.argv.slice(2)

function flagValue(name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

/**
 * 默认窗口：**从上一期的结束时刻接着往下走**，一直到本周一 00:00（北京时间）。
 *
 * 不能直接用 lastCompleteWeek()——那样窗口只认「本周一往回推 7 天」，跟上一期
 * 实际覆盖到哪儿无关。某一周出刊没跑成（GitHub 的 schedule 是会被丢弃的），
 * 下周一的窗口照样只盖新的一周，漏掉那周的内容就永久丢了：快照还躺在
 * content/snapshots/ 里，但没有任何机制会回头去捡。
 *
 * 接着上一期算，正常周的行为完全一样（上一期的 endDate 就是上周一 00:00），
 * 漏了一周则下一期自动补齐；顺带也消除了与上一期的时间重叠。
 */
async function defaultWindow(): Promise<DateWindow> {
  const week = lastCompleteWeek()
  const [latest] = await listIssueNumbers()
  // 还没有任何一期（冷启动）时无从接续，回落到「上一个完整自然周」
  if (latest === undefined)
    return week
  const previous = await readIssue(latest)
  return previous ? { start: previous.endDate, end: week.end } : week
}

const recent = flagValue('--recent')
const skipTranslation = args.includes('--skip-translation')
const dryRun = args.includes('--dry-run')

const window = recent ? recentDays(Number.parseInt(recent, 10)) : await defaultWindow()
const number = await nextIssueNumber()

console.log(`Assembling issue #${number} covering ${window.start} — ${window.end}`)

const issue = await assembleIssue({ number, window, skipTranslation })

console.log(
  `  ${issue.stats.collected} items in window → ${issue.stats.published} published `
  + `across ${issue.sections.length} categories from ${issue.stats.sourceCount} sources`
  + `${issue.stats.translated ? '' : ' (untranslated — showing English)'}`,
)
for (const section of issue.sections)
  console.log(`  - ${section.category}: ${section.items.length}`)

// 一条都没选出来说明窗口选错了或原料是空的；写一期空刊没有意义，显式失败。
if (issue.stats.published === 0) {
  console.error('No items selected for this issue — refusing to publish an empty one.')
  process.exitCode = 1
}
else if (dryRun) {
  console.log('Dry run — nothing written.')
}
else {
  console.log(`Wrote ${await writeIssue(issue)}`)
}
