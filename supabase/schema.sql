-- BABEL Lexicon War — Supabase schema
-- IDEMPOTENTE: re-aplicar este archivo es seguro. No borra tablas con datos.
--
-- APLICAR:
--   1. Crea proyecto en supabase.com
--   2. Settings → API → copia URL y anon key a .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
--   3. SQL Editor → pega este archivo → Run
--   4. Auth → Providers: habilita Email; Anonymous opcional
--
-- MIGRACION suave: si un jugador anonimo (sin auth_user_id) se registra y
-- llama record_match_result con su playerId + auth uid, las filas previas
-- quedan vinculadas al uid (UPDATE players.auth_user_id).

create extension if not exists pgcrypto;

-- ────────────────────────────────────────────────────────────────────
-- Tablas
-- ────────────────────────────────────────────────────────────────────

create table if not exists public.players (
  id            text primary key,
  display_name  text not null,
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- Añadir columna auth_user_id en instalaciones previas
alter table public.players add column if not exists auth_user_id uuid;
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='players' and constraint_name='players_auth_user_id_fkey'
  ) then
    alter table public.players
      add constraint players_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete set null;
  end if;
end$$;
create unique index if not exists players_auth_user_id_uidx
  on public.players(auth_user_id) where auth_user_id is not null;

create table if not exists public.game_sessions (
  id               text primary key,
  player_id        text not null references public.players(id) on delete cascade,
  mode             text not null check (mode in ('combat', 'racing')),
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  duration_seconds integer,
  source           text not null default 'web'
);

create table if not exists public.match_results (
  id               text primary key,
  session_id       text not null unique references public.game_sessions(id) on delete cascade,
  player_id        text not null references public.players(id) on delete cascade,
  display_name     text not null,
  mode             text not null check (mode in ('combat', 'racing')),
  score            integer,
  wpm              integer,
  accuracy         numeric(5,2),
  wave             integer,
  race_victory     boolean,
  peak_wpm         integer,
  time_elapsed     integer,
  grafemas_reward  integer,
  words_destroyed  integer,
  best_combo       integer,
  created_at       timestamptz not null default now()
);

-- Soft migration for pre-existing installations: add new combat-detail columns.
alter table public.match_results add column if not exists words_destroyed integer;
alter table public.match_results add column if not exists best_combo      integer;

create index if not exists idx_match_results_mode_created_at on public.match_results (mode, created_at desc);
create index if not exists idx_match_results_player_created_at on public.match_results (player_id, created_at desc);
create index if not exists idx_game_sessions_player_started_at on public.game_sessions (player_id, started_at desc);

-- ────────────────────────────────────────────────────────────────────
-- RPC: record_match_result
-- Acepta playerId local (text) + auth_user_id opcional (uuid).
-- Si el jugador local ya tenia filas y ahora se autentica, se vincula
-- el uid a la fila players existente (migracion suave).
-- security definer: la app NO escribe directo en las tablas.
-- ────────────────────────────────────────────────────────────────────

