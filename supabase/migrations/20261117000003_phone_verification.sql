-- Mobile verification for account setup (WhatsApp code via the Supabase Send SMS hook)
alter table profiles add column if not exists phone_verified_at timestamptz;
