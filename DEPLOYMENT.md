# Deployment

All accounts in Flexon's name (proposal section 14). `main` is production, `dev` is preview/testing.

## 1. Supabase

1. Create a project (region: Mumbai, `ap-south-1`).
2. Run the migrations, in order, in the SQL editor or with the CLI:
   ```bash
   supabase link --project-ref <ref>
   supabase db push            # applies supabase/migrations/*
   psql "$DATABASE_URL" -f supabase/seed.sql   # optional starting data from the prototype
   ```
3. Auth → Providers:
   - Email: enable, "Confirm email" on, use the 6-digit OTP template (`{{ .Token }}`).
   - Phone: enable with Twilio (supports SMS and WhatsApp) or MessageBird. SMS in India needs DLT registration; WhatsApp needs Meta verification.
   - Auth → Rate limits: keep OTP limits on (backs up the API's own limiter).
4. Create the first organiser: sign up once with the work email at `/admin`, then
   ```sql
   update profiles set role = 'organiser', org_id = '00000000-0000-0000-0000-000000000001' where email = 'ops@flexonventures.in';
   ```
5. Database → Replication: confirm `rally_events`, `matches`, `alerts`, `ties` are in `supabase_realtime` (the migration adds them).
6. Seeded court PINs are `1234`. Change every one in Setup → Courts before a real event.
7. Enable daily backups (Pro plan) for the "daily backups" requirement.

## 2. Razorpay

1. Settings → API keys: copy key id and secret.
2. Settings → Webhooks: URL `https://<domain>/api/payments/webhook`, events `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`; set a secret.
3. Use test keys on the `dev` (Preview) environment and live keys on Production.

## 3. Vercel

1. Import `flexonventures-sys/flexonventures`. Framework: Next.js. Production branch: `main`.
2. Environment variables (Production and Preview separately; see `.env.example`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`,
   `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_SITE_URL`.
3. Pushes to `dev` create Preview deployments; merging `dev` into `main` deploys production.
4. Add the domain; `/admin` and `/owner` live on the same domain.

## 4. Matchday checklist

- `GET /api/health` returns `{"ok":true}`.
- Organiser can log in, start a match; referee can log in with the court PIN and score; the public match page updates within seconds.
- Turn Wi-Fi off on the referee phone, score three rallies, turn it on: rallies sync.
- Test entry with Razorpay test card, then refund it from Entries.
