-- Fase 5 — Sesión emitida por el servidor (modo estricto).
-- Ver docs/security/supabase-hardening-plan.md
--
-- Hasta ahora el session_id lo inventaba el cliente en la pantalla de
-- resultados (MatchResult.jsx), es decir, DESPUÉS de jugar: no existía
-- concepto de partida en curso. Eso hacía que `started_at`, `finished_at` y
-- `mode` fueran todos declaraciones del cliente.
--
-- Ahora start_session() abre la fila al empezar y fija started_at y mode en
-- servidor. record_match_result exige esa sesión y comprueba que el tiempo de
-- juego declarado quepa en el tiempo real transcurrido. Los parámetros
-- p_started_at, p_finished_at y p_mode desaparecen: el servidor ya no acepta
-- la palabra del cliente sobre cuándo ni a qué se jugó.
--
-- Estricto por decisión de producto: si start_session falla (red caída), la
-- partida se juega pero no se registra. Se prefiere perder un resultado
-- ocasional a dejar una vía por la que baste con no llamar a start_session.

create or replace function public.start_session(p_mode text)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_player text := public.current_player_id();
  v_id     text;
begin
  if v_player is null then
    raise exception 'auth required' using errcode = '42501';
  end if;
  perform public.check_rate(v_player, 'start_session', 30);

  if p_mode not in ('combat','racing') then
    raise exception 'unknown mode %', p_mode using errcode = '22023';
  end if;

  v_id := 'ses_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.game_sessions (id, player_id, mode, started_at, source)
  values (v_id, v_player, p_mode, now(), 'web');

  return v_id;
end;
$function$;

drop function if exists public.record_match_result(
  text, text, text, timestamptz, timestamptz, integer, integer, numeric,
  integer, boolean, integer, integer, integer, integer, integer
);
create or replace function public.record_match_result(
  p_session_id text,
  p_display_name text,
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
  v_player       text;
  v_session      public.game_sessions%rowtype;
  v_elapsed_wall numeric;
  v_recent       integer;
  v_reasons      text[] := '{}';
  v_reason       text;
begin
  v_player := public.ensure_player(p_display_name);
  perform public.check_rate(v_player, 'record_match', 20);

  select * into v_session from public.game_sessions where id = p_session_id for update;
  if not found then
    raise exception 'unknown session' using errcode = '42501';
  end if;
  if v_session.player_id <> v_player then
    raise exception 'session belongs to another player' using errcode = '42501';
  end if;

  -- Impide acumular sesiones abiertas para gastarlas más tarde en lote.
  if v_session.started_at < now() - interval '6 hours' then
    raise exception 'session expired' using errcode = '22023';
  end if;

  -- El control central: no se puede declarar más tiempo de juego del que ha
  -- transcurrido de verdad desde que el servidor abrió la sesión. El margen
  -- de 60 s cubre desfase de reloj y tiempos de carga.
  v_elapsed_wall := extract(epoch from now() - v_session.started_at);
  if p_time_elapsed is not null and p_time_elapsed > v_elapsed_wall + 60 then
    raise exception 'reported play time (%s) exceeds elapsed wall clock (%s)',
      p_time_elapsed, round(v_elapsed_wall)
      using errcode = '22023';
  end if;

  -- Cooldown de la Fase 2: corta la ráfaga inmediata.
  select count(*) into v_recent
  from public.match_results
  where player_id = v_player
    and session_id <> p_session_id
    and created_at > now() - interval '2 seconds';
  if v_recent > 0 then
    raise exception 'too many results too quickly' using errcode = '53400';
  end if;

  update public.game_sessions
    set finished_at      = now(),
        duration_seconds = p_time_elapsed
    where id = p_session_id;

  -- mode sale de la sesión, no del cliente.
  insert into public.match_results (
    id, session_id, player_id, display_name, mode,
    score, wpm, accuracy, wave, race_victory,
    peak_wpm, time_elapsed, grafemas_reward,
    words_destroyed, best_combo
  )
  values (
    p_session_id, p_session_id, v_player, p_display_name, v_session.mode,
    p_score, p_wpm, p_accuracy, p_wave, p_race_victory,
    p_peak_wpm, p_time_elapsed, p_grafemas_reward,
    p_words_destroyed, p_best_combo
  )
  on conflict (session_id) do update
    set display_name    = excluded.display_name,
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
        'mode', v_session.mode, 'score', p_score, 'wpm', p_wpm, 'peak_wpm', p_peak_wpm,
        'accuracy', p_accuracy, 'time_elapsed', p_time_elapsed,
        'elapsed_wall', round(v_elapsed_wall),
        'words_destroyed', p_words_destroyed, 'best_combo', p_best_combo
      )
    );
  end loop;
end;
$function$;

-- ── Grants ─────────────────────────────────────────────────────────────────
revoke execute on function public.start_session(text) from public, anon;
revoke execute on function public.record_match_result(text, text, integer, integer, numeric, integer, boolean, integer, integer, integer, integer, integer) from public, anon;
grant  execute on function public.start_session(text) to authenticated;
grant  execute on function public.record_match_result(text, text, integer, integer, numeric, integer, boolean, integer, integer, integer, integer, integer) to authenticated;
