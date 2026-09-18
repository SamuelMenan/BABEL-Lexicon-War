-- Fase 2 — Integridad y plausibilidad de los datos.
-- Ver docs/security/supabase-hardening-plan.md
--
-- Rangos elegidos sobre los datos reales (85 resultados): score máx 187,
-- wpm máx 190, peak_wpm máx 197, accuracy 72–100, wave máx 37,
-- time_elapsed 4–469, grafemas 650–1150, words 12–237, combo 4–172.
-- Los límites dejan holgura de varios órdenes de magnitud: no buscan ajustar
-- el juego, solo cortar lo físicamente imposible.

-- ── 2.1 · CHECK constraints ────────────────────────────────────────────────
alter table public.match_results
  add constraint mr_score_range     check (score           is null or score           between 0 and 10000000),
  add constraint mr_wpm_range       check (wpm             is null or wpm             between 0 and 400),
  add constraint mr_peak_range      check (peak_wpm        is null or peak_wpm        between 0 and 500),
  add constraint mr_accuracy_range  check (accuracy        is null or accuracy        between 0 and 100),
  add constraint mr_wave_range      check (wave            is null or wave            between 0 and 1000),
  add constraint mr_time_range      check (time_elapsed    is null or time_elapsed    between 0 and 86400),
  add constraint mr_grafemas_range  check (grafemas_reward is null or grafemas_reward between 0 and 1000000),
  add constraint mr_words_range     check (words_destroyed is null or words_destroyed between 0 and 1000000),
  add constraint mr_combo_range     check (best_combo      is null or best_combo      between 0 and 1000000),
  -- Los únicos modos que existen hoy (GAME_MODES en shared/config/constants.js).
  -- Un modo nuevo debe añadirse aquí a propósito: preferimos un fallo ruidoso
  -- a datos de procedencia dudosa.
  add constraint mr_mode_valid      check (mode in ('combat','racing'));

alter table public.game_sessions
  add constraint gs_mode_valid     check (mode in ('combat','racing')),
  add constraint gs_source_valid   check (source in ('web')),
  add constraint gs_duration_range check (duration_seconds is null or duration_seconds between 0 and 86400),
  add constraint gs_time_order     check (finished_at is null or finished_at >= started_at);

alter table public.online_match_results
  add constraint omr_host_wpm_range   check (host_avg_wpm   is null or host_avg_wpm   between 0 and 400),
  add constraint omr_guest_wpm_range  check (guest_avg_wpm  is null or guest_avg_wpm  between 0 and 400),
  add constraint omr_host_acc_range   check (host_accuracy  is null or host_accuracy  between 0 and 100),
  add constraint omr_guest_acc_range  check (guest_accuracy is null or guest_accuracy between 0 and 100);

alter table public.race_rooms
  add constraint rr_status_valid check (status in ('lobby','starting','racing','finished','cancelled'));

-- ── 2.3 · Idempotencia del resultado online ────────────────────────────────
-- Sin esto se pueden insertar N resultados para la misma sala e inflar
-- leaderboard_online_wins a voluntad.
alter table public.online_match_results
  add constraint omr_room_unique unique (room_id);

