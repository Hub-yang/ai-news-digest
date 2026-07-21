# AI News Digest

每日自动聚合 AI 领域新闻的摘要页面。用 Vue 3 + vite-ssg 在构建期抓取 RSS 数据并渲染成标准的 Vite 静态站，通过 GitHub Actions 每天定时构建、部署到 GitHub Pages。

## 功能特性

- 聚合 8 个 AI 相关 RSS 源：OpenAI Blog、Google DeepMind Blog、Hugging Face Blog、Hacker News (AI)、TechCrunch AI、MIT Technology Review (AI)、VentureBeat AI、Ars Technica AI
- 每个源最多展示最近 5 条，按发布时间倒序排列
- 单源抓取失败不影响整体构建（详见下文「容错机制」）
- 页面结构和样式完全用 Vue SFC 编写，构建期 SSR 渲染 + 客户端 hydration，标准 Vite 多文件产物（`dist/index.html` + 独立的 CSS/JS 资源），支持浅色/深色主题自适应；页面本身目前仍无交互功能，但架构已经为将来加交互留好扩展性
- 每天自动构建并发布到 GitHub Pages，无需人工干预

## 快速开始

```bash
pnpm install              # 安装依赖
pnpm dev                   # 热更新本地开发（改样式/结构用，见下方说明）
pnpm build                # 抓取所有 RSS 源，生成 dist/ 静态站
pnpm preview               # 本地预览构建产物
```

`pnpm build` 等价于执行 `vite-ssg build`。构建完成后，静态站会写入 `dist/`（`dist/index.html` + `dist/assets/*.{css,js}`）。

**`pnpm dev` 用的是示例数据，不是真实 RSS**：抓取逻辑只在构建期（`import.meta.env.SSR` 为真）跑一次，`pnpm dev` 是纯客户端渲染的热更新开发服务器，既不会经过那趟构建期抓取，浏览器里也跑不了 `rss-parser`。所以 `main.ts` 在开发模式下会退回读 `src/data/sample-digest.ts` 里的一份固定示例数据（包含一个正常源和一个模拟失败的源，方便顺带预览"N 个源不可用"这条 footer 文案），让本地改样式/结构时不用等网络、可以直接热更新。这个兜底分支和示例数据在生产构建里会被摇树删掉，不会进最终产物。要看真实抓取数据，用 `pnpm build` + `pnpm preview`。

## 项目结构

```
.
├── index.html                 # Vite 入口 HTML
├── src/
│   ├── main.ts                # 入口：ViteSSG() + 构建期抓取数据 + provide 给组件树
│   ├── data/
│   │   ├── types.ts           # Source / FeedItem / SourceResult 类型
│   │   ├── digest-key.ts      # provide/inject 用的 InjectionKey
│   │   ├── fetch-sources.ts   # RSS 抓取、超时、容错逻辑
│   │   └── sample-digest.ts   # pnpm dev 用的示例数据（生产构建会被摇树删掉）
│   ├── components/
│   │   ├── App.vue            # 页面整体结构 + 样式（header/正文/footer）
│   │   └── SourceSection.vue  # 单个 RSS 源的一个板块 + 样式
│   ├── styles/base.css        # 全局样式（CSS 变量、reset）
│   └── utils/format-date.ts   # 条目日期格式化
├── vite.config.ts             # @vitejs/plugin-vue + ssgOptions
├── tsconfig.json
├── eslint.config.js           # @antfu/eslint-config
├── sources.json                # RSS 源配置列表
├── dist/                       # 构建产物（每次运行覆盖，未提交到仓库）
└── .github/workflows/
    └── daily-digest.yml       # 每日定时构建 + 部署到 GitHub Pages
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
   - `actions/setup-node` 准备 Node 22 环境（pnpm 11.15+ 要求 Node >= 22.13，Node 20 会导致 pnpm 缓存探测那一步崩溃）
   - `pnpm install --frozen-lockfile` 安装依赖（使用 lockfile，保证可复现）
   - `pnpm build` 并发抓取全部 RSS 源，通过 vite-ssg 渲染并生成 `dist/` 静态站
   - 用 `actions/upload-pages-artifact` 直接把 `./dist` 打包上传，作为 Pages 部署的输入

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
- Vue 3（`<script setup>` SFC）
- [`vite-ssg`](https://github.com/antfu-collective/vite-ssg)（single-page 模式，未引入 `vue-router`）：标准 Vite 静态站生成方案，构建期 SSR + 客户端 hydration
- `@unhead/vue`：管理 `<title>` 等 head 内容
- Vite + TypeScript、ESLint（`@antfu/eslint-config`）
- pnpm 作为包管理器
- 构建期 SSR + 客户端 hydration，标准 Vite 多文件产物，页面本身目前仍无交互功能，但架构已为将来加交互做好准备——没有引入测试框架

## License

未指定 License，默认保留所有权利。
