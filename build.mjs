// scripts/build.mjs
//
// Pulls fresh headlines from public finance/crypto RSS feeds, asks Claude to
// write short, original summaries in "The Ledger" house voice (never copying
// source wording), and rebuilds docs/index.html from the template.
//
// Run locally with:  ANTHROPIC_API_KEY=sk-ant-... node scripts/build.mjs
// In production this runs on a schedule via .github/workflows/daily-build.yml

import Parser from "rss-parser";
import fs from "node:fs/promises";

// ---------------------------------------------------------------------------
// 1. Sources. Each is a public RSS feed meant for syndication — add/remove
//    freely, but always confirm a feed's terms allow this kind of reuse
//    before adding it, and keep the list small enough to stay fast.
// ---------------------------------------------------------------------------
const FEEDS = [
  { section: "Markets", url: "https://www.cnbc.com/id/20910258/device/rss/rss.html" },
  { section: "Markets", url: "http://feeds.marketwatch.com/marketwatch/topstories/" },
  { section: "Crypto", url: "https://www.coindesk.com/arc/outboundfeeds/rss" },
  { section: "Macro", url: "https://finance.yahoo.com/news/rssindex" },
];

const MAX_ITEMS_PER_FEED = 4;
const MAX_STORIES_ON_PAGE = 7;

// ---------------------------------------------------------------------------
// 2. Fetch + collect raw headlines
// ---------------------------------------------------------------------------
async function fetchRawItems() {
  const parser = new Parser({ timeout: 15000 });
  const all = [];

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = (parsed.items || []).slice(0, MAX_ITEMS_PER_FEED);
      for (const item of items) {
        all.push({
          section: feed.section,
          title: item.title || "",
          snippet: (item.contentSnippet || item.summary || "").slice(0, 600),
          link: item.link || "",
          pubDate: item.pubDate || "",
        });
      }
    } catch (err) {
      console.error(`Failed to fetch ${feed.url}:`, err.message);
      // Don't let one dead feed kill the whole build.
    }
  }
  return all;
}

// ---------------------------------------------------------------------------
// 3. Ask Claude to turn raw headlines into short, original story cards.
//    This is the step that keeps everything in Claude's own words instead
//    of reproducing source text.
// ---------------------------------------------------------------------------
async function summarizeWithClaude(rawItems) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const prompt = `You are the editorial desk for "The Ledger," a daily finance and
crypto briefing site. Below is a list of raw headlines and snippets pulled from
news RSS feeds today. Turn this into ${MAX_STORIES_ON_PAGE} distinct story
cards for the homepage.

Rules:
- Rewrite everything in your own words. Never copy a sentence from the
  source snippet verbatim.
- Each story needs: a section (Markets, Crypto, or Macro), a headline (under
  12 words), a one-sentence dek, and a 2-3 sentence body paragraph.
- Skip near-duplicate stories about the same event; pick the clearest source.
- Only use information present in the source material below. Do not invent
  numbers, quotes, or events.
- Return ONLY valid JSON, no markdown fences, matching this shape:
  [{"section": "Markets", "headline": "...", "dek": "...", "body": "..."}]

SOURCE MATERIAL:
${rawItems.map((i, idx) => `[${idx}] (${i.section}) ${i.title}\n${i.snippet}`).join("\n\n")}
`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.content.map((b) => b.text || "").join("\n");
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

// ---------------------------------------------------------------------------
// 4. Render the page
// ---------------------------------------------------------------------------
function renderStoryCard(story) {
  return `
      <article class="story">
        <div class="kicker">${escapeHtml(story.section)}</div>
        <h2>${escapeHtml(story.headline)}</h2>
        <p class="dek">${escapeHtml(story.dek)}</p>
        <div class="body"><p>${escapeHtml(story.body)}</p></div>
      </article>`;
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function render(stories) {
  const template = await fs.readFile(new URL("./template.html", import.meta.url), "utf8");
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const storiesHtml = stories.map(renderStoryCard).join("\n");
  return template
    .replace("{{DATE}}", today)
    .replace("{{STORIES}}", storiesHtml);
}

// ---------------------------------------------------------------------------
// 5. Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("Fetching feeds...");
  const raw = await fetchRawItems();
  if (raw.length === 0) throw new Error("No headlines fetched — all feeds failed.");

  console.log(`Fetched ${raw.length} raw headlines. Summarizing with Claude...`);
  const stories = await summarizeWithClaude(raw);

  console.log("Rendering page...");
  const html = await render(stories);

  await fs.writeFile(new URL("./index.html", import.meta.url), html, "utf8");

  console.log(`Done. Wrote ${stories.length} stories to docs/index.html`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