create or replace function public.record_match_result(
  p_player_id        text,
  p_display_name     text,
  p_session_id       text,
  p_mode             text,
  p_auth_user_id     uuid    default null,
  p_started_at       timestamptz default null,
  p_finished_at      timestamptz default now(),
  p_score            integer default null,
  p_wpm              integer default null,
  p_accuracy         numeric default null,
  p_wave             integer default null,
  p_race_victory     boolean default null,
  p_peak_wpm         integer default null,
  p_time_elapsed     integer default null,
  p_grafemas_reward  integer default null,
  p_words_destroyed  integer default null,
  p_best_combo       integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started_at timestamptz;
  v_caller_uid uuid := auth.uid();
  v_effective_uid uuid;
begin
  v_started_at := coalesce(p_started_at, p_finished_at);

  -- El uid efectivo es el de la sesion llamante; si no hay sesion, acepta el pasado.
  -- Esto evita que un cliente arbitrario inyecte el uid de otro usuario.
  v_effective_uid := coalesce(v_caller_uid, p_auth_user_id);

  -- Upsert players. Migracion suave: si la fila existe sin auth_user_id y el
  -- caller esta autenticado, vinculala ahora.
  insert into public.players (id, display_name, auth_user_id, last_seen_at)
  values (p_player_id, p_display_name, v_effective_uid, now())
  on conflict (id) do update
    set display_name = excluded.display_name,
        auth_user_id = coalesce(public.players.auth_user_id, excluded.auth_user_id),
        last_seen_at = now();

  insert into public.game_sessions (id, player_id, mode, started_at, finished_at, duration_seconds, source)
  values (
    p_session_id,
    p_player_id,
    p_mode,
    v_started_at,
    p_finished_at,
    p_time_elapsed,
    'web'
  )
  on conflict (id) do update
    set player_id        = excluded.player_id,
        mode             = excluded.mode,
        started_at       = excluded.started_at,
        finished_at      = excluded.finished_at,
        duration_seconds = excluded.duration_seconds,
        source           = excluded.source;

  insert into public.match_results (
    id, session_id, player_id, display_name, mode,
    score, wpm, accuracy, wave, race_victory,
    peak_wpm, time_elapsed, grafemas_reward,
    words_destroyed, best_combo
  )
  values (
    p_session_id, p_session_id, p_player_id, p_display_name, p_mode,
    p_score, p_wpm, p_accuracy, p_wave, p_race_victory,
    p_peak_wpm, p_time_elapsed, p_grafemas_reward,
    p_words_destroyed, p_best_combo
  )
  on conflict (session_id) do update
    set player_id       = excluded.player_id,
        display_name    = excluded.display_name,
        mode            = excluded.mode,
        score           = excluded.score,
        wpm             = excluded.wpm,
        accuracy        = excluded.accuracy,
        wave            = excluded.wave,
        race_victory    = excluded.race_victory,
        peak_wpm        = excluded.peak_wpm,
        time_elapsed    = excluded.time_elapsed,
        grafemas_reward = excluded.grafemas_reward,
        words_destroyed = excluded.words_destroyed,
        best_combo      = excluded.best_combo;
end;
$$;

-- Permitir a anon + authenticated invocar la RPC. La RPC controla escritura.
-- Si existe una version vieja con menos params, primero la borramos para evitar
-- conflicto por overload (PostgREST resolveria ambas).
drop function if exists public.record_match_result(
  text, text, text, text, uuid, timestamptz, timestamptz,
  integer, integer, numeric, integer, boolean, integer, integer, integer
);
grant execute on function public.record_match_result(
  text, text, text, text, uuid, timestamptz, timestamptz,
  integer, integer, numeric, integer, boolean, integer, integer, integer,
  integer, integer
) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────
-- Row Level Security
-- Estrategia:
--   - players:        SELECT publica. UPDATE solo dueño (auth_user_id = uid).
--                     INSERT bloqueado al cliente (lo hace la RPC).
--   - game_sessions:  lectura publica. escritura bloqueada (solo RPC).
--   - match_results:  lectura publica (alimenta leaderboards).
--                     escritura bloqueada (solo RPC).
-- La RPC es SECURITY DEFINER → bypassa RLS para inserciones.
-- ────────────────────────────────────────────────────────────────────

alter table public.players       enable row level security;
alter table public.game_sessions enable row level security;
alter table public.match_results enable row level security;

-- players: lectura publica
drop policy if exists players_select_all on public.players;
create policy players_select_all on public.players
  for select using (true);

-- players: dueño puede actualizar su display_name
drop policy if exists players_update_own on public.players;
create policy players_update_own on public.players
  for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- players: no INSERT/DELETE desde clientes (la RPC lo hace con security definer)

-- game_sessions: lectura publica
drop policy if exists sessions_select_all on public.game_sessions;
create policy sessions_select_all on public.game_sessions
  for select using (true);

-- match_results: lectura publica (leaderboards)
drop policy if exists matches_select_all on public.match_results;
create policy matches_select_all on public.match_results
  for select using (true);

-- ────────────────────────────────────────────────────────────────────
-- Views: leaderboards agregados (diario, semanal, mensual)
-- ────────────────────────────────────────────────────────────────────

create or replace view public.leaderboard_daily as
select
  dense_rank() over (
    partition by bucket_start, mode
    order by best_score desc, max_peak_wpm desc, avg_accuracy desc
  ) as rank,
  bucket_start, mode, player_id, display_name,
  total_score, best_score, games_played, avg_wpm, avg_accuracy, max_peak_wpm, last_played_at, max_wave
from (
  select
    date_trunc('day', created_at) as bucket_start,
    mode, player_id,
    max(display_name) as display_name,
    sum(coalesce(score, 0)) as total_score,
    max(coalesce(score, 0)) as best_score,
    max(coalesce(wave,  0)) as max_wave,
    count(*) as games_played,
    avg(wpm) as avg_wpm,
    avg(accuracy) as avg_accuracy,
    max(coalesce(peak_wpm, 0)) as max_peak_wpm,
    max(created_at) as last_played_at
  from public.match_results
  group by 1, 2, 3
) daily;

create or replace view public.leaderboard_weekly as
select
  dense_rank() over (
    partition by bucket_start, mode
    order by best_score desc, max_peak_wpm desc, avg_accuracy desc
  ) as rank,
  bucket_start, mode, player_id, display_name,
  total_score, best_score, games_played, avg_wpm, avg_accuracy, max_peak_wpm, last_played_at, max_wave
from (
  select
    date_trunc('week', created_at) as bucket_start,
    mode, player_id,
    max(display_name) as display_name,
    sum(coalesce(score, 0)) as total_score,
    max(coalesce(score, 0)) as best_score,
    max(coalesce(wave,  0)) as max_wave,
    count(*) as games_played,
    avg(wpm) as avg_wpm,
    avg(accuracy) as avg_accuracy,
    max(coalesce(peak_wpm, 0)) as max_peak_wpm,
    max(created_at) as last_played_at
  from public.match_results
  group by 1, 2, 3
) weekly;

create or replace view public.leaderboard_monthly as
select
  dense_rank() over (
    partition by bucket_start, mode
    order by best_score desc, max_peak_wpm desc, avg_accuracy desc
  ) as rank,
  bucket_start, mode, player_id, display_name,
  total_score, best_score, games_played, avg_wpm, avg_accuracy, max_peak_wpm, last_played_at, max_wave
from (
  select
    date_trunc('month', created_at) as bucket_start,
    mode, player_id,
    max(display_name) as display_name,
    sum(coalesce(score, 0)) as total_score,
    max(coalesce(score, 0)) as best_score,
    max(coalesce(wave,  0)) as max_wave,
    count(*) as games_played,
    avg(wpm) as avg_wpm,
    avg(accuracy) as avg_accuracy,
    max(coalesce(peak_wpm, 0)) as max_peak_wpm,
    max(created_at) as last_played_at
  from public.match_results
  group by 1, 2, 3
) monthly;

-- ════════════════════════════════════════════════════════════════════
-- ONLINE RACE MODE — fase 1 (lobby + sala + pick nave)
-- Diseño: docs/design/online-race-mode.md
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.race_rooms (
  id            text primary key,
  code          text unique,                                  -- 4 digitos privadas; null para publicas
  is_private    boolean not null default false,
  host_id       text not null references public.players(id) on delete cascade,
  guest_id      text references public.players(id) on delete set null,
  host_ship     text,
  guest_ship    text,
  host_pilot    text not null default 'kael',
  guest_pilot   text not null default 'voss',
  host_ready    boolean not null default false,
  guest_ready   boolean not null default false,
  status        text not null default 'lobby'
                check (status in ('lobby','starting','racing','finished','cancelled')),
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz
);

create index if not exists idx_race_rooms_public
  on public.race_rooms (created_at desc)
  where status = 'lobby' and is_private = false;

-- Soft migration: anyadir last_activity_at para deteccion de salas fantasmas.
alter table public.race_rooms add column if not exists last_activity_at timestamptz not null default now();
create index if not exists idx_race_rooms_activity on public.race_rooms (last_activity_at);

create table if not exists public.online_match_results (
  id               text primary key,
  room_id          text not null references public.race_rooms(id) on delete cascade,
  host_player_id   text not null references public.players(id) on delete cascade,
  guest_player_id  text not null references public.players(id) on delete cascade,
  host_avg_wpm     integer,
  guest_avg_wpm    integer,
  host_accuracy    numeric(5,2),
  guest_accuracy   numeric(5,2),
  host_ship        text,
  guest_ship       text,
  winner_player_id text references public.players(id) on delete set null,
  finished_at      timestamptz not null default now()
);

create index if not exists idx_online_match_winner
  on public.online_match_results (winner_player_id, finished_at desc);

-- ── RLS: lectura publica, escritura solo via RPC SECURITY DEFINER
alter table public.race_rooms             enable row level security;
alter table public.online_match_results   enable row level security;

drop policy if exists rooms_select_all on public.race_rooms;
create policy rooms_select_all on public.race_rooms for select using (true);

drop policy if exists online_matches_select_all on public.online_match_results;
create policy online_matches_select_all on public.online_match_results for select using (true);

-- ── Realtime: publicar race_rooms para que postgres_changes funcione.
-- Sin esto, subscribeRoom() no recibe eventos cuando guest entra o
-- ship/ready se actualizan → UI queda desincronizada.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='race_rooms'
  ) then
    alter publication supabase_realtime add table public.race_rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='online_match_results'
  ) then
    alter publication supabase_realtime add table public.online_match_results;
  end if;
