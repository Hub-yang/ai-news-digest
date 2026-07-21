import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ITEMS_PER_SOURCE = 5;
const DESCRIPTION_MAX_LENGTH = 220;

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (ai-news-digest RSS reader)" },
});

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchSource(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || [])
      .filter((item) => item.link && item.title)
      .sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0))
      .slice(0, ITEMS_PER_SOURCE)
      .map((item) => ({
        title: item.title.trim(),
        link: item.link,
        pubDate: item.pubDate ? new Date(item.pubDate) : null,
        description: truncate(
          stripHtml(item.contentSnippet || item.content || item.summary || ""),
          DESCRIPTION_MAX_LENGTH
        ),
      }));
    return { name: source.name, items, error: null };
  } catch (err) {
    const message = err.message || err.code || String(err) || "Unknown error";
    console.warn(`[warn] failed to fetch "${source.name}" (${source.url}): ${message}`);
    return { name: source.name, items: [], error: message };
  }
}

function formatDate(date) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function renderSection(section) {
  if (section.items.length === 0) return "";
  const items = section.items
    .map(
      (item) => `
      <li class="item">
        <div class="item-line">
          <a class="item-title" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
          ${item.pubDate ? `<span class="item-date">${formatDate(item.pubDate)}</span>` : ""}
        </div>
        ${item.description ? `<p class="item-desc">${escapeHtml(item.description)}</p>` : ""}
      </li>`
    )
    .join("");
  return `
    <section class="source-section">
      <h2 class="source-name">${escapeHtml(section.name)}</h2>
      <ul class="item-list">${items}
      </ul>
    </section>`;
}

function renderHtml(sections, generatedAt) {
  const dateLabel = generatedAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const sectionsHtml = sections.map(renderSection).join("\n");
  const failedSources = sections.filter((s) => s.error);

  return `<title>Daily AI Digest — ${dateLabel}</title>
<style>
  :root {
    --bg: #f4f5f3;
    --fg: #15191b;
    --muted: #5c6663;
    --accent: #1f6f78;
    --border: #dbdfdc;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0c1210; --fg: #eef1ef; --muted: #8a9a95; --accent: #55bcae; --border: #223330; }
  }
  :root[data-theme="dark"] { --bg: #0c1210; --fg: #eef1ef; --muted: #8a9a95; --accent: #55bcae; --border: #223330; }
  :root[data-theme="light"] { --bg: #f4f5f3; --fg: #15191b; --muted: #5c6663; --accent: #1f6f78; --border: #dbdfdc; }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font-family: Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
    line-height: 1.5;
  }
  .wrap { max-width: 700px; margin: 0 auto; padding: 3rem 1.5rem 4rem; }
  header {
    text-align: center;
    margin-bottom: 3rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--fg);
  }
  header .eyebrow {
    display: block;
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 0.6rem;
  }
  header h1 { font-size: 2rem; margin: 0 0 0.5rem; letter-spacing: -0.01em; text-wrap: balance; }
  header .subtitle {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    color: var(--muted);
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }
  .source-section { margin-bottom: 2.5rem; }
  .source-name {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    font-size: 0.78rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent);
    margin: 0 0 0.9rem;
  }
  .item-list { list-style: none; margin: 0; padding: 0; }
  .item { padding: 1rem 0; border-top: 1px solid var(--border); }
  .item:first-child { border-top: none; }
  .item-line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }
  .item-title {
    color: var(--fg);
    font-weight: 700;
    font-size: 1.08rem;
    text-decoration: none;
    text-wrap: balance;
  }
  .item-title:hover { color: var(--accent); }
  .item-date {
    flex-shrink: 0;
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
    white-space: nowrap;
  }
  .item-desc {
    margin: 0.4rem 0 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 0.92rem;
    color: var(--muted);
    overflow-wrap: break-word;
    max-width: 65ch;
  }
  footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
    text-align: center;
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    font-size: 0.75rem;
    color: var(--muted);
  }
  .empty-state { text-align: center; color: var(--muted); padding: 3rem 0; }
  a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
<div class="wrap">
  <header>
    <span class="eyebrow">Wire Digest</span>
    <h1>Daily AI Digest</h1>
    <div class="subtitle">${dateLabel}</div>
  </header>
  ${sections.some((s) => s.items.length > 0) ? sectionsHtml : '<p class="empty-state">No articles could be fetched today.</p>'}
  <footer>
    Aggregated from ${sections.length} RSS sources${failedSources.length ? ` · ${failedSources.length} source(s) unavailable today` : ""}.
  </footer>
</div>
`;
}

async function main() {
  const sourcesPath = path.join(__dirname, "sources.json");
  const sources = JSON.parse(await readFile(sourcesPath, "utf-8"));

  const results = await Promise.all(sources.map(fetchSource));

  const succeeded = results.filter((r) => !r.error).length;
  console.log(`Fetched ${succeeded}/${sources.length} sources successfully.`);

  const generatedAt = new Date();
  const html = renderHtml(results, generatedAt);

  const outputDir = path.join(__dirname, "output");
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "digest.html");
  await writeFile(outputPath, html, "utf-8");

  console.log(`Digest written to ${outputPath}`);
}

main().catch((err) => {
  console.error("Fatal error building digest:", err);
  process.exit(1);
});
