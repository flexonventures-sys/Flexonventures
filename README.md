# Flexon Sports Hub

Pickleball tournament platform for Flexon Ventures: one mobile-first web app, three views, one Supabase database, updating in real time. Built against `docs/Flexon-Sports-Hub-Proposal.pdf` and `docs/Flexon-Sports-Hub-Website-Walkthrough.pdf`, using the approved clickable prototype ([rg6830303/flexon-sports](https://github.com/rg6830303/flexon-sports)) as the UI.

| URL | View | Login |
| --- | --- | --- |
| `/` | Public: Home, Matches, Events, Players, Log in | None to browse. Players: mobile (WhatsApp/SMS) or email code |
| `/admin` | Organiser (Today, Tournaments, Entries, Setup) and Referee scoring | Organisers: work email code. Referees: court + 4-digit PIN |
| `/owner` | Team owner: Next tie, Lineup, Squad, Fixtures | Registered mobile, WhatsApp code |

## Stack

Next.js 15 (App Router, TypeScript, API routes) · Tailwind · Supabase Auth (all logins) · Supabase Postgres with row-level security and Realtime · WhatsApp Cloud API for codes · Razorpay · Web Push · Vercel (Mumbai region).

The public and organiser views are the signed-off prototype (`public/hub`, `public/organiser`), served by Next.js. `/api/bootstrap` feeds them live data from Supabase and `public/shared/flx.js` connects their actions to the API (entries, payments, follows, scoring, approvals, refunds) and to Supabase Realtime. When the database is not configured they fall back to the prototype's demo data, so the site never shows a blank page.

## Layout

```
app/api/            Next.js API routes (see API below)
app/owner/          Team owner view (React)
lib/                scoring engine, draw/schedule, auth sessions, Razorpay, alerts
public/hub          public view (prototype)
public/organiser    organiser + referee view (prototype)
public/shared       API bridge, offline rally queue, realtime
public/sw.js        PWA service worker (install, offline shell, browser alerts)
supabase/migrations schema, RLS
supabase/seed.sql   starting data generated from the prototype (scripts/gen-seed.mjs)
docs/               proposal + walkthrough
```

## Data model

`organisations`, `venues`, `sports` · `profiles` (auth users, role) · `players` (public sporting identity, stats) · `tournaments` (type, six-step progress, registration rules, form builder JSON, fees, league limits) · `categories` (format, scoring, points per win) · `teams`, `team_players` · `entries` (status: pending_payment → review → confirmed / waitlist / rejected / withdrawn) · `payments`, `refunds` (Razorpay ids, invoice numbers) · `groups`, `group_members` · `courts` (referee, bcrypt PIN, YouTube link) · `ties` (league, lineups, window) · `matches` (knockout `next_match`) · `rally_events` (append-only; undo voids, never deletes) · `follows` (tournament / category / match / player) · `alerts` · `champions` · `audit_log`.

Views: `group_standings` (points, game and point difference), `tournament_counts`, `tie_windows`, `public_courts` (no PINs), `owner_ties` (opponent lineup hidden until start).
Functions: `lock_match`, `reopen_match`, `check_court_pin`, `set_court_pin`, `submit_lineup` (enforces the 30-minute window), `head_to_head`.

## API

| Method | Route | Who | Does |
| --- | --- | --- | --- |
| GET | `/api/bootstrap` | anyone | live data for the prototype views (staff also get reviews/refunds) |
| POST | `/api/auth/otp`, `/api/auth/verify`, `/api/auth/logout` | anyone | code login for players, owners, organisers |
| POST | `/api/referee/login` | referee | court PIN → court-scoped Supabase session |
| POST/PUT | `/api/auth/phone` | signed-in user | account setup: verify mobile (WhatsApp code from Supabase) |
| POST | `/api/hooks/send-sms` | Supabase Auth | Send SMS hook: delivers Supabase-issued codes on WhatsApp |
| GET | `/api/matches/:code` | anyone | replayed score, call, rally feed, stream |
| POST | `/api/matches/:code/events` | referee/organiser | rally, undo, timeout (idempotent `clientId` for offline sync) |
| POST | `/api/matches/:code/action` | organiser (lock: referee too) | start, move (alerts + window), walkover, lock, reopen |
| GET/POST | `/api/tournaments` | anyone / organiser | listings; six-step wizard |
| GET/PATCH | `/api/tournaments/:code` | anyone / organiser | schedule, standings, bracket; next step, edit form |
| POST | `/api/tournaments/:code/draw` | organiser | generate groups/knockout, tap-to-swap, knockout from groups |
| POST | `/api/tournaments/:code/schedule` | organiser | auto schedule from start, length, courts |
| GET/POST | `/api/tournaments/:code/entries` | organiser | entries by category, money; desk entries |
| GET/POST/PATCH | `/api/tournaments/:code/teams` | organiser | teams, owners, access switch, ties |
| POST | `/api/entries` | player | enter (form validation, waitlist, Razorpay order) |
| PATCH | `/api/entries/:id` | organiser | approve, reject, waitlist, confirm, withdraw, change partner |
| POST | `/api/payments/verify`, `/api/payments/webhook` | player / Razorpay | signature-verified payment, receipts, refunds |
| POST | `/api/refunds/:id` | organiser | one-tap Razorpay refund |
| GET/POST | `/api/follows` | player | follow tournament, categories, match, player |
| GET/PATCH | `/api/alerts` | anyone / player | the bell |
| POST | `/api/push` | player | browser notification subscription |
| GET/PATCH | `/api/courts` | organiser | referees, PINs, stream links |
| GET | `/api/owner` · POST `/api/owner/lineup` · POST/PATCH/DELETE `/api/owner/squad` | team owner | next tie, lineup in window, squad within limits |

## Develop

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys (others optional for local)
npm run dev                  # http://localhost:3000, /admin, /owner
npm test                     # scoring + draw unit tests
```

Admin logins and first-time setup: [docs/ADMIN_SETUP.md](docs/ADMIN_SETUP.md). Deployment: see [DEPLOYMENT.md](DEPLOYMENT.md). Branches: `main` → Vercel production, `dev` → Vercel preview.
