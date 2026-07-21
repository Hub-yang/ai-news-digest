# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm install` — install dependencies
- `pnpm build` — runs `vite-node src/build.ts`, fetching all RSS sources and writing `output/digest.html`
- `pnpm lint` — runs ESLint (`@antfu/eslint-config`) over the repo

There is no test suite or dev server in this repo. The only way to verify a change is to run the build and inspect `output/digest.html`.

## Architecture

Build-time Vue SSG, still producing one flat static HTML file — there is no client-side JS, hydration, router, or store. `src/build.ts` orchestrates everything and is run directly via `vite-node` (no separate bundle/dist step):

1. Reads `sources.json` (list of `{name, url}` RSS feeds) and fetches them concurrently via `src/data/fetch-sources.ts` (`rss-parser`).
2. Renders the markup by mounting `src/components/App.vue` (which renders one `src/components/SourceSection.vue` per non-empty source) with `createSSRApp()` + `@vue/server-renderer`'s `renderToString()`.
3. Concatenates `<title>` + the CSS from `src/styles/digest.css` (imported as a raw string via Vite's `?raw` suffix — SFC `<style>` blocks are *not* included in `renderToString()` output, so the CSS deliberately lives outside any `.vue` file) + the rendered markup, and writes the result to `output/digest.html`.

Key points for anyone modifying this:

- **Per-source isolation**: `fetchSource()` (`src/data/fetch-sources.ts`) catches errors per source so one broken/slow feed doesn't fail the whole build. Each source result carries its own `error` field; `App.vue`'s footer notes how many sources were unavailable, and shows an empty-state message only if *every* source has zero items — a failed source is silently absent from the body but still counted in the footer.
- **Hard timeout**: `withTimeout()` wraps each `parser.parseURL()` call with a 20s (`FETCH_TIMEOUT_MS`) race, on top of the parser's own 15s socket timeout — this exists specifically to stop a hanging feed from hanging the GitHub Actions job indefinitely. Keep both timeouts if you touch fetch logic.
- **No manual HTML escaping**: Vue's template text interpolation (`{{ }}`) and attribute bindings (`:href`) auto-escape at SSR render time via `@vue/compiler-ssr` — this is a verified superset of the old hand-rolled `escapeHtml()` (it also escapes `'`), so nothing was reintroduced for this.
- **Output is one flat HTML file** (`output/digest.html`) with inline `<style>`, no external assets, no JS — it's deployed as-is to GitHub Pages as `_site/index.html`.
- Item limit per source (`ITEMS_PER_SOURCE = 5`) and description truncation length (`DESCRIPTION_MAX_LENGTH = 220`), both in `src/data/fetch-sources.ts`, are the two tunables most likely to come up in feature requests.
- TypeScript is checked only via ESLint's type-aware rules and `vite-node`'s esbuild strip (no type errors block the build) — there is no separate `tsc --noEmit`/`vue-tsc` step.

## CI/CD

`.github/workflows/daily-digest.yml` runs on a daily cron (00:00 UTC / 08:00 Asia/Shanghai), on push to `main`, and on manual dispatch. It does `pnpm install --frozen-lockfile` → `pnpm build` → copies `output/digest.html` to `_site/index.html` → deploys to GitHub Pages. There is no separate staging environment — every push to `main` redeploys the live page.
