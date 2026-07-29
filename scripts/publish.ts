import process from 'node:process'
import { assembleIssue } from '../src/data/assemble-issue'
import { lastCompleteWeek, recentDays } from '../src/data/build-issue'
import { nextIssueNumber, writeIssue } from '../src/data/content-store'
import { loadEnv } from './load-env'

loadEnv()

/**
 * 出刊：把一个时间窗口内的快照聚合成新的一期。
 *
 * 用法：
 *   pnpm publish                  上一个完整自然周（周一出刊的默认行为）
 *   pnpm publish --recent 7       过去 7 天（冷启动出第 1 期时用）
 *   pnpm publish --skip-translation
 *   pnpm publish --dry-run        只打印结果，不写文件
 */

const args = process.argv.slice(2)

function flagValue(name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

const recent = flagValue('--recent')
const skipTranslation = args.includes('--skip-translation')
const dryRun = args.includes('--dry-run')

const window = recent ? recentDays(Number.parseInt(recent, 10)) : lastCompleteWeek()
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
