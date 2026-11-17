-- Flexon Sports: tournament organising platform
-- Core schema. Every table is keyed by uuid; `code` columns hold the short,
-- human/URL-friendly ids the frontend uses (e.g. tournament "kol26", match "m101").

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
create type app_role          as enum ('player', 'team_owner', 'referee', 'organiser', 'admin');
create type gender            as enum ('M', 'F', 'X');
create type tournament_type   as enum ('singles', 'doubles', 'league');
create type tournament_status as enum ('draft', 'upcoming', 'live', 'done', 'cancelled');
create type stage_format      as enum ('rr', 'ko', 'groups');
create type scoring_type      as enum ('sideout', 'rally');
create type approval_mode     as enum ('auto', 'manual');
create type full_mode         as enum ('waitlist', 'close');
create type refund_policy     as enum ('until', 'org', 'none');
create type entry_status      as enum ('pending_payment', 'review', 'confirmed', 'waitlist', 'rejected', 'withdrawn');
create type match_status      as enum ('upcoming', 'live', 'done', 'walkover', 'cancelled');
create type payment_status    as enum ('created', 'paid', 'failed', 'refunded', 'partially_refunded');
create type refund_status     as enum ('requested', 'processing', 'done', 'rejected');
create type otp_channel       as enum ('sms', 'whatsapp', 'email');  -- login codes are sent by Supabase Auth
create type match_event_kind  as enum ('rally', 'timeout', 'correction', 'start', 'lock', 'move', 'walkover');
create type alert_kind        as enum ('schedule_change', 'court_change', 'entries_closing', 'result', 'entry_update', 'payment', 'general');

-- ---------------------------------------------------------------- helpers
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------- organisations / venues / sports
create table organisations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text,
  gstin       text,
  razorpay_account_id text,
  otp_channel otp_channel not null default 'whatsapp',
  created_at  timestamptz not null default now()
);

create table venues (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organisations(id) on delete cascade,
  name       text not null,
  address    text,
  city       text,
  created_at timestamptz not null default now()
);

create table sports (
  id      uuid primary key default gen_random_uuid(),
  code    text unique not null,
  name    text not null,
  enabled boolean not null default false,
  sort    int not null default 0
);

-- ---------------------------------------------------------------- people
-- profiles: one per auth user (players, owners, organisers). Referees log in by court PIN.
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  photo_url  text,
  push_subscription jsonb,          -- browser notification endpoint
  phone      text unique,
  email      text,
  role       app_role not null default 'player',
  org_id     uuid references organisations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();

-- players: public sporting identity. May exist before the person signs up (added by organiser).
create table players (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  profile_id  uuid unique references profiles(id) on delete set null,
  full_name   text not null,
  gender      gender not null default 'X',
  locality    text,
  city        text default 'Kolkata',
  rating      numeric(4,2) not null default 3.00 check (rating between 1 and 8),
  played      int not null default 0,
  won         int not null default 0,
  titles      int not null default 0,
  phone       text,
  dob         date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_players_updated before update on players for each row execute function set_updated_at();
create index players_name_idx on players using gin (to_tsvector('simple', full_name));

-- ---------------------------------------------------------------- tournaments
create table tournaments (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,
  org_id         uuid not null references organisations(id) on delete cascade,
  sport_id       uuid not null references sports(id),
  venue_id       uuid references venues(id),
  name           text not null,
  type           tournament_type not null default 'doubles',
  status         tournament_status not null default 'draft',
  progress_step  int not null default 0 check (progress_step between 0 and 6),
  start_date     date not null,
  end_date       date not null,
  courts         int not null default 4 check (courts > 0),
  capacity       int,
  reg_open       date,
  reg_close      date,
  approval       approval_mode not null default 'manual',
  when_full      full_mode not null default 'waitlist',
  online_payment boolean not null default true,
  fee_paise      int not null default 0 check (fee_paise >= 0),
  fee_unit       text not null default 'per pair',
  refund_policy  refund_policy not null default 'until',
  find_partner   boolean not null default true,
  -- league settings
  team_count     int,
  team_min       int,
  team_max       int,
  tie_events     text[] default '{}',
  -- registration form definition: [{key,label,type,required,options}]
  form_fields    jsonb not null default '[]',
  description    text,
  rules          text,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date >= start_date)
);
create trigger trg_tournaments_updated before update on tournaments for each row execute function set_updated_at();
create index tournaments_status_idx on tournaments(status, start_date);

