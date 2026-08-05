import Parser from "rss-parser";
import fs from "node:fs/promises";

const FEEDS = [
  { section: "Markets", url: "https://www.cnbc.com/id/20910258/device/rss/rss.html" },
  { section: "Markets", url: "http://feeds.marketwatch.com/marketwatch/topstories/" },
  { section: "Crypto", url: "https://www.coindesk.com/arc/outboundfeeds/rss" },
  { section: "Macro", url: "https://finance.yahoo.com/news/rssindex" },
];

const MAX_ITEMS_PER_FEED = 5;

function escapeHtml(str = "") {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderItem(item) {
  let source = "";
  try { source = new URL(item.link).hostname.replace("www.", ""); } catch {}
  const time = item.pubDate
    ? " · " + new Date(item.pubDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
  return `
      <article class="story">
        <div class="kicker">${escapeHtml(item.section)}</div>
        <h2><a href="${item.link}" target="_blank" rel="noopener" style="color:inherit;">${escapeHtml(item.title)}</a></h2>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#5B5748;">via ${escapeHtml(source)}${time}</div>
      </article>`;
}

async function fetchItems() {
  const parser = new Parser({ timeout: 15000 });
  const all = [];
  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of (parsed.items || []).slice(0, MAX_ITEMS_PER_FEED)) {
        if (item.title && item.link) {
          all.push({ section: feed.section, title: item.title, link: item.link, pubDate: item.pubDate });
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${feed.url}:`, err.message);
    }
  }
  return all;
}

async function main() {
  const items = await fetchItems();
  if (items.length === 0) throw new Error("No headlines fetched — all feeds failed.");

  const template = await fs.readFile(new URL("./template.html", import.meta.url), "utf8");
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const storiesHtml = items.map(renderItem).join("\n");

  const html = template.replace("{{DATE}}", today).replace("{{STORIES}}", storiesHtml);
  await fs.writeFile(new URL("./index.html", import.meta.url), html, "utf8");

  console.log(`Wrote ${items.length} headlines to index.html`);
}

main().catch((err) => { console.error(err); process.exit(1); });
