-- Fase 1 — La identidad del jugador se deriva de auth.uid(), nunca de un
-- parámetro del cliente. Ver docs/security/supabase-hardening-plan.md
--
-- Decisión de producto: el modo online pasa a ser solo para registrados.
-- El leaderboard ya lo era. Combate/carrera local siguen sin cuenta.
--
-- NOTA: hay datos reales (29 players, 85 sesiones, 85 resultados), 18 players
-- sin auth_user_id (legado de localStorage). Por eso players.id se conserva
-- tal cual y la identidad se resuelve por lookup sobre auth_user_id, en vez
-- de redefinir id = auth.uid()::text (rompería las FK del histórico).

-- ── 1.2 · players ligado a auth ────────────────────────────────────────────
-- El índice único parcial sobre auth_user_id ya existe y sigue siendo el
-- correcto. NOT NULL no es posible: 18 filas legadas no tienen uid y no hay
-- forma de atribuirlas. NOT VALID bloquea las nuevas sin tocar las viejas.
alter table public.players
  add constraint players_auth_user_id_required
  check (auth_user_id is not null) not valid;

-- ── 1.3 · Helper de identidad ──────────────────────────────────────────────
-- Devuelve null si el llamante no tiene sesión o no está aprovisionado.
-- Interna: la invocan las SECURITY DEFINER de abajo, que corren como owner.
create or replace function public.current_player_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from public.players where auth_user_id = (select auth.uid());
$$;
revoke execute on function public.current_player_id() from public;

-- ── 1.4 · Reescritura de las RPC ───────────────────────────────────────────
-- Las firmas pierden los parámetros de identidad (p_player_id, p_host_id,
-- p_guest_id, p_auth_user_id): ya no son entradas de confianza.

drop function if exists public.ensure_player(text, text);
create or replace function public.ensure_player(p_display_name text)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_id  text;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select id into v_id from public.players where auth_user_id = v_uid;

  if v_id is null then
    v_id := 'plr_' || replace(gen_random_uuid()::text, '-', '');
    begin
      insert into public.players (id, display_name, auth_user_id, last_seen_at)
      values (v_id, coalesce(nullif(p_display_name, ''), 'Pilot'), v_uid, now());
    exception when unique_violation then
      -- Carrera entre dos llamadas concurrentes del mismo usuario.
      select id into v_id from public.players where auth_user_id = v_uid;
    end;
  else
    update public.players
      set display_name = coalesce(nullif(p_display_name, ''), display_name),
          last_seen_at = now()
      where id = v_id;
  end if;

  return v_id;
end;
$function$;

drop function if exists public.create_race_room(text, text, boolean, text);
create or replace function public.create_race_room(p_display_name text, p_is_private boolean default false, p_code text default null)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_player  text;
  v_room_id text;
  v_code    text := p_code;
begin
  if p_is_private and (v_code is null or length(v_code) <> 4) then
    raise exception 'Salas privadas requieren codigo de 4 digitos';
  end if;

  v_player := public.ensure_player(p_display_name);

  v_room_id := replace(gen_random_uuid()::text, '-', '');

  insert into public.race_rooms (id, code, is_private, host_id, host_ship, status, last_activity_at)
  values (
    v_room_id,
    case when p_is_private then v_code else null end,
    p_is_private,
    v_player,
    'spaceship',
    'lobby',
    now()
  );

  return v_room_id;
end;
$function$;

drop function if exists public.join_race_room(text, text, text);
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

drop function if exists public.join_race_room_by_code(text, text, text);
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

  select * into v_room from public.race_rooms
    where code = p_code and status = 'lobby' for update;
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

