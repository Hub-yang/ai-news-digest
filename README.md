# AI News Digest

每日自动聚合 AI 领域新闻的静态摘要页面。脚本从多个 RSS 源抓取最新文章，生成一份只读、无需数据库、无需后端的静态 HTML 页面，并通过 GitHub Actions 每天定时构建、部署到 GitHub Pages。

## 功能特性

- 聚合 8 个 AI 相关 RSS 源：OpenAI Blog、Google DeepMind Blog、Hugging Face Blog、Hacker News (AI)、TechCrunch AI、MIT Technology Review (AI)、VentureBeat AI、Ars Technica AI
- 每个源最多展示最近 5 条，按发布时间倒序排列
- 单源抓取失败不影响整体构建（详见下文「容错机制」）
- 输出为单个自包含的静态 HTML 文件，内联样式，无外部依赖，支持浅色/深色主题自适应
- 每天自动构建并发布到 GitHub Pages，无需人工干预

## 快速开始

```bash
pnpm install              # 安装依赖
pnpm build                # 抓取所有 RSS 源，生成 output/digest.html
open output/digest.html   # 本地预览（macOS）
```

`pnpm build` 等价于执行 `vite-node src/build.ts`（构建期直接运行 TS/Vue 入口脚本，无需单独打包）。构建完成后，摘要页面会写入 `output/digest.html`。

## 项目结构

```
.
├── src/
│   ├── build.ts              # 入口：编排抓取 + Vue SSR 渲染 + 写文件
│   ├── data/
│   │   ├── types.ts          # Source / FeedItem / SourceResult 类型
│   │   └── fetch-sources.ts  # RSS 抓取、超时、容错逻辑
│   ├── components/
│   │   ├── App.vue           # 页面整体结构（header/正文/footer）
│   │   └── SourceSection.vue # 单个 RSS 源的一个板块
│   ├── styles/digest.css     # 内联样式的 CSS 源文件
│   └── utils/format-date.ts  # 条目日期格式化
├── vite.config.ts            # 供 vite-node 编译 .vue 文件
├── tsconfig.json
├── eslint.config.js          # @antfu/eslint-config
├── sources.json               # RSS 源配置列表
├── output/digest.html         # 构建产物（每次运行覆盖）
└── .github/workflows/
    └── daily-digest.yml      # 每日定时构建 + 部署到 GitHub Pages
```

## 自定义数据源

编辑 `sources.json`，按 `{ "name": "显示名称", "url": "RSS 地址" }` 的格式增删条目即可，无需改动脚本逻辑：

```json
{ "name": "Your Source", "url": "https://example.com/feed.xml" }
```

## 定时任务的执行机制与原理

定时任务定义在 `.github/workflows/daily-digest.yml`，由 GitHub Actions 负责调度和执行，无需任何自建服务器：

1. **触发方式**：
   - `schedule: cron: "0 0 * * *"`：每天 UTC 00:00（对应北京时间 08:00）自动触发一次
   - `push` 到 `main` 分支：代码更新后立即重新构建一次，保证线上内容与最新脚本逻辑一致
   - `workflow_dispatch`：支持在 GitHub Actions 页面手动触发，便于调试或临时刷新

2. **构建阶段（`build` job）**：
   - `actions/checkout` 拉取仓库代码
   - `pnpm/action-setup` 准备 pnpm（须在 `actions/setup-node` 之前，因为后者的 `cache: pnpm` 依赖 pnpm 已在 PATH 上）
   - `actions/setup-node` 准备 Node 20 环境
   - `pnpm install --frozen-lockfile` 安装依赖（使用 lockfile，保证可复现）
   - `pnpm build` 并发抓取全部 RSS 源，通过 Vue SSR 渲染并生成 `output/digest.html`
   - 将产物复制为 `_site/index.html`，用 `actions/upload-pages-artifact` 打包上传，作为 Pages 部署的输入

3. **部署阶段（`deploy` job）**：
   - 依赖 `build` job 完成（`needs: build`）后，使用 `actions/deploy-pages` 将打包好的 artifact 发布到 GitHub Pages
   - 通过 `environment: github-pages` 关联部署环境，可在仓库的 Deployments 页面看到每次发布记录和最终访问 URL

4. **并发控制**：`concurrency: group: "pages"` 确保同一时间只有一次 Pages 部署在进行（`cancel-in-progress: false` 表示新触发的任务会排队等待，而不是取消正在进行的部署），避免多次构建同时写入 Pages 导致状态错乱。

5. **容错机制（脚本层面，非 workflow 层面）**：
   - 每个 RSS 源的抓取都被单独 `try/catch` 包裹（`fetchSource()`），单个源失败或超时不会导致整个构建失败
   - 每次请求叠加两层超时保护：`rss-parser` 自身 15s 的 socket 超时 + 脚本额外包一层 20s 的硬超时（`withTimeout`），专门用来防止某个源长时间无响应导致 GitHub Actions 任务挂起超时
   - 页面底部会提示当天有多少个源不可用；只有当**全部**源都失败时才展示"今日暂无内容"的空状态

## 权限说明

workflow 声明了最小权限集：`contents: read`（读取代码）、`pages: write` 和 `id-token: write`（发布到 GitHub Pages 所需的 OIDC 身份验证），不涉及仓库写权限。

## 技术栈

- Node.js（原生 ESM，`type: "module"`）
- [`rss-parser`](https://www.npmjs.com/package/rss-parser) 用于解析 RSS/Atom 源
- Vue 3 + `@vue/server-renderer`：仅用于构建期把组件树渲染成 HTML 字符串（`renderToString()`），无客户端运行时、无 hydration、无路由/状态管理
- Vite + `vite-node`：免打包直接执行 `src/build.ts` 这个 TS/Vue 入口脚本
- TypeScript、ESLint（`@antfu/eslint-config`）
- pnpm 作为包管理器
- 构建期渲染，产物仍是一份零 JS 的纯静态 HTML——刻意保持轻量，没有测试框架

## License

未指定 License，默认保留所有权利。
