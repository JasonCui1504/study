# MCAT Study · study.jascui.com

A personal MCAT study tool built with the same stack and look as the photography site
(`photography-site-next`): Next.js 16, Tailwind 4 and libSQL/Turso, with a single-user password login.

## Features

- **Dashboard.** Exam countdown and a **"I'm starting to study"** button that runs a live timer until you end it.
  The timer is stored on the server, so it survives reloads and works across devices. Ending a session asks what you
  studied (section, topic, notes), and you can lower the minutes if you took a break. The header has a compact
  start/stop control on every page. The dashboard also shows today's plan, cards due, section progress, a study-time
  heatmap and weekly hours.
- **Trends.** These come from logged study sessions: today, this week vs. plan, a 7-day average with change vs. the
  prior 7 days, a 6-week trend (least-squares slope of weekly hours), 14-day plan adherence and a streak.
- **Flashcards.** Spaced repetition with FSRS (`ts-fsrs`, the algorithm modern Anki uses). Basic and cloze
  (`{{c1::…}}`) cards, images by URL, sub/superscripts (`H_{2}O`, `x^{2}`) and keyboard review
  (space, 1–4, Z to undo). Modes: due, struggling and cram. CSV/TSV and Anki plain-text import. Four starter decks
  (amino acids, physics/gen-chem equations, biochem, psych/soc) are seeded on first run.
- **Schedule.** Set your exam date and hours per weekday and it generates a plan in three phases: content review over
  every AAMC outline topic (more time for low-confidence topics), practice sets, then weekly full-lengths with review
  days. Daily flashcards and CARS run throughout. Month, week (hourly, drag to move or resize) and agenda views.
  "Rebuild plan" redistributes missed tasks and keeps finished work and anything you moved by hand.
  Subscribable `.ics` feed for Google/Apple Calendar.
- **Outline.** The AAMC content outline (144 science topics plus CARS skills) with 1–5 confidence ratings and
  "content reviewed" ticks. These drive the planner.
- **Exams.** Full-length and section-bank scores (118–132 per section, 472–528 total) with trend charts.
- **Mistakes.** Mistake log by reason and topic; any entry can become a flashcard in one click.
- **Stats.** Year heatmap, weekly hours by section, review counts and retention, and an editable session log with
  manual time entry.

## Local development

```bash
npm install
echo "STUDY_SESSION_SECRET=$(openssl rand -hex 32)" > .env.local
node scripts/set-password.mjs jason      # local database: .data/study.db
npm run dev
```

## Deploying to study.jascui.com

1. **Database.** Create a Turso database (`turso db create mcat-study`), then get its URL
   (`turso db show mcat-study --url`) and a token (`turso db tokens create mcat-study`).
2. **Vercel project.** Import this repo as a new project. Set these environment variables:
   - `STUDY_DATABASE_URL`: the `libsql://…` URL
   - `STUDY_DATABASE_AUTH_TOKEN`: the token
   - `STUDY_SESSION_SECRET`: a long random string (`openssl rand -hex 32`). Changing it signs everyone out and
     breaks calendar subscriptions.
3. **Login.** Put the two database variables in `.env.prod` (gitignored) and run
   `node scripts/set-password.mjs jason --env .env.prod`. It takes effect immediately.
4. **Domain.** In the Vercel project, open Settings → Domains and add `study.jascui.com`. Then add the DNS record
   Vercel shows (usually a `CNAME` from `study` to `cname.vercel-dns.com`) at your DNS provider for jascui.com.

The tables and starter decks are created automatically on first request.
