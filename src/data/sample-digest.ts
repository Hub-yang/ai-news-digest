import type { DigestState } from './digest-key'

// `vite` 开发模式下页面是纯客户端渲染，没有 SSR 那一趟，也就没有机会跑
// fetchAllSources()（何况 rss-parser 也没法在浏览器里跑）。这份示例数据只
// 在 `pnpm dev` 里当兜底用，让本地开发不用等网络请求、也能快速热更新地
// 改样式/结构；生产构建里这个模块不会被打进产物（见 main.ts 里的 DEV 分支）。
export const sampleDigest: DigestState = {
  dateLabel: '2024年1月1日星期一',
  sections: [
    {
      name: '示例来源一',
      category: '官方/实验室',
      error: null,
      translated: true,
      items: [
        {
          title: '一条示例标题，用来预览标题换行和长度效果',
          link: 'https://example.com/sample-article-one',
          formattedDate: '2024年1月1日',
          description: '一段简短的占位描述文本，仅用于本地样式和布局检查——并非真实抓取的内容。',
        },
        {
          title: '另一条示例标题，这条稍短一些',
          link: 'https://example.com/sample-article-two',
          formattedDate: '2023年12月31日',
          description: '另一段占位描述文本，长度足够展示条目描述段落在布局中如何换行显示。',
        },
      ],
    },
    {
      name: '示例来源二',
      category: '科技媒体',
      error: null,
      // 故意设为 false，本地预览时可以看到 footer 里「翻译失败」的提示效果
      translated: false,
      items: [
        {
          title: '第三条示例标题，下面没有描述文本',
          link: 'https://example.com/sample-article-three',
          formattedDate: '',
          description: '',
        },
      ],
    },
    {
      name: '示例来源三（不可用）',
      category: '社区/独立博客',
      error: 'sample fetch failure for local preview',
      translated: false,
      items: [],
    },
  ],
}
