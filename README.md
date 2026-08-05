# The Ledger — setup guide

## 1. Get it hosted (free, ~10 minutes)

1. Create a free [GitHub](https://github.com) account if you don't have one.
2. Create a new repository (e.g. `the-ledger`), and upload this whole folder to it
   (drag-and-drop on github.com works, or `git init && git add . && git commit -m "init" && git push`).
3. In the repo, go to **Settings → Pages**. Under "Build and deployment," set
   **Source: Deploy from a branch**, branch `main`, folder `/docs`. Save.
4. GitHub will give you a live URL like `https://yourname.github.io/the-ledger/`
   within a minute or two. That's your site, live on the internet.
5. Optional: buy a real domain (e.g. Namecheap, Google Domains successor, Cloudflare —
   ~$10-15/year) and point it at GitHub Pages under Settings → Pages → Custom domain.

## 2. Turn on the daily automation

1. Get an Anthropic API key from **console.anthropic.com** (separate from a
   claude.ai subscription — this is billed by usage, typically a few cents per
   day for a job this size).
2. In your GitHub repo: **Settings → Secrets and variables → Actions → New
   repository secret**. Name it `ANTHROPIC_API_KEY`, paste in the key.
3. That's it — `.github/workflows/daily-build.yml` is already set to run every
   weekday at 11:00 UTC, pull fresh headlines, write new summaries, and push
   the updated page. You can also trigger it manually anytime from the
   **Actions** tab → "Daily rebuild" → "Run workflow."
4. Check the **Actions** tab the morning after you turn it on to confirm the
   first run succeeded — RSS feed URLs occasionally change, so if a feed
   breaks you'll see the error in the run log.

## 3. Before you apply for AdSense

Based on what's currently working for finance-niche sites in 2026, aim for
this before submitting:

- **15–25 published days** of real content (this automation gets you there on
  autopilot — just let it run for 3-4 weeks first)
- **About, Contact, and Privacy pages** — already included in `/docs`, but
  edit `contact.html` with your real email first
- **A clean, working nav** and no broken links
- **No obvious AI-content red flags** — the build script already forces
  original wording, but skim a few days' output yourself before applying
- Google's stated review window is 1–2 weeks, but real-world approvals for
  finance-niche sites commonly take 2-4 weeks and sometimes multiple
  submissions — don't be discouraged by a first rejection, just fix the
  specific reason given and reapply

Apply at **google.com/adsense** once you have that track record. After
approval, you'll get an ad snippet to paste into `template.html` in place of
the `.ad` placeholder divs.

## 4. Ongoing maintenance

- Swap or add RSS feeds in `scripts/build.mjs` → `FEEDS` if a source goes
  stale or you want deeper crypto/macro coverage.
- The `.ad` divs are sized to standard IAB units (728×90 leaderboard,
  300×250 sidebar) so real ad code drops in without a redesign.
- Consider adding a real email signup (e.g. Buttondown, ConvertKit free tier)
  once you're ready — the current signup form in the prototype doesn't send
  anywhere yet.
