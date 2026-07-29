import type { RouteRecordRaw } from 'vue-router'
import type { PageData } from './data/page-key'
import { ViteSSG } from 'vite-ssg'
import App from './components/App.vue'
import { pageKey } from './data/page-key'
import './styles/base.css'

const IssueView = () => import('./components/IssueView.vue')

const routes: RouteRecordRaw[] = [
  // 首页就是最新一期，和 /issues/N/ 复用同一个组件
  { path: '/', name: 'latest', component: IssueView },
  { path: '/issues/', name: 'archive', component: () => import('./components/ArchiveView.vue') },
  { path: '/issues/:number(\\d+)/', name: 'issue', component: IssueView },
]

export const createApp = ViteSSG(App, {
  routes,
  // 站点部署在 /ai-news-digest/ 子路径下。不传 base 的话 history base 是 '/'，
  // 浏览器里 /ai-news-digest/issues/1/ 匹配不到任何路由，RouterView 会静默渲染成
  // 空——SSR 阶段 vite-ssg 是直接按路由路径渲染的，所以这个问题只在浏览器里暴露。
  base: import.meta.env.BASE_URL,
}, async ({ app, initialState, routePath }) => {
  if (import.meta.env.SSR) {
    // 动态 import 确保 content-store 的 node:fs 依赖不会被打进客户端 bundle
    const { loadPageData } = await import('./data/load-content')
    initialState.page = await loadPageData(routePath ?? '/')
  }
  else if (import.meta.env.DEV) {
    // `vite` 开发模式是纯客户端渲染，没有上面那趟 SSR，用示例数据兜底。
    // import.meta.env.DEV 在生产构建里是编译期常量 false，这个分支和
    // sample-issue.ts 都会被摇树删掉，不会进最终产物。
    const { sampleIssuePage, sampleArchivePage } = await import('./data/sample-issue')
    initialState.page = location.pathname.includes('/issues/') && !/\/issues\/\d+/.test(location.pathname)
      ? sampleArchivePage
      : sampleIssuePage
  }

  // vite-ssg 会把 initialState 序列化进每一页的 HTML，客户端 hydration 前就已
  // 填好，所以这里无条件 provide 即可。每页只带自己那一份数据——往期正文不会
  // 进客户端 bundle。
  app.provide(pageKey, initialState.page as PageData)
})