create table categories (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name          text not null,
  kind          tournament_type not null default 'doubles',
  gender_rule   text,                      -- 'M','F','mixed', null = open
  rating_cap    numeric(4,2),              -- e.g. 3.5
  stage         stage_format not null default 'groups',
  group_count   int default 2,
  advance       int default 2,
  scoring       scoring_type not null default 'sideout',
  points_to     int not null default 11 check (points_to in (11,15,21)),
  best_of       int not null default 3 check (best_of in (1,3,5)),
  match_minutes int not null default 30,
  points_per_win int not null default 2,
  qualifiers    int default 0,
  capacity      int,
  sort          int not null default 0,
  unique (tournament_id, name)
);

-- ---------------------------------------------------------------- teams (league)
create table teams (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name          text not null,
  owner_name    text,
  owner_phone   text,
  owner_profile uuid references profiles(id),
  owner_verified boolean not null default false,
  owner_access  boolean not null default true,     -- organiser access switch
  crest_url     text,
  colour        text,
  created_at    timestamptz not null default now(),
  unique (tournament_id, name)
);

create table team_players (
  team_id   uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  category  text,
  photo_url text,
  primary key (team_id, player_id)
);

-- ---------------------------------------------------------------- entries
create table entries (
  id             uuid primary key default gen_random_uuid(),
  entry_no       bigint generated always as identity,
  tournament_id  uuid not null references tournaments(id) on delete cascade,
  category_id    uuid references categories(id) on delete set null,
  team_id        uuid references teams(id) on delete set null,
  player1_id     uuid references players(id),
  player2_id     uuid references players(id),
  display_name   text not null,           -- "Pooja Gupta and Kavya Pillai" / team name
  status         entry_status not null default 'pending_payment',
  amount_paise   int not null default 0,
  seed           int,
  form_answers   jsonb not null default '{}',
  looking_for_partner boolean not null default false,
  rules_accepted boolean not null default false,
  desk_entry     boolean not null default false,
  submitted_by   uuid references profiles(id),
  contact_phone  text,
  note           text,
  reviewed_by    uuid references profiles(id),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_entries_updated before update on entries for each row execute function set_updated_at();
create index entries_tournament_idx on entries(tournament_id, status);

-- ---------------------------------------------------------------- payments / refunds
create table payments (
  id                  uuid primary key default gen_random_uuid(),
  entry_id            uuid not null references entries(id) on delete cascade,
  amount_paise        int not null check (amount_paise >= 0),
  currency            text not null default 'INR',
  status              payment_status not null default 'created',
  razorpay_order_id   text unique,
  razorpay_payment_id text unique,
  razorpay_signature  text,
  invoice_no          text unique,
  raw                 jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_payments_updated before update on payments for each row execute function set_updated_at();

create table refunds (
  id                 uuid primary key default gen_random_uuid(),
  payment_id         uuid references payments(id) on delete set null,
  entry_id           uuid not null references entries(id) on delete cascade,
  amount_paise       int not null check (amount_paise >= 0),
  reason             text,
  status             refund_status not null default 'requested',
  razorpay_refund_id text unique,
  processed_by       uuid references profiles(id),
  created_at         timestamptz not null default now(),
  processed_at       timestamptz
);

-- ---------------------------------------------------------------- draws
create table groups (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name        text not null,              -- "Group A"
  sort        int not null default 0,
  unique (category_id, name)
);

create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  entry_id uuid not null references entries(id) on delete cascade,
  primary key (group_id, entry_id)
);

-- ---------------------------------------------------------------- courts / referees / streams
create table courts (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  number        int not null,
  referee_name  text,
  pin_hash      text,                      -- crypt(pin, gen_salt('bf'))
  pin_set_at    timestamptz,
  stream_url    text,
  unique (tournament_id, number)
);

-- ---------------------------------------------------------------- matches + scoring
create table ties (                          -- league: team v team, contains several matches
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  team_a        uuid not null references teams(id),
  team_b        uuid not null references teams(id),
  round         text,
  scheduled_at  timestamptz,
  court_no      int,
  lineup_a      jsonb,             -- [{event, player_ids:[..2]}]
  lineup_b      jsonb,
  lineup_a_at   timestamptz,
  lineup_b_at   timestamptz,
  lineup_a_ok   boolean not null default false,
  lineup_b_ok   boolean not null default false,
  winner_team   uuid references teams(id)
);

create table matches (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  tournament_id uuid not null references tournaments(id) on delete cascade,
  category_id   uuid references categories(id) on delete set null,
  group_id      uuid references groups(id) on delete set null,
  tie_id        uuid references ties(id) on delete set null,
  stage         text not null,             -- "Quarter-final 1", "Group A"
  round_no      int,
  court_no      int,
  scheduled_at  timestamptz,
  entry_a       uuid references entries(id),
  entry_b       uuid references entries(id),
  side_a        uuid[] not null default '{}',  -- player ids
  side_b        uuid[] not null default '{}',
  scoring       scoring_type not null default 'sideout',
  points_to     int not null default 11,
  best_of       int not null default 3,
  doubles       boolean not null default true,
  status        match_status not null default 'upcoming',
  games         jsonb not null default '[]',   -- [[11,7],[11,9]] once locked
  winner        smallint check (winner in (0,1)),
  referee_name  text,
  started_at    timestamptz,
  finished_at   timestamptz,
  next_match    uuid references matches(id),   -- knockout progression
  next_slot     smallint check (next_slot in (0,1)),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_matches_updated before update on matches for each row execute function set_updated_at();
create index matches_tournament_idx on matches(tournament_id, status, scheduled_at);

-- Every rally is an append-only event; the live score is replayed from this log.
-- Undo marks an event voided (never deleted) so the audit trail stays complete.
create table rally_events (
  id         bigint generated always as identity primary key,
  match_id   uuid not null references matches(id) on delete cascade,
  seq        int not null,
  kind       match_event_kind not null default 'rally',
  winner     smallint check (winner in (0,1)),
  side       smallint check (side in (0,1)),   -- timeout: who called it
  voided_at  timestamptz,
  by_label   text,                              -- 'Court 2 referee' / organiser name
  t_offset   numeric(8,2) not null default 0,  -- minutes since start
  client_id  text,                              -- dedupe offline replays
  created_at timestamptz not null default now(),
  unique (match_id, seq),
  unique (match_id, client_id)
);

-- ---------------------------------------------------------------- engagement
create table follows (
  profile_id    uuid not null references profiles(id) on delete cascade,
  player_id     uuid references players(id) on delete cascade,
  tournament_id uuid references tournaments(id) on delete cascade,
  category_id   uuid references categories(id) on delete cascade,
  match_id      uuid references matches(id) on delete cascade,
  prefs         jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  check (num_nonnulls(player_id, tournament_id, category_id, match_id) = 1)
);
create unique index follows_category_uq on follows(profile_id, category_id) where category_id is not null;
create unique index follows_match_uq on follows(profile_id, match_id) where match_id is not null;
create unique index follows_player_uq on follows(profile_id, player_id) where player_id is not null;
create unique index follows_tournament_uq on follows(profile_id, tournament_id) where tournament_id is not null;

create table alerts (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references profiles(id) on delete cascade,   -- null = broadcast
  tournament_id uuid references tournaments(id) on delete cascade,
  kind          alert_kind not null default 'general',
  title         text not null,
  body          text,
  href          text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index alerts_profile_idx on alerts(profile_id, created_at desc);

-- Permanent records: champions per category (walkthrough page 5: "Records never disappear")
create table champions (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  category      text not null,
  player_ids    uuid[] not null,
  team_id       uuid references teams(id),
  created_at    timestamptz not null default now(),
  unique (tournament_id, category)
);

create table audit_log (
  id         bigint generated always as identity primary key,
  actor      uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  data       jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- functions
create or replace function is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('organiser','admin'));
$$;

create or replace function set_court_pin(p_court uuid, p_pin text) returns void
language sql security definer set search_path = public, extensions as $$
  update courts set pin_hash = crypt(p_pin, gen_salt('bf')), pin_set_at = now() where id = p_court;
$$;

create or replace function check_court_pin(p_tournament uuid, p_court int, p_pin text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from courts where tournament_id = p_tournament and number = p_court
                 and pin_hash is not null and pin_hash = crypt(p_pin, pin_hash));
$$;

-- Lock a match result: store games, set winner, update player stats, advance knockout.
create or replace function lock_match(p_match uuid, p_games jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare m matches; ga int := 0; gb int := 0; g jsonb; w smallint; winners uuid[]; losers uuid[]; winner_entry uuid;
begin
  select * into m from matches where id = p_match for update;
  if m.status = 'done' then return; end if;
  for g in select * from jsonb_array_elements(p_games) loop
    if (g->>0)::int > (g->>1)::int then ga := ga + 1; else gb := gb + 1; end if;
  end loop;
  w := case when ga > gb then 0 else 1 end;
  update matches set games = p_games, winner = w, status = 'done', finished_at = now() where id = p_match;
  winners := case when w = 0 then m.side_a else m.side_b end;
  losers  := case when w = 0 then m.side_b else m.side_a end;
  update players set played = played + 1, won = won + 1 where id = any(winners);
  update players set played = played + 1 where id = any(losers);
  winner_entry := case when w = 0 then m.entry_a else m.entry_b end;
  if m.next_match is not null then
    if m.next_slot = 0 then update matches set entry_a = winner_entry, side_a = winners where id = m.next_match;
    else update matches set entry_b = winner_entry, side_b = winners where id = m.next_match; end if;
  end if;
end $$;

-- Group standings: P, W, L, game diff, point diff, points (2 a win)
create or replace view group_standings as
with r as (
  select gm.group_id, gm.entry_id, mt.id match_id, mt.winner,
         case when mt.entry_a = gm.entry_id then 0 else 1 end as side, mt.games
  from group_members gm
  join matches mt on mt.group_id = gm.group_id and mt.status in ('done','walkover')
                 and gm.entry_id in (mt.entry_a, mt.entry_b)
)
select gm.group_id, gm.entry_id, e.display_name,
  count(r.match_id)                                             as played,
  count(*) filter (where r.winner = r.side)                     as won,
  count(*) filter (where r.match_id is not null and r.winner <> r.side) as lost,
  coalesce(sum((select count(*) filter (where (x->>r.side)::int > (x->>(1-r.side))::int)
              - count(*) filter (where (x->>r.side)::int < (x->>(1-r.side))::int)
              from jsonb_array_elements(r.games) x)), 0)        as game_diff,
  coalesce(sum((select sum((x->>r.side)::int - (x->>(1-r.side))::int)
              from jsonb_array_elements(r.games) x)), 0)        as point_diff,
  2 * count(*) filter (where r.winner = r.side)                 as points
from group_members gm
join entries e on e.id = gm.entry_id
left join r on r.group_id = gm.group_id and r.entry_id = gm.entry_id
group by gm.group_id, gm.entry_id, e.display_name;

-- Live entry counts per tournament
create or replace view tournament_counts as
select t.id tournament_id,
  count(e.id) filter (where e.status in ('confirmed','review')) as entries,
  count(e.id) filter (where e.status = 'review')                as pending,
  count(e.id) filter (where e.status = 'waitlist')              as waitlist
from tournaments t left join entries e on e.tournament_id = t.id
group by t.id;

-- Team submission window: opens 30 min before the tie, closes at the start, moves with it.
create or replace view tie_windows as
select id tie_id, scheduled_at, scheduled_at - interval '30 minutes' as window_opens, scheduled_at as window_closes,
  now() between scheduled_at - interval '30 minutes' and scheduled_at as window_open
from ties;

-- Head-to-head winner between two entries within a group (used to break ties on points)
create or replace function head_to_head(p_group uuid, p_a uuid, p_b uuid) returns smallint
language sql stable as $$
  select case when (winner = 0 and entry_a = p_a) or (winner = 1 and entry_b = p_a) then 1::smallint
              when winner is null then 0::smallint else -1::smallint end
  from matches where group_id = p_group and status in ('done','walkover')
    and ((entry_a = p_a and entry_b = p_b) or (entry_a = p_b and entry_b = p_a))
  order by finished_at desc limit 1;
$$;

-- Realtime: clients subscribe to live score, match and alert changes
alter publication supabase_realtime add table rally_events, matches, alerts, ties;

-- Organiser correction: reopen a locked match (stats rolled back, change logged by the API)
create or replace function reopen_match(p_match uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m matches; winners uuid[]; losers uuid[];
begin
  select * into m from matches where id = p_match for update;
  if m.status <> 'done' then return; end if;
  winners := case when m.winner = 0 then m.side_a else m.side_b end;
  losers  := case when m.winner = 0 then m.side_b else m.side_a end;
  update players set played = greatest(played - 1, 0), won = greatest(won - 1, 0) where id = any(winners);
  update players set played = greatest(played - 1, 0) where id = any(losers);
  update matches set status = 'live', winner = null, finished_at = null where id = p_match;
end $$;