end $$;

-- Helper: asegura fila en players (upsert ligero) para FK de race_rooms.
create or replace function public.ensure_player(
  p_player_id    text,
  p_display_name text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No tocamos auth_user_id aqui: el indice unico parcial sobre auth_user_id
  -- chocaria si el mismo uid esta vinculado a otro player.id local. La
  -- vinculacion se hace en record_match_result (migracion suave).
  insert into public.players (id, display_name, last_seen_at)
  values (p_player_id, coalesce(nullif(p_display_name, ''), 'Pilot'), now())
  on conflict (id) do update
    set display_name = coalesce(nullif(excluded.display_name, ''), public.players.display_name),
        last_seen_at = now();
end;
$$;

-- Drop versiones previas (cambio de firma) para evitar overload ambigua.
drop function if exists public.create_race_room(text, boolean, text);
drop function if exists public.join_race_room(text, text);
drop function if exists public.join_race_room_by_code(text, text);

-- ── RPC: crear sala
create or replace function public.create_race_room(
  p_host_id       text,
  p_host_name     text,
  p_is_private    boolean default false,
  p_code          text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id text;
  v_code    text := p_code;
begin
  if p_is_private and (v_code is null or length(v_code) <> 4) then
    raise exception 'Salas privadas requieren codigo de 4 digitos';
  end if;

  perform public.ensure_player(p_host_id, p_host_name);

  v_room_id := replace(gen_random_uuid()::text, '-', '');

  insert into public.race_rooms (id, code, is_private, host_id, status, last_activity_at)
  values (v_room_id, case when p_is_private then v_code else null end, p_is_private, p_host_id, 'lobby', now());

  return v_room_id;
end;
$$;

-- ── RPC: unirse por id (sala publica)
create or replace function public.join_race_room(
  p_room_id    text,
  p_guest_id   text,
  p_guest_name text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.race_rooms%rowtype;
begin
  select * into v_room from public.race_rooms where id = p_room_id for update;
  if not found then return false; end if;
  if v_room.status <> 'lobby' then return false; end if;
  if v_room.guest_id is not null and v_room.guest_id <> p_guest_id then return false; end if;
  if v_room.host_id = p_guest_id then return false; end if;

  perform public.ensure_player(p_guest_id, p_guest_name);

  update public.race_rooms set guest_id = p_guest_id, last_activity_at = now() where id = p_room_id;
  return true;
end;
$$;

-- ── RPC: unirse por codigo (sala privada)
create or replace function public.join_race_room_by_code(
  p_code       text,
  p_guest_id   text,
  p_guest_name text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.race_rooms%rowtype;
begin
  select * into v_room from public.race_rooms
    where code = p_code and status = 'lobby' for update;
  if not found then return null; end if;
  if v_room.guest_id is not null and v_room.guest_id <> p_guest_id then return null; end if;
  if v_room.host_id = p_guest_id then return null; end if;

  perform public.ensure_player(p_guest_id, p_guest_name);

  update public.race_rooms set guest_id = p_guest_id, last_activity_at = now() where id = v_room.id;
  return v_room.id;
end;
$$;

-- ── RPC: elegir nave (rechaza si rival ya escogio misma nave)
create or replace function public.set_room_ship(
  p_room_id   text,
  p_player_id text,
  p_ship_id   text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.race_rooms%rowtype;
  v_other_ship text;
begin
  select * into v_room from public.race_rooms where id = p_room_id for update;
  if not found then return false; end if;
  if v_room.status <> 'lobby' then return false; end if;

  if p_player_id = v_room.host_id then
    v_other_ship := v_room.guest_ship;
  elsif p_player_id = v_room.guest_id then
    v_other_ship := v_room.host_ship;
  else
    return false;
  end if;

  if v_other_ship is not null and v_other_ship = p_ship_id then
    return false;  -- nave ocupada por el rival
  end if;

  if p_player_id = v_room.host_id then
    update public.race_rooms set host_ship = p_ship_id, last_activity_at = now() where id = p_room_id;
  else
    update public.race_rooms set guest_ship = p_ship_id, last_activity_at = now() where id = p_room_id;
  end if;

  return true;
end;
$$;

-- ── RPC: toggle ready
create or replace function public.set_room_ready(
  p_room_id   text,
  p_player_id text,
  p_ready     boolean
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.race_rooms%rowtype;
begin
  select * into v_room from public.race_rooms where id = p_room_id for update;
  if not found then return false; end if;
  if v_room.status <> 'lobby' then return false; end if;

  if p_player_id = v_room.host_id then
    if v_room.host_ship is null then return false; end if;
    update public.race_rooms set host_ready = p_ready, last_activity_at = now() where id = p_room_id;
  elsif p_player_id = v_room.guest_id then
    if v_room.guest_ship is null then return false; end if;
    update public.race_rooms set guest_ready = p_ready, last_activity_at = now() where id = p_room_id;
  else
    return false;
  end if;

  -- Si ambos ready, transicion a 'starting'
  update public.race_rooms
    set status = 'starting', started_at = now()
    where id = p_room_id
      and host_ready = true
      and guest_ready = true
      and host_ship is not null
      and guest_ship is not null
      and status = 'lobby';

  return true;
end;
$$;

-- ── RPC: abandonar sala
create or replace function public.leave_race_room(
  p_room_id   text,
  p_player_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.race_rooms%rowtype;
begin
  select * into v_room from public.race_rooms where id = p_room_id for update;
  if not found then return; end if;

  if p_player_id = v_room.host_id then
    -- Host abandona → sala cancelada (cleanup la borrara fisicamente luego).
    update public.race_rooms set status = 'cancelled', last_activity_at = now() where id = p_room_id;
  elsif p_player_id = v_room.guest_id then
    -- Guest abandona → libera slot, host queda
    update public.race_rooms
      set guest_id = null, guest_ship = null, guest_ready = false, last_activity_at = now()
      where id = p_room_id;
  end if;
end;
$$;

-- ── RPC: heartbeat — clientes pingean cada 30s para mantener viva la sala.
-- Si dejan de pingear, cleanup_stale_rooms eliminara la fila.
create or replace function public.touch_room(
  p_room_id   text,
  p_player_id text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.race_rooms%rowtype;
begin
  select * into v_room from public.race_rooms where id = p_room_id;
  if not found then return false; end if;
  if p_player_id <> v_room.host_id and p_player_id <> v_room.guest_id then return false; end if;
  if v_room.status not in ('lobby','starting','racing') then return false; end if;
  update public.race_rooms set last_activity_at = now() where id = p_room_id;
  return true;
end;
$$;

-- ── RPC: detector + eliminador de salas fantasmas.
-- Reglas:
--   * lobby/starting sin actividad > 3 min → DELETE
--   * racing sin actividad > 5 min        → DELETE (broadcast cayó)
--   * finished/cancelled > 5 min          → DELETE
-- Llamado oportunisticamente desde list_public_rooms() y create_race_room().
create or replace function public.cleanup_stale_rooms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with deleted as (
    delete from public.race_rooms
    where (status in ('lobby','starting') and last_activity_at < now() - interval '3 minutes')
       or (status = 'racing'              and last_activity_at < now() - interval '5 minutes')
       or (status in ('finished','cancelled') and last_activity_at < now() - interval '5 minutes')
    returning 1
  )
  select count(*) into v_count from deleted;
  return v_count;
end;
$$;

-- ── RPC: listar salas publicas (lobby browser)
-- Ejecuta cleanup_stale_rooms() al inicio — ventana de cleanup recurrente
-- sin necesidad de pg_cron. Cualquier visita al lobby dispara purga.
create or replace function public.list_public_rooms()
returns table (
  id          text,
  host_id     text,
  host_name   text,
  host_ship   text,
  created_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cleanup_stale_rooms();
  return query
    select rr.id, rr.host_id, p.display_name, rr.host_ship, rr.created_at
    from public.race_rooms rr
    join public.players p on p.id = rr.host_id
    where rr.status = 'lobby'
      and rr.is_private = false
      and rr.guest_id is null
      and rr.created_at > now() - interval '30 minutes'
    order by rr.created_at desc
    limit 50;
end;
$$;

-- ── RPC: registrar resultado online (lo llama el host al cerrar match)
create or replace function public.record_online_match(
  p_room_id          text,
  p_host_avg_wpm     integer,
  p_guest_avg_wpm    integer,
  p_host_accuracy    numeric,
  p_guest_accuracy   numeric,
  p_winner_player_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.race_rooms%rowtype;
  v_id   text;
begin
  select * into v_room from public.race_rooms where id = p_room_id;
  if not found then return; end if;
  if v_room.guest_id is null then return; end if;

  v_id := replace(gen_random_uuid()::text, '-', '');

  insert into public.online_match_results (
    id, room_id, host_player_id, guest_player_id,
    host_avg_wpm, guest_avg_wpm, host_accuracy, guest_accuracy,
    host_ship, guest_ship, winner_player_id
  ) values (
    v_id, p_room_id, v_room.host_id, v_room.guest_id,
    p_host_avg_wpm, p_guest_avg_wpm, p_host_accuracy, p_guest_accuracy,
    v_room.host_ship, v_room.guest_ship, p_winner_player_id
  );

  update public.race_rooms
    set status = 'finished', finished_at = now()
    where id = p_room_id;
end;
$$;

grant execute on function public.ensure_player(text, text)                          to anon, authenticated;
grant execute on function public.create_race_room(text, text, boolean, text)        to anon, authenticated;
grant execute on function public.join_race_room(text, text, text)                   to anon, authenticated;
grant execute on function public.join_race_room_by_code(text, text, text)           to anon, authenticated;
grant execute on function public.set_room_ship(text, text, text)                    to anon, authenticated;
grant execute on function public.set_room_ready(text, text, boolean)                to anon, authenticated;
grant execute on function public.leave_race_room(text, text)                        to anon, authenticated;
grant execute on function public.list_public_rooms()                                to anon, authenticated;
grant execute on function public.touch_room(text, text)                              to anon, authenticated;
grant execute on function public.cleanup_stale_rooms()                               to anon, authenticated;
grant execute on function public.record_online_match(text, integer, integer, numeric, numeric, text)
                                                                                    to anon, authenticated;

-- ── Vista: ranking de victorias online
create or replace view public.leaderboard_online_wins as
select
  player_id, display_name, wins, matches,
  round(100.0 * wins / nullif(matches, 0), 1) as win_rate
from (
  select
    p.id as player_id,
    max(p.display_name) as display_name,
    count(*) filter (where omr.winner_player_id = p.id) as wins,
    count(*) as matches
  from public.players p
  join public.online_match_results omr
    on omr.host_player_id = p.id or omr.guest_player_id = p.id
  group by p.id
) agg
where matches > 0;

select id, display_name, auth_user_id from public.players where auth_user_id = auth.uid();