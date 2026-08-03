# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm install` — install dependencies
- `pnpm dev` — runs `vite`, a hot-reloading dev server for iterating on structure/styles (renders `src/data/sample-issue.ts`, not real content — see below)
- `pnpm build` — runs `vite-ssg build`. **Reads only the local JSON under `content/`; makes zero network requests.**
- `pnpm preview` — runs `vite preview`, serving the already-built `dist/` locally
- `pnpm collect` — fetches every RSS source and writes one day's snapshot to `content/snapshots/YYYY-MM-DD.json`. The only command that touches the feeds.
- `pnpm publish-issue` — assembles a new issue into `content/issues/00N.json`, covering **from the previous issue's `endDate` up to this Monday 00:00 CST** (falls back to the last complete week when no issue exists yet). The only command that calls DeepL. Flags: `--recent <days>` (use "last N days" instead — needed for a cold start), `--skip-translation`, `--dry-run`.
- `pnpm rebuild-issue <n>` — recomputes issue `<n>` over its original window. Exists for tuning the selection parameters against real history.
- `pnpm lint` — runs ESLint (`@antfu/eslint-config`) over the repo
- `pnpm typecheck` — runs `vue-tsc --noEmit` (full project type check, including `.vue` SFC `<script>` blocks — plain `tsc` can't check those)

There is no test suite in this repo. To verify a change to the selection algorithm, run `pnpm rebuild-issue 1 --skip-translation` and inspect the resulting JSON; to verify rendering, `pnpm build` then `pnpm preview`.

**Note**: the script is `publish-issue`, not `publish` — `pnpm publish` is pnpm's own package-publishing command and would shadow the script.

**Why `pnpm dev` needs sample data**: content is loaded build-time-only, inside an `if (import.meta.env.SSR)` guard in `src/main.ts`, because it reads `content/` off the filesystem via `node:fs`. Plain `vite` dev-server sessions render client-side only, so that branch never runs there. `main.ts` has a second `else if (import.meta.env.DEV)` branch that dynamically imports `src/data/sample-issue.ts` as a fallback. `import.meta.env.DEV` is a compile-time constant Vite replaces with `false` in a production build, so that whole branch — and `sample-issue.ts` itself — gets dead-code-eliminated out of `dist/assets/*.js`; verify by grepping the built client bundle for the sample data after `pnpm build`.

## Architecture

A weekly digest ("AI 周刊"), modelled on JavaScript Weekly: `/` is the latest issue, `/issues/` lists all past issues, `/issues/N/` is permanent. Vite + Vue 3 + [`vite-ssg`](https://github.com/antfu-collective/vite-ssg) in **multi-page mode** with `vue-router`.

The central design fact: **the site has no memory of its own, so Git is the database.** RSS feeds are a sliding window — high-volume sources only retain a few hours of items — so a single fetch on publishing day cannot reconstruct a week. Instead a daily job accumulates raw material into the repo, and a weekly job turns it into an issue.

```
每日 07:23 CST   collect.yml  →  content/snapshots/YYYY-MM-DD.json  (英文原文，commit 回仓库)
每周一 08:23 CST publish.yml  →  content/issues/00N.json            (聚类+选取+翻译，commit 后部署)
代码 push        deploy.yml   →  只读本地 JSON 渲染全部期号，零网络请求
```

### The three data stages

1. **Collect** (`scripts/collect.ts` → `collectSnapshot()` in `src/data/fetch-sources.ts`) — fetches all sources concurrently, English only, no translation. Because collection no longer costs DeepL quota, `ITEMS_PER_SOURCE` is 20 rather than the old 5.
2. **Select** (`src/data/build-issue.ts`) — a pure function, no I/O: dedupe by normalized link across snapshots → filter to the issue's date window by `pubDate` → cluster same-event stories → rank → cap. See "Selection algorithm" below.
3. **Assemble** (`src/data/assemble-issue.ts`) — runs selection, then translates the ~30–48 selected items and freezes the result into the issue JSON. Shared by `publish.ts` and `rebuild-issue.ts`.

### Rendering

- `src/main.ts` calls `ViteSSG(App, { routes, base }, callback)`. **`base` must be passed** (`import.meta.env.BASE_URL`) — the site is served from `/ai-news-digest/`, and without it vue-router's history base is `/`, so in the browser no route matches and `RouterView` renders *nothing*. SSR still looks fine because vite-ssg renders each route path directly, so this failure mode only shows up in a browser.
- vite-ssg calls the SSR entry's `createApp(routePath)` **once per route** and serializes `initialState` into *that route's* HTML (`vite-ssg/dist/shared/*.mjs`, and `routePath` is on the callback context). So `loadPageData(routePath)` (`src/data/load-content.ts`) loads only the page's own data — **52 issues do not end up in the client bundle**.
- Cross-issue navigation deliberately uses plain `<a>` (`siteUrl()` in `src/utils/site-url.ts`), not `RouterLink`. Every page is fully pre-rendered, so a full page load needs zero runtime data fetching; client-side routing would have to re-fetch the target issue's JSON at runtime and break the "pure static" property.
- `vite.config.ts`'s `ssgOptions.includedRoutes` enumerates `/issues/N/` by reading `content/issues/`; vite-ssg cannot discover dynamic routes on its own.
- `src/components/CategoryNav.vue` is an **anchor table of contents**, not a filter — an issue is a complete read, so clicking a category scrolls to that section rather than hiding the rest.

**`content-store.ts` resolves paths from `process.cwd()`, not `import.meta.url`** — the SSR build bundles that module into `.vite-ssg-temp/<hash>/assets/`, so anything relative to `import.meta.url` lands in the temp dir and silently reads zero issues (the page then renders "还没有发布任何一期" with no error).

**Critical correctness detail — do not put `Date` objects into `content/` JSON or `initialState`**: both cross the SSR→client boundary via JSON serialization, so a `Date` arrives in the browser as a plain string with its prototype (and `.toLocaleDateString()`) gone. Vue 3 hydration re-runs render functions against the existing DOM, so a template formatting a date at render time would throw. This is why `IssueItem` carries `formattedDate: string` and snapshots carry `pubDate` as an ISO **string**. Keep any new build-time-computed field JSON-safe.

### Selection algorithm (`src/data/build-issue.ts`)

Ranking signal is **"reported by multiple outlets = important"**, so same-event clustering has to work for the ranking to mean anything.

- Similarity is **IDF-weighted Jaccard over title tokens**, not plain Jaccard. Plain token overlap cannot separate signal from noise here: `ai` appears in ~half of all titles while `hugging`/`face` appear in a handful, and weighting them equally puts unrelated stories at the same score as genuine co-coverage.
- `CLUSTER_THRESHOLD = 0.18` is **measured, not guessed**. On 110 real titles, genuine cross-source pairs scored 0.155–0.187 while the one false pair scored 0.169 — the ranges *overlap*, so no threshold is both complete and correct. 0.18 sits at the top of the true range: prefer missing a merge over showing two unrelated stories merged into one. Expect only ~1–2 merges per issue. **Re-measure with `pnpm rebuild-issue` before changing it.**
- Clustering compares each item only against each cluster's *representative*, never all members — comparing against members causes chain merges (A≈B, B≈C ⇒ A and C in one cluster despite being unrelated).
- `ITEMS_PER_SOURCE_IN_CATEGORY = 4` caps how much one source can occupy in a category. Without it a high-volume link blog took 9 of 12 slots in 社区/独立博客 and the page read like one person's timeline.
- `sources.json` entries carry an optional `priority` (default 1) used to pick a cluster's representative and to break ranking ties.
- Items with no `pubDate` are dropped — there's no way to tell which issue they belong to, and keeping them would make the same item reappear every week.

Key points for anyone modifying this:

- **Per-source isolation**: `fetchSource()` catches errors per source so one broken/slow feed doesn't fail collection; failures are recorded in the snapshot's `errors` array. `collect.ts` only fails the job when *every* source returned nothing (that means a network/DNS problem, not a slow news day).
- **Hard timeout**: `withTimeout()` (`src/utils/network.ts`) wraps each `parser.parseURL()` with a 20s race on top of the parser's own 15s socket timeout, specifically so a hanging feed can't hang the Actions job. Keep both.
- **No manual HTML escaping**: Vue's `{{ }}` and `:href` auto-escape at SSR render time via `@vue/compiler-ssr`.
- TypeScript is checked via ESLint's type-aware rules and `pnpm typecheck` (`vue-tsc --noEmit`) — the latter runs on every commit via `lint-staged` (wrapped in `bash -c` so lint-staged's auto-appended file args don't make `vue-tsc` bypass `tsconfig.json`) and again as a dedicated CI step before `pnpm build`.
- `@unhead/vue`'s version is pinned to match exactly what `vite-ssg` depends on internally (check with `pnpm why @unhead/vue`) — two instances would mean two head-tag registries, silently breaking `useHead()`.
- ESLint ignores `content/**`: it's fetched data, not source, and feed text legitimately contains characters that trip `no-irregular-whitespace`.
- `pnpm-workspace.yaml` exists only to carry `allowBuilds: esbuild: true` (tsx's dependency needs its install script; otherwise pnpm aborts with `ERR_PNPM_IGNORED_BUILDS`). The `pnpm/yaml-enforce-settings` ESLint rule is **disabled** for that file: it writes `trustPolicy: no-downgrade`, which makes `undici-types@6.21.0` (a transitive dep of the pinned `@types/node`) fail to install with `ERR_PNPM_TRUST_DOWNGRADE`. Enabling it requires bumping `@types/node` first.

### Translation (DeepL)

Static UI copy is hardcoded Chinese in the components; dates use `toLocaleDateString('zh-CN', …)`. Only `IssueItem.title`/`description` come from RSS and actually need translating.

**Translation happens at publish time, on selected items only** — not at collection time. This is deliberate and load-bearing: collecting 14 sources × 5 items × ~280 chars daily came to ~588k chars/month, over DeepL Free's 500k limit (and every `push` to main re-ran it). Translating only what gets published costs ~13k chars/week, and because the result is frozen into the issue JSON, **rebuilding the site never re-translates anything**.

- `src/data/translate.ts` exports `translateTexts(texts)`, called once per section from `assemble-issue.ts` (≤ 24 texts per request, well under DeepL's 50-text cap). Batching per section means one failed batch only costs that section its Chinese.
- Reads `process.env.DEEPL_API_KEY`. **No key → return input unchanged, no error**, so `pnpm build` and forks stay green. Timeouts/non-2xx/network errors are caught the same way and fall back to English. Failures are `console.warn`'d, never thrown. `Issue.stats.translated` carries this through to the reader-facing notice.
- Source names in `sources.json` are deliberately left untranslated — they're brand names.
- **Local `.env` loading**: `vite.config.ts` calls `process.loadEnvFile()` for `pnpm build`/`dev`, and `scripts/load-env.ts` does the same for the `tsx`-run scripts — those don't go through Vite at all, so without it a local `pnpm publish-issue` would silently take the "no key" path.

## CI/CD

Three workflows, split by what actually needs to happen:

| workflow | trigger | does | permissions |
|---|---|---|---|
| `collect.yml` | cron `23 23 * * *` (07:23 CST), manual | `pnpm collect` → commit. No build, no deploy. | `contents: write` |
| `publish.yml` | cron `23 0 * * 1` (Mon 08:23 CST), manual | `pnpm publish-issue` → commit → calls `deploy.yml` | `contents: write` + Pages |
| `deploy.yml` | push to `main` (`paths-ignore: content/**`), manual, `workflow_call` | typecheck → build → Pages + rsync to server | Pages, `id-token: write` |

- **No build loop**: GitHub does not trigger workflows for commits pushed with `GITHUB_TOKEN`, so the content commits can't retrigger a build. `paths-ignore: content/**` is a second line of defence.
- **`deploy.yml` checks out `ref: ${{ github.ref_name }}`, not the triggering SHA** — when called from `publish.yml`, the new issue's commit is pushed *after* the run started, so the default SHA would build a site without it.
- Publishing is scheduled an hour after collection so it picks up that morning's snapshot.
- Both content-writing workflows share `concurrency: group: content` and `git pull --rebase` before pushing, so they can't collide on `main`.
- `workflow_dispatch` on `publish.yml` takes a `recent_days` input — that's the cold-start path (`--recent 7`) for producing issue #1 before a full week of snapshots exists.
- **Both crons sit at minute 23, not on the hour.** GitHub *drops* scheduled triggers during peak load rather than deferring them, and the top of the hour — especially UTC midnight — is the busiest slot. `publish.yml`'s original `0 0 * * 1` never fired on the first Monday it was due; issue #2 had to be dispatched by hand. Don't move either cron back to `:00`.
- **A dropped publish does not lose a week**: `scripts/publish.ts` starts the window at the *previous issue's* `endDate` rather than recomputing "last complete week", so a missed Monday is swept up by the next one. Keep that property when touching the window logic — `lastCompleteWeek()` alone would silently drop the skipped week's snapshots forever.

**pnpm is pinned to an exact version** (`pnpm/action-setup`'s `version: 11.15.1`, not a floating `11`) and Node is pinned to 22 (pnpm 11.15+ requires Node >= 22.13 and crashes during `setup-node`'s pnpm-cache probing on Node 20). This pinning was added after CI actually failed on both counts. Also be aware pnpm 11.15+ enforces a `minimumReleaseAge` supply-chain check on `--frozen-lockfile` installs — if a dependency resolved to a very recently published version, CI can reject the lockfile with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` even though the same lockfile installed fine locally minutes earlier. If this happens, `pnpm clean --lockfile && pnpm install` to re-resolve, then re-verify with `pnpm install --frozen-lockfile` before pushing.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (Hub-yang/ai-news-digest), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
