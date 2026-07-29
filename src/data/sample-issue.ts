import type { ArchivePage, IssuePage } from './page-key'

// `vite` 开发模式下页面是纯客户端渲染，没有 SSR 那一趟，也就没有机会读
// content/ 下的 JSON（何况 node:fs 也没法在浏览器里跑）。这份示例数据只在
// `pnpm dev` 里当兜底用，让本地改样式/结构时不用等构建；生产构建里这个模块
// 会被摇树删掉（见 main.ts 里的 DEV 分支）。

export const sampleIssuePage: IssuePage = {
  kind: 'issue',
  prev: 2,
  next: null,
  total: 3,
  issue: {
    number: 3,
    startDate: '2026-07-26T16:00:00.000Z',
    endDate: '2026-08-02T15:59:59.999Z',
    dateLabel: '2026年7月27日 — 8月2日',
    publishedAt: '2026-08-03T00:00:00.000Z',
    stats: { collected: 118, published: 5, sourceCount: 4, translated: true },
    sections: [
      {
        category: '官方/实验室',
        items: [
          {
            title: 'A sample headline used to preview title wrapping and length',
            titleZh: '一条示例标题，用来预览标题换行和长度效果',
            link: 'https://example.com/sample-article-one',
            formattedDate: '2026年7月28日',
            description: 'A short placeholder description, used only to check local styling and layout — not real fetched content.',
            descriptionZh: '一段简短的占位描述文本，仅用于本地样式和布局检查——并非真实抓取的内容。',
            source: 'OpenAI Blog',
            // 有「另有 N 家报道」的样子，本地能直接预览署名行的两种形态
            alsoReportedBy: ['TechCrunch AI', 'Ars Technica AI'],
          },
          {
            title: 'Another sample headline, a bit shorter',
            titleZh: '另一条示例标题，这条稍短一些',
            link: 'https://example.com/sample-article-two',
            formattedDate: '2026年7月27日',
            description: 'Another placeholder description, long enough to show how the item description paragraph wraps in the layout.',
            descriptionZh: '另一段占位描述文本，长度足够展示条目描述段落在布局中如何换行显示。',
            source: 'Google DeepMind Blog',
            alsoReportedBy: [],
          },
        ],
      },
      {
        category: '科技媒体',
        items: [
          {
            title: 'A third sample headline, with no description below',
            titleZh: '第三条示例标题，下面没有摘要',
            link: 'https://example.com/sample-article-three',
            formattedDate: '2026年7月30日',
            description: '',
            descriptionZh: '',
            source: 'TechCrunch AI',
            alsoReportedBy: [],
          },
        ],
      },
      {
        category: '社区/独立博客',
        items: [
          {
            title: 'A community post used to preview the third section',
            titleZh: '一条社区文章，用来预览第三个板块',
            link: 'https://example.com/sample-article-four',
            formattedDate: '2026年7月31日',
            description: 'Placeholder text for the community section.',
            descriptionZh: '社区板块的占位文本。',
            source: 'Simon Willison\'s Weblog',
            alsoReportedBy: [],
          },
        ],
      },
    ],
  },
}

export const sampleArchivePage: ArchivePage = {
  kind: 'archive',
  issues: [
    { number: 3, startDate: '2026-07-26T16:00:00.000Z', endDate: '2026-08-02T15:59:59.999Z', dateLabel: '2026年7月27日 — 8月2日', publishedAt: '2026-08-03T00:00:00.000Z', itemCount: 5 },
    { number: 2, startDate: '2026-07-19T16:00:00.000Z', endDate: '2026-07-26T15:59:59.999Z', dateLabel: '2026年7月20日 — 26日', publishedAt: '2026-07-27T00:00:00.000Z', itemCount: 31 },
    { number: 1, startDate: '2026-07-12T16:00:00.000Z', endDate: '2026-07-19T15:59:59.999Z', dateLabel: '2026年7月13日 — 19日', publishedAt: '2026-07-20T00:00:00.000Z', itemCount: 28 },
  ],
}
