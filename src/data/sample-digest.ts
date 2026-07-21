import type { DigestState } from './digest-key'

// `vite` 开发模式下页面是纯客户端渲染，没有 SSR 那一趟，也就没有机会跑
// fetchAllSources()（何况 rss-parser 也没法在浏览器里跑）。这份示例数据只
// 在 `pnpm dev` 里当兜底用，让本地开发不用等网络请求、也能快速热更新地
// 改样式/结构；生产构建里这个模块不会被打进产物（见 main.ts 里的 DEV 分支）。
export const sampleDigest: DigestState = {
  dateLabel: 'Monday, January 1, 2024',
  sections: [
    {
      name: 'Sample Source One',
      error: null,
      items: [
        {
          title: 'A sample headline to preview title wrapping and length',
          link: 'https://example.com/sample-article-one',
          formattedDate: 'Jan 1, 2024',
          description: 'A short placeholder description used only for local styling and layout checks — it is not real fetched content.',
        },
        {
          title: 'Another sample headline, this one a bit shorter',
          link: 'https://example.com/sample-article-two',
          formattedDate: 'Dec 31, 2023',
          description: 'Another placeholder description, long enough to show how the item-desc paragraph wraps across a couple of lines in the layout.',
        },
      ],
    },
    {
      name: 'Sample Source Two',
      error: null,
      items: [
        {
          title: 'A third sample headline with no description below it',
          link: 'https://example.com/sample-article-three',
          formattedDate: '',
          description: '',
        },
      ],
    },
    {
      name: 'Sample Source Three (unavailable)',
      error: 'sample fetch failure for local preview',
      items: [],
    },
  ],
}
