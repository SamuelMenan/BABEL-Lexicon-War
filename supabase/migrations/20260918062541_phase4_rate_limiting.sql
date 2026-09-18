-- Fase 4 — Rate limiting en base de datos.
-- Ver docs/security/supabase-hardening-plan.md
--
-- Ventana fija por (jugador, acción). Un pico justo en el borde de la ventana
-- puede colar hasta 2x el límite; para lo que buscamos —cortar fuerza bruta de
-- códigos y envío masivo de resultados— es de sobra, y evita el coste de una
-- ventana deslizante.

create table if not exists public.rpc_rate_limit (
  player_id    text        not null,
  action       text        not null,
  window_start timestamptz not null,
  -- `hits` y no `count`: en un RETURNING, `count` se confunde con el agregado.
  hits         integer     not null default 0,
  primary key (player_id, action, window_start)
);
create index if not exists idx_rate_limit_window on public.rpc_rate_limit (window_start);

-- Tabla interna: solo la tocan las SECURITY DEFINER (que corren como owner) y
-- service_role. RLS activa sin políticas = puerta cerrada.
alter table public.rpc_rate_limit enable row level security;
revoke all on public.rpc_rate_limit from anon, authenticated;

create or replace function public.check_rate(
  p_player_id text,
  p_action    text,
  p_max       integer,
  p_window    interval default '1 minute'
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_secs         numeric := extract(epoch from p_window);
  v_window_start timestamptz;
  v_hits         integer;
begin
  v_window_start := to_timestamp(floor(extract(epoch from now()) / v_secs) * v_secs);

  insert into public.rpc_rate_limit as rl (player_id, action, window_start, hits)
  values (p_player_id, p_action, v_window_start, 1)
  on conflict (player_id, action, window_start)
    do update set hits = rl.hits + 1
  returning rl.hits into v_hits;

  -- Primer golpe de una ventana nueva: momento barato y poco frecuente para
  -- purgar lo viejo de este jugador. Mantiene la tabla acotada aunque pg_cron
  -- no llegue a configurarse (Fase 6.2).
  if v_hits = 1 then
    delete from public.rpc_rate_limit
    where player_id = p_player_id and window_start < now() - interval '1 hour';
  end if;

  if v_hits > p_max then
    -- El RAISE revierte también este incremento, así que el contador se queda
    -- clavado en p_max y toda llamada posterior de la ventana vuelve a fallar.
    raise exception 'Demasiadas peticiones, espera un momento (%)', p_action
      using errcode = '53400';
  end if;
end;
$function$;
revoke execute on function public.check_rate(text, text, integer, interval) from public, anon, authenticated;

-- ── Aplicar el límite en las RPC sensibles ─────────────────────────────────

-- Fuerza bruta de códigos: es el objetivo más obvio de la tabla.
create or replace function public.join_race_room_by_code(p_code text, p_display_name text)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_room       public.race_rooms%rowtype;
  v_player     text;
  v_host_ship  text;
  v_guest_ship text;
begin
  v_player := public.ensure_player(p_display_name);
  perform public.check_rate(v_player, 'join_by_code', 10);

  select * into v_room from public.race_rooms
    where code = upper(trim(p_code)) and status = 'lobby' for update;
  if not found then return null; end if;
  if v_room.guest_id is not null and v_room.guest_id <> v_player then return null; end if;
  if v_room.host_id = v_player then return null; end if;

  v_host_ship  := coalesce(v_room.host_ship, 'spaceship');
  v_guest_ship := coalesce(
    v_room.guest_ship,
    case when v_host_ship = 'spaceshipnew' then 'spaceship' else 'spaceshipnew' end
  );

  update public.race_rooms
    set guest_id = v_player,
        host_ship = v_host_ship,
        guest_ship = v_guest_ship,
        last_activity_at = now()
    where id = v_room.id;
  return v_room.id;
end;
$function$;

create or replace function public.create_race_room(p_display_name text, p_is_private boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_player  text;
  v_room_id text;
  v_code    text;
  v_try     int := 0;
begin
  v_player := public.ensure_player(p_display_name);
  perform public.check_rate(v_player, 'create_room', 10);

  v_room_id := replace(gen_random_uuid()::text, '-', '');

  loop
    v_try  := v_try + 1;
    v_code := case when p_is_private then public.gen_room_code() else null end;
    begin
      insert into public.race_rooms (id, code, is_private, host_id, host_ship, status, last_activity_at)
      values (v_room_id, v_code, p_is_private, v_player, 'spaceship', 'lobby', now());
      return v_room_id;
    exception when unique_violation then
      if not p_is_private or v_try >= 10 then raise; end if;
    end;
  end loop;
end;
$function$;

create or replace function public.join_race_room(p_room_id text, p_display_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_room       public.race_rooms%rowtype;
  v_player     text;
  v_host_ship  text;
  v_guest_ship text;
begin
  v_player := public.ensure_player(p_display_name);
  perform public.check_rate(v_player, 'join_room', 20);

  select * into v_room from public.race_rooms where id = p_room_id for update;
  if not found then return false; end if;
  if v_room.status <> 'lobby' then return false; end if;
  if v_room.guest_id is not null and v_room.guest_id <> v_player then return false; end if;
  if v_room.host_id = v_player then return false; end if;

  v_host_ship  := coalesce(v_room.host_ship, 'spaceship');
  v_guest_ship := coalesce(
    v_room.guest_ship,
    case when v_host_ship = 'spaceshipnew' then 'spaceship' else 'spaceshipnew' end
  );

  update public.race_rooms
    set guest_id = v_player,
        host_ship = v_host_ship,
        guest_ship = v_guest_ship,
        last_activity_at = now()
    where id = p_room_id;
  return true;
end;
$function$;

-- record_match_result: el cooldown de 2s de la Fase 2 corta la ráfaga
-- inmediata; esto pone además un techo por minuto. Una partida dura >= 4s,
-- así que 20/min deja margen de sobra para reintentos legítimos.
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
  perform public.check_rate(v_player, 'record_match', 20);

  v_started_at := coalesce(p_started_at, p_finished_at);

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

  if p_finished_at > now() + interval '1 minute' then
    raise exception 'finished_at is in the future' using errcode = '22023';
  end if;
  if v_started_at > p_finished_at then
    raise exception 'started_at is after finished_at' using errcode = '22023';
  end if;

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

-- record_online_match: ya es idempotente por room_id, pero el techo evita que
-- alguien la use para martillear la base.
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
  perform public.check_rate(v_player, 'record_online', 10);

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
  on conflict (room_id) do nothing;

  update public.race_rooms
    set status = 'finished', finished_at = now()
    where id = p_room_id;
end;
$function$;

-- ── Grants ─────────────────────────────────────────────────────────────────
-- Recrear una función la devuelve a los DEFAULT PRIVILEGES de Supabase, que
-- conceden EXECUTE a anon. Revocar a public Y a anon, por su nombre.
revoke execute on function public.join_race_room_by_code(text, text)    from public, anon;
revoke execute on function public.create_race_room(text, boolean)       from public, anon;
revoke execute on function public.join_race_room(text, text)            from public, anon;
revoke execute on function public.record_online_match(text, integer, integer, numeric, numeric, text) from public, anon;
revoke execute on function public.record_match_result(text, text, text, timestamptz, timestamptz, integer, integer, numeric, integer, boolean, integer, integer, integer, integer, integer) from public, anon;

grant execute on function public.join_race_room_by_code(text, text)     to authenticated;
grant execute on function public.create_race_room(text, boolean)        to authenticated;
grant execute on function public.join_race_room(text, text)             to authenticated;
grant execute on function public.record_online_match(text, integer, integer, numeric, numeric, text) to authenticated;
grant execute on function public.record_match_result(text, text, text, timestamptz, timestamptz, integer, integer, numeric, integer, boolean, integer, integer, integer, integer, integer) to authenticated;