-- ── 2.4 · Tabla de anomalías ───────────────────────────────────────────────
-- Lo que pasa los CHECK pero huele mal se registra aquí en vez de bloquearse:
-- un falso positivo no debe arruinar la partida de nadie.
create table if not exists public.flagged_results (
  id         uuid primary key default gen_random_uuid(),
  player_id  text        not null,
  session_id text,
  reason     text        not null,
  payload    jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_flagged_player  on public.flagged_results (player_id, created_at desc);
create index if not exists idx_flagged_reason  on public.flagged_results (reason, created_at desc);

-- Nadie la lee ni la escribe desde la API: solo las SECURITY DEFINER (que
-- corren como owner) y service_role. RLS activa sin políticas = puerta cerrada.
-- El linter lo marca como INFO rls_enabled_no_policy; es intencionado.
alter table public.flagged_results enable row level security;
revoke all on public.flagged_results from anon, authenticated;

-- ── 2.2 · Plausibilidad dentro de record_match_result ──────────────────────
create or replace function public.record_match_result(
  p_display_name text,
  p_session_id text,
  p_mode text,
  p_started_at timestamptz default null,
  p_finished_at timestamptz default now(),
  p_score integer default null,
  p_wpm integer default null,
  p_accuracy numeric default null,
  p_wave integer default null,
  p_race_victory boolean default null,
  p_peak_wpm integer default null,
  p_time_elapsed integer default null,
  p_grafemas_reward integer default null,
  p_words_destroyed integer default null,
  p_best_combo integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_player     text;
  v_started_at timestamptz;
  v_recent     integer;
  v_reasons    text[] := '{}';
  v_reason     text;
begin
  v_player     := public.ensure_player(p_display_name);
  v_started_at := coalesce(p_started_at, p_finished_at);

  -- Robo de sesión: sin esto, el `on conflict do update` deja reescribir la
  -- fila de otro jugador pasando su session_id.
  if exists (
    select 1 from public.game_sessions
    where id = p_session_id and player_id <> v_player
  ) then
    raise exception 'session belongs to another player' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.match_results
    where session_id = p_session_id and player_id <> v_player
  ) then
    raise exception 'result belongs to another player' using errcode = '42501';
  end if;

  -- Coherencia temporal. Un reloj adelantado es el truco más barato que hay.
  if p_finished_at > now() + interval '1 minute' then
    raise exception 'finished_at is in the future' using errcode = '22023';
  end if;
  if v_started_at > p_finished_at then
    raise exception 'started_at is after finished_at' using errcode = '22023';
  end if;

  -- Cooldown laxo: corta el envío en masa sin estorbar a quien reintenta.
  -- Solo mira sesiones distintas, para no romper el upsert de la misma.
  select count(*) into v_recent
  from public.match_results
  where player_id = v_player
    and session_id <> p_session_id
    and created_at > now() - interval '2 seconds';
  if v_recent > 0 then
    raise exception 'too many results too quickly' using errcode = '53400';
  end if;

  insert into public.game_sessions (id, player_id, mode, started_at, finished_at, duration_seconds, source)
  values (p_session_id, v_player, p_mode, v_started_at, p_finished_at, p_time_elapsed, 'web')
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
    p_session_id, p_session_id, v_player, p_display_name, p_mode,
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

  -- Señales blandas: se aceptan, se anotan. El récord humano de WPM ronda
  -- 216, así que por encima de 220 sostenido merece una mirada.
  if p_wpm is not null and p_wpm > 220 then
    v_reasons := v_reasons || 'wpm_above_human_record';
  end if;
  if p_peak_wpm is not null and p_peak_wpm > 260 then
    v_reasons := v_reasons || 'peak_wpm_implausible';
  end if;
  if p_time_elapsed is not null and p_time_elapsed > 0
     and p_words_destroyed is not null
     and (p_words_destroyed::numeric / (p_time_elapsed::numeric / 60.0)) > 300 then
    v_reasons := v_reasons || 'words_rate_implausible';
  end if;
  if (select count(*) from public.match_results
      where player_id = v_player and created_at > now() - interval '1 minute') > 10 then
    v_reasons := v_reasons || 'submission_burst';
  end if;

  foreach v_reason in array v_reasons loop
    insert into public.flagged_results (player_id, session_id, reason, payload)
    values (
      v_player, p_session_id, v_reason,
      jsonb_build_object(
        'mode', p_mode, 'score', p_score, 'wpm', p_wpm, 'peak_wpm', p_peak_wpm,
        'accuracy', p_accuracy, 'time_elapsed', p_time_elapsed,
        'words_destroyed', p_words_destroyed, 'best_combo', p_best_combo
      )
    );
  end loop;
end;
$function$;

-- ── 2.3 · record_online_match: estado válido + idempotente ─────────────────
-- El ciclo real de una sala es lobby → starting → finished/cancelled.
-- NADA pone nunca status='racing' (solo lo leen cleanup_stale_rooms y
-- touch_room), así que exigir 'racing' habría roto el registro por completo.
create or replace function public.record_online_match(
  p_room_id text,
  p_host_avg_wpm integer,
  p_guest_avg_wpm integer,
  p_host_accuracy numeric,
  p_guest_accuracy numeric,
  p_winner_player_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_room   public.race_rooms%rowtype;
  v_player text := public.current_player_id();
  v_id     text;
begin
  if v_player is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select * into v_room from public.race_rooms where id = p_room_id for update;
  if not found then return; end if;
  if v_room.guest_id is null then return; end if;

  if v_player <> v_room.host_id and v_player <> v_room.guest_id then
    raise exception 'not a participant of this room' using errcode = '42501';
  end if;

  if v_room.status not in ('starting','racing') then
    raise exception 'room is not in a playable state' using errcode = '22023';
  end if;

  if p_winner_player_id is not null
     and p_winner_player_id <> v_room.host_id
     and p_winner_player_id <> v_room.guest_id then
    raise exception 'winner must be a participant' using errcode = '22023';
  end if;

  v_id := replace(gen_random_uuid()::text, '-', '');

  insert into public.online_match_results (
    id, room_id, host_player_id, guest_player_id,
    host_avg_wpm, guest_avg_wpm, host_accuracy, guest_accuracy,
    host_ship, guest_ship, winner_player_id
  ) values (
    v_id, p_room_id, v_room.host_id, v_room.guest_id,
    p_host_avg_wpm, p_guest_avg_wpm, p_host_accuracy, p_guest_accuracy,
    v_room.host_ship, v_room.guest_ship, p_winner_player_id
  )
  -- Host y guest pueden llamar; el segundo no debe duplicar ni fallar.
  on conflict (room_id) do nothing;

  update public.race_rooms
    set status = 'finished', finished_at = now()
    where id = p_room_id;
end;
$function$;