drop function if exists public.set_room_ship(text, text, text);
create or replace function public.set_room_ship(p_room_id text, p_ship_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_room   public.race_rooms%rowtype;
  v_player text := public.current_player_id();
begin
  if v_player is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select * into v_room from public.race_rooms where id = p_room_id for update;
  if not found then return false; end if;
  if v_room.status <> 'lobby' then return false; end if;

  if v_player = v_room.host_id then
    update public.race_rooms set host_ship = p_ship_id, last_activity_at = now() where id = p_room_id;
  elsif v_player = v_room.guest_id then
    update public.race_rooms set guest_ship = p_ship_id, last_activity_at = now() where id = p_room_id;
  else
    return false;
  end if;

  return true;
end;
$function$;

drop function if exists public.set_room_ready(text, text, boolean);
create or replace function public.set_room_ready(p_room_id text, p_ready boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_room   public.race_rooms%rowtype;
  v_player text := public.current_player_id();
begin
  if v_player is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select * into v_room from public.race_rooms where id = p_room_id for update;
  if not found then return false; end if;
  if v_room.status <> 'lobby' then return false; end if;

  if v_player = v_room.host_id then
    if v_room.host_ship is null then return false; end if;
    update public.race_rooms set host_ready = p_ready, last_activity_at = now() where id = p_room_id;
  elsif v_player = v_room.guest_id then
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
$function$;

drop function if exists public.leave_race_room(text, text);
create or replace function public.leave_race_room(p_room_id text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_room   public.race_rooms%rowtype;
  v_player text := public.current_player_id();
begin
  if v_player is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select * into v_room from public.race_rooms where id = p_room_id for update;
  if not found then return; end if;

  if v_player = v_room.host_id then
    -- Host abandona → sala cancelada (cleanup la borrara fisicamente luego).
    update public.race_rooms set status = 'cancelled', last_activity_at = now() where id = p_room_id;
  elsif v_player = v_room.guest_id then
    -- Guest abandona → libera slot, host queda
    update public.race_rooms
      set guest_id = null, guest_ship = null, guest_ready = false, last_activity_at = now()
      where id = p_room_id;
  end if;
end;
$function$;

drop function if exists public.touch_room(text, text);
create or replace function public.touch_room(p_room_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_room   public.race_rooms%rowtype;
  v_player text := public.current_player_id();
begin
  if v_player is null then return false; end if;

  select * into v_room from public.race_rooms where id = p_room_id;
  if not found then return false; end if;
  if v_player <> v_room.host_id and v_player is distinct from v_room.guest_id then return false; end if;
  if v_room.status not in ('lobby','starting','racing') then return false; end if;

  update public.race_rooms set last_activity_at = now() where id = p_room_id;
  return true;
end;
$function$;

-- get_room_code: el host se deriva del token (antes venía en p_player_id).
drop function if exists public.get_room_code(text, text);
create or replace function public.get_room_code(p_room_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select code
  from public.race_rooms
  where id = p_room_id
    and host_id = public.current_player_id()
    and is_private;
$$;

-- record_online_match: solo un participante de la sala puede registrarla, y
-- el ganador tiene que ser host o guest.
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
  );

  update public.race_rooms
    set status = 'finished', finished_at = now()
    where id = p_room_id;
end;
$function$;

-- record_match_result: el agujero C1. Pierde p_player_id y p_auth_user_id.
drop function if exists public.record_match_result(
  text, text, text, text, uuid, timestamptz, timestamptz, integer, integer,
  numeric, integer, boolean, integer, integer, integer, integer, integer
);
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
end;
$function$;

-- ── Grants ─────────────────────────────────────────────────────────────────
-- Lección de la Fase 0: revocar a PUBLIC, no solo a anon/authenticated. Cada
-- función nace con EXECUTE para PUBLIC y anon lo hereda.
revoke execute on function public.ensure_player(text)                   from public;
revoke execute on function public.create_race_room(text, boolean, text) from public;
revoke execute on function public.join_race_room(text, text)            from public;
revoke execute on function public.join_race_room_by_code(text, text)    from public;
revoke execute on function public.set_room_ship(text, text)             from public;
revoke execute on function public.set_room_ready(text, boolean)         from public;
revoke execute on function public.leave_race_room(text)                 from public;
revoke execute on function public.touch_room(text)                      from public;
revoke execute on function public.get_room_code(text)                   from public;
revoke execute on function public.list_public_rooms()                   from public, anon;
revoke execute on function public.record_online_match(text, integer, integer, numeric, numeric, text) from public, anon;
revoke execute on function public.record_match_result(text, text, text, timestamptz, timestamptz, integer, integer, numeric, integer, boolean, integer, integer, integer, integer, integer) from public, anon;

-- Online = solo registrados.
grant execute on function public.ensure_player(text)                   to authenticated;
grant execute on function public.create_race_room(text, boolean, text) to authenticated;
grant execute on function public.join_race_room(text, text)            to authenticated;
grant execute on function public.join_race_room_by_code(text, text)    to authenticated;
grant execute on function public.set_room_ship(text, text)             to authenticated;
grant execute on function public.set_room_ready(text, boolean)         to authenticated;
grant execute on function public.leave_race_room(text)                 to authenticated;
grant execute on function public.touch_room(text)                      to authenticated;
grant execute on function public.get_room_code(text)                   to authenticated;
grant execute on function public.list_public_rooms()                   to authenticated;
grant execute on function public.record_online_match(text, integer, integer, numeric, numeric, text) to authenticated;
grant execute on function public.record_match_result(text, text, text, timestamptz, timestamptz, integer, integer, numeric, integer, boolean, integer, integer, integer, integer, integer) to authenticated;

-- anon deja de leer race_rooms por completo: el online ya no le concierne.
-- Los leaderboards siguen siendo públicos (views + match_results/players).
revoke select on public.race_rooms from anon;
