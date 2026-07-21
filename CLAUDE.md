# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm ci` — install dependencies
- `npm run build` — runs `node fetch-and-build.js`, fetching all RSS sources and writing `output/digest.html`

There is no test suite, linter, or dev server in this repo. The only way to verify a change is to run the build and inspect `output/digest.html`.

## Architecture

Single-script pipeline, no framework: `fetch-and-build.js` reads `sources.json` (list of `{name, url}` RSS feeds), fetches them concurrently via `rss-parser`, and renders one static self-contained HTML file.

Key points for anyone modifying this script:

- **Per-source isolation**: `fetchSource()` catches errors per source so one broken/slow feed doesn't fail the whole build. Each source result carries its own `error` field; the final HTML renders a footer noting how many sources were unavailable, and shows an empty-state message only if *every* source failed.
- **Hard timeout**: `withTimeout()` wraps each `parser.parseURL()` call with a 20s (`FETCH_TIMEOUT_MS`) race, on top of the parser's own 15s socket timeout — this exists specifically to stop a hanging feed from hanging the GitHub Actions job indefinitely. Keep both timeouts if you touch fetch logic.
- **HTML is generated as a template literal**, not a templating engine — `escapeHtml()` is called on every user/feed-supplied string (titles, links, descriptions) before interpolation. Any new interpolated field must be escaped the same way.
- **Output is one flat HTML file** (`output/digest.html`) with inline `<style>`, no external assets, no JS — it's deployed as-is to GitHub Pages as `_site/index.html`.
- Item limit per source (`ITEMS_PER_SOURCE = 5`) and description truncation length (`DESCRIPTION_MAX_LENGTH = 220`) are the two tunables most likely to come up in feature requests.

## CI/CD

`.github/workflows/daily-digest.yml` runs on a daily cron (00:00 UTC / 08:00 Asia/Shanghai), on push to `main`, and on manual dispatch. It does `npm ci` → `node fetch-and-build.js` → copies `output/digest.html` to `_site/index.html` → deploys to GitHub Pages. There is no separate staging environment — every push to `main` redeploys the live page.
