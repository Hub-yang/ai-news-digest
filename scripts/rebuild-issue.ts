import process from 'node:process'
import { assembleIssue } from '../src/data/assemble-issue'
import { readIssue, writeIssue } from '../src/data/content-store'
import { loadEnv } from './load-env'

loadEnv()

/**
 * 用现有快照重算某一期，沿用它原本的时间窗口。
 *
 * 存在的意义是调参：聚类阈值、来源权重、每类条数这些都要试几轮才合适，
 * 有快照在手就能拿历史期直接验证效果，而不用等下一个周一。
 *
 *   pnpm rebuild-issue 3
 *   pnpm rebuild-issue 3 --skip-translation
 */

const args = process.argv.slice(2)
const number = Number.parseInt(args[0] ?? '', 10)

if (!Number.isInteger(number) || number < 1) {
  console.error('Usage: pnpm rebuild-issue <number> [--skip-translation]')
  process.exit(1)
}

const existing = await readIssue(number)
if (!existing) {
  console.error(`Issue #${number} does not exist.`)
  process.exit(1)
}

console.log(`Rebuilding issue #${number} over its original window ${existing.startDate} — ${existing.endDate}`)

const issue = await assembleIssue({
  number,
  window: { start: existing.startDate, end: existing.endDate },
  skipTranslation: args.includes('--skip-translation'),
})

console.log(
  `  was ${existing.stats.published} items / now ${issue.stats.published} items `
  + `(${issue.stats.collected} in window)`,
)

if (issue.stats.published === 0) {
  console.error('Rebuild produced an empty issue — leaving the existing one untouched.')
  process.exit(1)
}

console.log(`Wrote ${await writeIssue(issue)}`)
