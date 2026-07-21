# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm install` — install dependencies
- `pnpm dev` — runs `vite`, a hot-reloading dev server for iterating on structure/styles (renders `src/data/sample-digest.ts`, not real RSS data — see below)
- `pnpm build` — runs `vite-ssg build`, fetching all RSS sources at build time and writing a standard Vite static site to `dist/`
- `pnpm preview` — runs `vite preview`, serving the already-built `dist/` locally
- `pnpm lint` — runs ESLint (`@antfu/eslint-config`) over the repo

There is no test suite in this repo. To verify a change touching real fetch/build behavior, use `pnpm build` followed by `pnpm preview` — `pnpm dev` never runs the real RSS fetch (see below), so it's only useful for markup/CSS iteration.

**Why `pnpm dev` needs sample data**: the digest data is fetched build-time-only, inside an `if (import.meta.env.SSR)` guard in `src/main.ts`. Plain `vite` dev-server sessions render client-side only (`import.meta.env.SSR` is `false` in the browser), so that branch never runs there — and `rss-parser` couldn't run in a browser anyway. `main.ts` has a second `else if (import.meta.env.DEV)` branch that dynamically imports `src/data/sample-digest.ts` (a small hardcoded `DigestState`, including one errored source so the "N unavailable" footer wording is exercisable) as a fallback so `pnpm dev` has something to render and hot-reload against, instantly, without hitting the network. `import.meta.env.DEV` is a compile-time constant Vite replaces with `false` in a production build, so that whole branch — and `sample-digest.ts` itself — gets dead-code-eliminated out of `dist/assets/*.js`; verified by grepping the built client bundle for the sample data's content after `pnpm build`.

## Architecture

Standard Vite + Vue 3 static site built with [`vite-ssg`](https://github.com/antfu-collective/vite-ssg) (single-page mode — `vite-ssg/single-page`, no `vue-router`). Unlike a typical SPA, this **is not zero-JS anymore**: the client bundle hydrates the page in the browser. There's still no actual interactivity implemented, but the architecture no longer forbids it the way the previous single-file-string build did.

1. `src/main.ts` is the entry: `ViteSSG(App, async ({ app, initialState }) => { ... })`. The setup callback is awaited by vite-ssg before the page is rendered/serialized, so build-time async work belongs here.
2. Inside `if (import.meta.env.SSR)`, it **dynamically imports** `src/data/fetch-sources.ts` and calls `fetchAllSources()` (reads `sources.json` via a JSON import, fetches all RSS sources concurrently, computes `dateLabel`). The dynamic import is required, not stylistic — `rss-parser` pulls in Node built-ins that must never end up in the client bundle; a static top-level import would let them leak into the client chunk graph even though the code path never executes there.
3. The fetched result is stashed on `initialState.digest` (SSR only) and provided to the component tree via `app.provide(digestKey, ...)`. `initialState` is vite-ssg's SSR→client bridge: it gets serialized into the generated HTML and is already repopulated by the time this callback runs on the client, so `app.provide(digestKey, initialState.digest as DigestState)` works unconditionally.
4. `src/components/App.vue` reads the data via `inject(digestKey)`, sets `<title>` via `@unhead/vue`'s `useHead()`, and renders one `src/components/SourceSection.vue` per non-empty source.
5. Styling lives in real per-component `<style scoped>` blocks (`App.vue`, `SourceSection.vue`) plus `src/styles/base.css` for the truly global bits (`:root` theme variables, dark-mode media query, `*`/`body` reset) — imported normally from `main.ts`, no more raw-string CSS concatenation.

**Critical correctness detail — do not reintroduce `Date` objects into `initialState`**: `initialState` crosses the SSR→client boundary via JSON serialization, so any `Date` object placed on it arrives in the browser as a plain string, with its prototype (and `.toLocaleDateString()`) gone. Vue 3 hydration re-runs each component's render function against the existing DOM, so a template that called `formatDate(item.pubDate)` on a post-hydration string would throw. This is why `FeedItem` has `formattedDate: string`, not `pubDate: Date` — every date is formatted once, at fetch time in `fetchSource()` (`src/data/fetch-sources.ts`), before it's anywhere near `initialState`. If you add new build-time-computed fields to the digest data, keep them JSON-safe (strings/numbers/plain objects/arrays) for the same reason.

Key points for anyone modifying this:

- **Per-source isolation**: `fetchSource()` (`src/data/fetch-sources.ts`) catches errors per source so one broken/slow feed doesn't fail the whole build. Each source result carries its own `error` field; `App.vue`'s footer notes how many sources were unavailable, and shows an empty-state message only if _every_ source has zero items — a failed source is silently absent from the body but still counted in the footer.
- **Hard timeout**: `withTimeout()` wraps each `parser.parseURL()` call with a 20s (`FETCH_TIMEOUT_MS`) race, on top of the parser's own 15s socket timeout — this exists specifically to stop a hanging feed from hanging the GitHub Actions job indefinitely. The timer is explicitly cleared once the underlying promise settles either way — without that, `vite-ssg build` (which no longer ends with our own `process.exit(0)`) has to force-exit after a lingering-handle grace period. Keep both timeouts (and the `clearTimeout`) if you touch fetch logic.
- **`fetchAllSources()` is memoized**: `vite-ssg build` invokes the SSR entry's `createApp()` twice per build (once to discover routes, once to render the page) even in single-page mode — without memoization this would hit every RSS source twice per build. The memoized promise in `src/data/fetch-sources.ts` ensures the actual network fetch only happens once.
- **No manual HTML escaping**: Vue's template text interpolation (`{{ }}`) and attribute bindings (`:href`) auto-escape at SSR render time via `@vue/compiler-ssr`.
- **Output is a standard Vite static site** (`dist/index.html` + `dist/assets/*.{css,js}`), deployed as-is to GitHub Pages via `upload-pages-artifact` pointed at `./dist`.
- Item limit per source (`ITEMS_PER_SOURCE = 5`) and description truncation length (`DESCRIPTION_MAX_LENGTH = 220`), both in `src/data/fetch-sources.ts`, are the two tunables most likely to come up in feature requests.
- TypeScript is checked only via ESLint's type-aware rules and Vite's esbuild strip (no type errors block the build) — there is no separate `tsc --noEmit`/`vue-tsc` step.
- `@unhead/vue`'s version is pinned to match exactly what `vite-ssg` depends on internally (check with `pnpm why @unhead/vue`) — two different instances would mean two separate head-tag registries, silently breaking `useHead()`.

## CI/CD

`.github/workflows/daily-digest.yml` runs on a daily cron (00:00 UTC / 08:00 Asia/Shanghai), on push to `main`, and on manual dispatch. It does `pnpm install --frozen-lockfile` → `pnpm build` → uploads `./dist` directly via `upload-pages-artifact` → deploys to GitHub Pages. There is no separate staging environment — every push to `main` redeploys the live page.
