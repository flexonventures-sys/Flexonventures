# Admin setup guide

Every login in Flexon Sports Hub is a Supabase Auth session. Roles live in `profiles.role`
(`player`, `team_owner`, `referee`, `organiser`, `admin`).

## Email + password logins (live database, created 17 Nov 2026)

Created with `node scripts/seed-logins.mjs`. Passwords are random and are only in the git-ignored
`credentials.local.txt` on the machine that ran it (re-running resets them). They use the reserved
`flexon-sports.test` domain, which cannot receive mail, so **password login works and email codes do not**
for these accounts. For a real organiser, run `node scripts/admin.mjs organiser <real email>` and use the code login,
or change the email in Supabase → Authentication → Users and set a password there.

| Role | Email | Team / profile |
| --- | --- | --- |
| organiser | organiser@flexon-sports.test | |
| admin | admin@flexon-sports.test | |
| team_owner | owner.smashers@flexon-sports.test | Salt Lake Smashers |
| team_owner | owner.dinks@flexon-sports.test | New Town Dinks |
| team_owner | owner.blasters@flexon-sports.test | Ballygunge Blasters |
| team_owner | owner.heat@flexon-sports.test | Howrah Heat |
| player | player.rohan@flexon-sports.test | Rohan Das |
| player | player.ishita@flexon-sports.test | Ishita Roy |

Where to use the password: organiser/admin at `/admin` (Organiser tab), team owners at `/owner`
(Email and password), players at `/` → Log in → Password. All go through Supabase `signInWithPassword`.
Each team owner has a four-player squad (two men, two women) in the Flexon Team League.

Delete or disable these before a real launch (Supabase → Authentication → Users).

## Other logins that exist (code-based)

| Role | Login | Where | Status |
| --- | --- | --- | --- |
| Organiser / admin | work email + 6-digit code | `/admin` | Only the `.test` accounts above until you add a real one (step 2). |
| Referee | court number + 4-digit PIN, no account | `/admin` → Referee | Every court's PIN is **`1234`** (seed default). Change before a real event. |
| Team owner | registered mobile + WhatsApp code | `/owner` | None. Created when an organiser registers a team with the owner's mobile. |
| Player | mobile (WhatsApp) or email + code | `/` → Log in | None. The 16 sample players are display profiles only and have no login. |

Courts with a default PIN `1234`: Kolkata Open courts 1-4, Diwali Doubles Bash 1-4, Flexon Team League 1-4,
Summer Slam 1-4, Flexon Invitational 1-3.

One technical user also exists: `court-1.kol26@referee.flexon.invalid`, created by a test referee login. It
cannot receive mail and is scoped to Court 1 of the Kolkata Open. It is harmless; each court gets one the
first time its PIN is used.

Sample players (display only): Aarav Sen, Kabir Mehta, Vikram Rao, Arjun Nair, Riya Kapoor, Ananya Bose,
Tanvi Shah, Meera Iyer, Rohan Das, Dev Malhotra, Sana Qureshi, Ishita Roy, Neel Banerjee, Pooja Gupta,
Aditya Jain, Kavya Pillai.

## First-time setup, in order

### 1. Make email codes reliable (Supabase)
Supabase's built-in mailer is capped at a few emails an hour. For real use:
Dashboard → Authentication → **SMTP Settings** → add your SMTP (Resend, SES, Brevo). Then
Authentication → **Email Templates** → Magic Link: make sure it shows the code, `{{ .Token }}`.

### 2. Create the first organiser
```bash
npm install
node scripts/admin.mjs organiser you@yourcompany.com "Your Name"     # use "admin" for full admin
node scripts/admin.mjs list                                           # confirm
```
This needs `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
No terminal? Run this in Supabase → SQL editor after creating the user in Authentication → Users → Add user:
```sql
insert into profiles (id, email, role, org_id)
select id, email, 'organiser', '00000000-0000-0000-0000-000000000001' from auth.users where email = 'you@yourcompany.com'
on conflict (id) do update set role = 'organiser', org_id = excluded.org_id;
```

### 3. Log in
Open `/admin` → choose **Organiser** → enter the email → **Send login code** → enter the 6 digits.
Only emails registered as organiser or admin get a code; everyone else sees the same "sent" message, so
the page never reveals who is an organiser.

### 4. Replace the default court PINs
```bash
node scripts/admin.mjs pins kol26 1=4821 2=9035 3=1176 4=6602
```
Repeat per tournament. Give each referee only their own court's PIN (the printed referee card).
Referees are signed in through Supabase as a per-court user and can only score the live match on that court.

### 5. Turn on WhatsApp codes (players and team owners)
1. Meta Business → WhatsApp → create an app, add your sending number.
2. WhatsApp Manager → create a message template, category **Authentication**, with a **Copy code** button, named `flexon_login_code`. Wait for approval.
3. Create a permanent system-user token.
4. In Vercel project env vars set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_OTP_TEMPLATE=flexon_login_code`.
5. Supabase → Authentication → Providers → **Phone**: enable.
6. Supabase → Authentication → **Hooks** → Send SMS hook → HTTPS →
   `https://<your-domain>/api/hooks/send-sms` → generate the secret → put it in `SEND_SMS_HOOK_SECRET` → redeploy.
   Supabase still creates and checks every code; the hook only delivers it on WhatsApp.

### 6. Razorpay (entry fees)
Dashboard → API keys → set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`. Webhooks → URL
`https://<your-domain>/api/payments/webhook`, events `payment.captured`, `payment.failed`, `order.paid`,
`refund.processed`, secret → `RAZORPAY_WEBHOOK_SECRET`.

### 7. Run a tournament (Console)
Log in at **`/console`**. From there you can:
- create tournaments in any of 22 formats (see `docs/FORMATS.md`), with options and scoring per category
- add entries, teams, owners and squads, make draws, run rounds, enter and correct scores
- **Users & logins**: create, edit, reset passwords, change roles, disable or delete any login (organisers and admins only by an admin)
- **Players**: the player directory and ratings

### 7b. Matchday app (Organiser view)
1. **Tournaments → New**: type, details, categories and fees, format, registration form, review and publish.
2. **Tournaments → open it**: step through *Entries open → Close entries → Make the draw → Publish the schedule*.
3. **Entries**: approve or reject, one-tap refunds, desk sign-ups.
4. League: add each team with its owner's name and mobile. The owner logs in at `/owner` with that mobile.
5. **Today**: start a match to unlock scoring for that court, move it, award a walkover, or correct a result (logged).
6. **Setup → Live streams**: paste each court's YouTube live link.

### 8. Before launch
- [ ] Organiser created and logged in
- [ ] All court PINs changed from `1234`
- [ ] Custom SMTP set
- [ ] WhatsApp template approved and hook secret set
- [ ] Razorpay live keys and webhook set
- [ ] `GET /api/health` returns `{"ok":true}`
- [ ] Sample tournaments edited or archived (seed data is demo content)
- [ ] Rotate the database password, JWT secret and service-role key if they were ever shared in chat or email

## Known gaps
- The prototype's **Setup → Courts** screen shows PINs but does not save a new one yet; use the `pins` command or `PATCH /api/courts`.
- Phone login stays unavailable until step 5 is done; email login works as soon as step 1 is done.
