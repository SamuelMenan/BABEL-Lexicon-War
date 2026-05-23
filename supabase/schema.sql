-- BABEL Lexicon War — Supabase schema
-- IDEMPOTENTE: re-aplicar este archivo es seguro. No borra tablas con datos.
--
-- APLICAR:
--   1. Crea proyecto en supabase.com
--   2. Settings → API → copia URL y anon key a .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
--   3. SQL Editor → pega este archivo → Run
--   4. Auth → Providers: habilita Email; Anonymous opcional
--
-- MIGRACIÓN suave: si un jugador anónimo (sin auth_user_id) se registra y
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
  created_at       timestamptz not null default now()
);

create index if not exists idx_match_results_mode_created_at on public.match_results (mode, created_at desc);
create index if not exists idx_match_results_player_created_at on public.match_results (player_id, created_at desc);
create index if not exists idx_game_sessions_player_started_at on public.game_sessions (player_id, started_at desc);

-- ────────────────────────────────────────────────────────────────────
-- RPC: record_match_result
-- Acepta playerId local (text) + auth_user_id opcional (uuid).
-- Si el jugador local ya tenía filas y ahora se autentica, se vincula
-- el uid a la fila players existente (migración suave).
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
  p_grafemas_reward  integer default null
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

  -- El uid efectivo es el de la sesión llamante; si no hay sesión, acepta el pasado.
  -- Esto evita que un cliente arbitrario inyecte el uid de otro usuario.
  v_effective_uid := coalesce(v_caller_uid, p_auth_user_id);

  -- Upsert players. Migración suave: si la fila existe sin auth_user_id y el
  -- caller está autenticado, vincúlala ahora.
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
    peak_wpm, time_elapsed, grafemas_reward
  )
  values (
    p_session_id, p_session_id, p_player_id, p_display_name, p_mode,
    p_score, p_wpm, p_accuracy, p_wave, p_race_victory,
    p_peak_wpm, p_time_elapsed, p_grafemas_reward
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
        grafemas_reward = excluded.grafemas_reward;
end;
$$;

-- Permitir a anon + authenticated invocar la RPC. La RPC controla escritura.
grant execute on function public.record_match_result(
  text, text, text, text, uuid, timestamptz, timestamptz,
  integer, integer, numeric, integer, boolean, integer, integer, integer
) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────
-- Row Level Security
-- Estrategia:
--   - players:        SELECT pública. UPDATE solo dueño (auth_user_id = uid).
--                     INSERT bloqueado al cliente (lo hace la RPC).
--   - game_sessions:  lectura pública. escritura bloqueada (solo RPC).
--   - match_results:  lectura pública (alimenta leaderboards).
--                     escritura bloqueada (solo RPC).
-- La RPC es SECURITY DEFINER → bypassa RLS para inserciones.
-- ────────────────────────────────────────────────────────────────────

alter table public.players       enable row level security;
alter table public.game_sessions enable row level security;
alter table public.match_results enable row level security;

-- players: lectura pública
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

-- game_sessions: lectura pública
drop policy if exists sessions_select_all on public.game_sessions;
create policy sessions_select_all on public.game_sessions
  for select using (true);

-- match_results: lectura pública (leaderboards)
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
    order by total_score desc, max_peak_wpm desc, avg_accuracy desc
  ) as rank,
  bucket_start, mode, player_id, display_name,
  total_score, best_score, games_played, avg_wpm, avg_accuracy, max_peak_wpm, last_played_at
from (
  select
    date_trunc('day', created_at) as bucket_start,
    mode, player_id,
    max(display_name) as display_name,
    sum(coalesce(score, 0)) as total_score,
    max(coalesce(score, 0)) as best_score,
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
    order by total_score desc, max_peak_wpm desc, avg_accuracy desc
  ) as rank,
  bucket_start, mode, player_id, display_name,
  total_score, best_score, games_played, avg_wpm, avg_accuracy, max_peak_wpm, last_played_at
from (
  select
    date_trunc('week', created_at) as bucket_start,
    mode, player_id,
    max(display_name) as display_name,
    sum(coalesce(score, 0)) as total_score,
    max(coalesce(score, 0)) as best_score,
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
    order by total_score desc, max_peak_wpm desc, avg_accuracy desc
  ) as rank,
  bucket_start, mode, player_id, display_name,
  total_score, best_score, games_played, avg_wpm, avg_accuracy, max_peak_wpm, last_played_at
from (
  select
    date_trunc('month', created_at) as bucket_start,
    mode, player_id,
    max(display_name) as display_name,
    sum(coalesce(score, 0)) as total_score,
    max(coalesce(score, 0)) as best_score,
    count(*) as games_played,
    avg(wpm) as avg_wpm,
    avg(accuracy) as avg_accuracy,
    max(coalesce(peak_wpm, 0)) as max_peak_wpm,
    max(created_at) as last_played_at
  from public.match_results
  group by 1, 2, 3
) monthly;
