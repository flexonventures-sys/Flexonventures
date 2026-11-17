-- Row-level security, per proposal section 12 (roles and permissions).
--   Organiser/admin : everything
--   Referee         : scores only the live match on their court (court PIN, via API with service role)
--   Team owner      : own team's squad and lineup, only inside the submission window
--   Player / viewer : browse public data, enter and pay, follow; never change results or schedules
-- Server API routes use the service role key and enforce PIN / window / payment checks themselves.

create or replace function my_player_id() returns uuid language sql stable security definer set search_path = public as $$
  select id from players where profile_id = auth.uid();
$$;

create or replace function owns_team(p_team uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from teams where id = p_team and owner_profile = auth.uid() and owner_access);
$$;

do $$
declare t text;
begin
  foreach t in array array['organisations','venues','sports','profiles','players','tournaments','categories','teams',
    'team_players','entries','payments','refunds','groups','group_members','courts','ties','matches','rally_events',
    'follows','alerts','audit_log','champions']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy staff_all on %I for all using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

-- Public read (browse without login)
create policy public_read on sports        for select using (true);
create policy public_read on venues        for select using (true);
create policy public_read on organisations for select using (true);
create policy public_read on players       for select using (true);
create policy public_read on tournaments   for select using (status <> 'draft');
create policy public_read on categories    for select using (exists (select 1 from tournaments t where t.id = tournament_id and t.status <> 'draft'));
create policy public_read on teams         for select using (true);
create policy public_read on team_players  for select using (true);
create policy public_read on groups        for select using (true);
create policy public_read on group_members for select using (true);
create policy public_read on champions     for select using (true);
create policy public_read on matches       for select using (true);
create policy public_read on rally_events  for select using (true);
-- ties: no direct public read; lineups are masked through the owner_ties view below
create policy public_read on entries       for select using (status = 'confirmed' or submitted_by = auth.uid());

-- courts: hide pin_hash from public by exposing a view
create view public_courts with (security_invoker = false) as
  select id, tournament_id, number, referee_name, stream_url from courts;
grant select on public_courts to anon, authenticated;

-- Profiles: self
create policy self_read   on profiles for select using (id = auth.uid());
create policy self_update on profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- Players: edit own sporting profile (not stats)
create policy self_update on players for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Entries: players submit their own (payment confirmed server side)
create policy self_insert on entries for insert with check (submitted_by = auth.uid() and status in ('pending_payment','review'));
create policy self_read_pay on payments for select using (exists (select 1 from entries e where e.id = entry_id and e.submitted_by = auth.uid()));
create policy self_read_ref on refunds  for select using (exists (select 1 from entries e where e.id = entry_id and e.submitted_by = auth.uid()));

-- Follows and alerts: own rows
create policy self_all  on follows for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy self_read on alerts  for select using (profile_id = auth.uid() or profile_id is null);
create policy self_mark on alerts  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Team owners: squad edits within league limits; lineup only during window
create policy owner_squad on team_players for all using (owns_team(team_id)) with check (owns_team(team_id));
create policy owner_team  on teams for update using (owns_team(id)) with check (owns_team(id));

create or replace function submit_lineup(p_tie uuid, p_lineup jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare t ties; my uuid;
begin
  select * into t from ties where id = p_tie for update;
  if now() < t.scheduled_at - interval '30 minutes' or now() >= t.scheduled_at then
    raise exception 'Lineup window is closed (opens 30 minutes before the tie, closes at the start)';
  end if;
  if owns_team(t.team_a) then
    update ties set lineup_a = p_lineup, lineup_a_at = now(), lineup_a_ok = false where id = p_tie;
  elsif owns_team(t.team_b) then
    update ties set lineup_b = p_lineup, lineup_b_at = now(), lineup_b_ok = false where id = p_tie;
  else
    raise exception 'Not your tie';
  end if;
  insert into audit_log(actor, action, entity, entity_id, data) values (auth.uid(), 'lineup.submit', 'tie', p_tie::text, p_lineup);
end $$;
grant execute on function submit_lineup(uuid, jsonb) to authenticated;

-- Block owners from reading the opponent's lineup before the start
create or replace view owner_ties with (security_invoker = false) as
select t.id, t.tournament_id, t.team_a, t.team_b, t.round, t.court_no, t.scheduled_at,
  case when owns_team(t.team_a) or now() >= t.scheduled_at or is_staff() then t.lineup_a end as lineup_a,
  case when owns_team(t.team_b) or now() >= t.scheduled_at or is_staff() then t.lineup_b end as lineup_b,
  t.winner_team
from ties t;
grant select on owner_ties to authenticated, anon;
