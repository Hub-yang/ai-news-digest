import process from 'node:process'
import { writeSnapshot } from '../src/data/content-store'
import { collectSnapshot } from '../src/data/fetch-sources'

/**
 * 每日采集：抓全部 RSS 源，把当天的原料落成一份快照。
 *
 * 不翻译、不构建、不部署——只负责把「今天 feed 里有什么」留存下来，
 * 供之后出刊时聚合。由 .github/workflows/collect.yml 每日调用。
 */

const snapshot = await collectSnapshot()
const path = await writeSnapshot(snapshot)

console.log(`Wrote ${path} (${snapshot.items.length} items, ${snapshot.errors.length} sources failed)`)

for (const error of snapshot.errors)
  console.warn(`  - ${error.source}: ${error.message}`)

// 全军覆没通常意味着网络/DNS 出了问题，而不是「今天真的没新闻」。
// 静默写一份空快照会让这种故障混进原料里，所以显式失败让 CI 报红。
if (snapshot.items.length === 0) {
  console.error('No items collected from any source — failing so the run is visible.')
  process.exitCode = 1
}
