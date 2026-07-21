import type { DigestState } from './data/digest-key'
import { ViteSSG } from 'vite-ssg/single-page'
import App from './components/App.vue'
import { digestKey } from './data/digest-key'
import './styles/base.css'

export const createApp = ViteSSG(App, async ({ app, initialState }) => {
  if (import.meta.env.SSR) {
    // 动态 import 确保 rss-parser 及其 Node 内置依赖不会被打进客户端 bundle
    const { fetchAllSources } = await import('./data/fetch-sources')
    initialState.digest = await fetchAllSources()
  }
  else if (import.meta.env.DEV) {
    // `vite` 开发模式是纯客户端渲染，没有上面那趟 SSR，用示例数据兜底。
    // import.meta.env.DEV 在生产构建里是编译期常量 false，这个分支和
    // sample-digest.ts 都会被摇树删掉，不会进最终产物。
    const { sampleDigest } = await import('./data/sample-digest')
    initialState.digest = sampleDigest
  }
  app.provide(digestKey, initialState.digest as DigestState)
})
