-- Dynamic tournament format engine.
-- A category runs one format (from the catalog in lib/formats/catalog.ts) made of ordered stages.
-- Each stage generates matches; brackets link winners (next_match) and losers (loser_next_match).

alter table categories add column if not exists format_id text not null default 'pools_single_elim';
alter table categories add column if not exists format_config jsonb not null default '{}';
alter table categories add column if not exists participant text not null default 'pair'
  check (participant in ('player', 'pair', 'team'));   -- what one entry is

create table if not exists stages (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  seq         int not null,
  kind        text not null,            -- round_robin | single_elim | double_elim | compass | consolation | swiss |
                                        -- king_court | rotating | americano | mexicano | ladder | team_ties
  name        text not null,
  config      jsonb not null default '{}',   -- groups, advance, rounds, courts, events, bronze, reset ...
  scoring     jsonb not null default '{"type":"sideout","to":11,"bo":1,"winBy":2}',
  state       jsonb not null default '{}',   -- per-format runtime state (ladder order, court positions ...)
  status      text not null default 'pending' check (status in ('pending', 'active', 'done')),
  created_at  timestamptz not null default now(),
  unique (category_id, seq)
);

alter table matches add column if not exists stage_id uuid references stages(id) on delete cascade;
alter table matches add column if not exists bracket text;          -- W, L, GF, GF2, B (bronze), C (consolation), E/W/N/S..., P (pool), C1..Cn (courts)
alter table matches add column if not exists position int;          -- order within round, for drawing brackets
alter table matches add column if not exists loser_next_match uuid references matches(id) on delete set null;
alter table matches add column if not exists loser_next_slot smallint check (loser_next_slot in (0,1));
alter table matches add column if not exists win_by smallint not null default 2;
alter table matches add column if not exists cap smallint;          -- hard cap (e.g. 15 win-by-1 at 15)
alter table matches add column if not exists freeze_at smallint;    -- MLP freeze: at this score only serving side scores
alter table matches add column if not exists timed_minutes smallint;
alter table matches add column if not exists event text;            -- team ties: "Women's doubles", "DreamBreaker"
create index if not exists matches_stage_idx on matches(stage_id, round_no, position);

alter table groups add column if not exists stage_id uuid references stages(id) on delete cascade;
alter table ties add column if not exists stage_id uuid references stages(id) on delete cascade;

-- Teams may enter categories directly (team formats)
alter table entries add column if not exists player_ids uuid[] not null default '{}';

alter table stages enable row level security;
create policy staff_all on stages for all using (is_staff()) with check (is_staff());
create policy public_read on stages for select using (true);

-- Lock now also routes the loser (double elimination, compass, consolation, bronze match).
create or replace function lock_match(p_match uuid, p_games jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare m matches; ga int := 0; gb int := 0; g jsonb; w smallint; winners uuid[]; losers uuid[]; we uuid; le uuid;
begin
  select * into m from matches where id = p_match for update;
  if m.status in ('done', 'walkover') then return; end if;
  for g in select * from jsonb_array_elements(p_games) loop
    if (g->>0)::int > (g->>1)::int then ga := ga + 1; else gb := gb + 1; end if;
  end loop;
  w := case when ga > gb then 0 else 1 end;
  update matches set games = p_games, winner = w, status = 'done', finished_at = now() where id = p_match;
  winners := case when w = 0 then m.side_a else m.side_b end;
  losers  := case when w = 0 then m.side_b else m.side_a end;
  update players set played = played + 1, won = won + 1 where id = any(winners);
  update players set played = played + 1 where id = any(losers);
  we := case when w = 0 then m.entry_a else m.entry_b end;
  le := case when w = 0 then m.entry_b else m.entry_a end;
  if m.next_match is not null then
    if m.next_slot = 0 then update matches set entry_a = we, side_a = winners where id = m.next_match;
    else update matches set entry_b = we, side_b = winners where id = m.next_match; end if;
  end if;
  if m.loser_next_match is not null then
    if m.loser_next_slot = 0 then update matches set entry_a = le, side_a = losers where id = m.loser_next_match;
    else update matches set entry_b = le, side_b = losers where id = m.loser_next_match; end if;
  end if;
end $$;

alter publication supabase_realtime add table stages;
