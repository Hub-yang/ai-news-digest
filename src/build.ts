import type { Source } from './data/types'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { renderToString } from '@vue/server-renderer'
import { createSSRApp } from 'vue'
import App from './components/App.vue'
import { fetchSource } from './data/fetch-sources'
import cssRules from './styles/digest.css?raw'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')

async function main() {
  const sourcesPath = path.join(repoRoot, 'sources.json')
  const sources: Source[] = JSON.parse(await readFile(sourcesPath, 'utf-8'))

  const results = await Promise.all(sources.map(fetchSource))

  const succeeded = results.filter(r => !r.error).length
  console.log(`Fetched ${succeeded}/${sources.length} sources successfully.`)

  const generatedAt = new Date()
  const dateLabel = generatedAt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const app = createSSRApp(App, { sections: results, dateLabel })
  const bodyHtml = await renderToString(app)

  const html = `<title>Daily AI Digest — ${dateLabel}</title>\n<style>\n${cssRules}</style>\n${bodyHtml}\n`

  const outputDir = path.join(repoRoot, 'output')
  await mkdir(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, 'digest.html')
  await writeFile(outputPath, html, 'utf-8')

  console.log(`Digest written to ${outputPath}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error building digest:', err)
    process.exit(1)
  })
