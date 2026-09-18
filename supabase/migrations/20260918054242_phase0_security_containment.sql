-- Fase 0 — Contención inmediata. Ver docs/security/supabase-hardening-plan.md
-- No altera el contrato con el cliente salvo en 0.3 (columna `code`), que se
-- compensa con la RPC get_room_code() y el cambio correspondiente en rooms.js.

-- 0.1 — cleanup_stale_rooms() fuera de la API pública.
-- Sigue ejecutándose desde list_public_rooms(), que es SECURITY DEFINER.
revoke execute on function public.cleanup_stale_rooms() from anon, authenticated;

-- 0.2 — Eliminar la sobrecarga antigua de record_match_result (14 args).
-- No resuelve auth.uid() y crea ambigüedad de resolución en PostgREST.
-- Único llamador (game/net/supabase/leaderboard.js:72) envía p_auth_user_id,
-- por lo que resuelve a la de 17 argumentos.
drop function if exists public.record_match_result(
  text, text, text, text, timestamptz, timestamptz, integer, integer,
  numeric, integer, boolean, integer, integer, integer
);

-- 0.3 — Ocultar race_rooms.code.
-- Un GRANT a nivel de tabla cubre todas las columnas, así que hay que
-- revocarlo primero y volver a conceder columna por columna.
revoke select on public.race_rooms from anon, authenticated;
grant select (
  id, is_private, host_id, guest_id,
  host_ship, guest_ship, host_pilot, guest_pilot,
  host_ready, guest_ready, status,
  created_at, started_at, finished_at, last_activity_at
) on public.race_rooms to anon, authenticated;

-- El host necesita ver su propio código (RoomScreen.jsx lo muestra tras un
-- reload, no solo al crear la sala). p_player_id sigue siendo falsificable
-- hasta la Fase 1, pero ahora exige conocer room_id + host_id en vez de
-- permitir volcar todos los códigos privados de una sola consulta.
create or replace function public.get_room_code(p_room_id text, p_player_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select code
  from public.race_rooms
  where id = p_room_id
    and host_id = p_player_id
    and is_private;
$$;
grant execute on function public.get_room_code(text, text) to anon, authenticated;

-- 0.4 — Vistas leaderboard a security_invoker (linter 0010).
alter view public.leaderboard_daily       set (security_invoker = true);
alter view public.leaderboard_weekly      set (security_invoker = true);
alter view public.leaderboard_monthly     set (security_invoker = true);
alter view public.leaderboard_online_wins set (security_invoker = true);

-- 0.6 — Índices de cobertura para las 5 FK sin indexar.
create index if not exists idx_omr_room_id on public.online_match_results (room_id);
create index if not exists idx_omr_host    on public.online_match_results (host_player_id);
create index if not exists idx_omr_guest   on public.online_match_results (guest_player_id);
create index if not exists idx_rooms_host  on public.race_rooms (host_id);
create index if not exists idx_rooms_guest on public.race_rooms (guest_id);

-- 0.6b — auth.uid() se reevaluaba por fila (linter 0003).
alter policy players_update_own on public.players
  using      (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));
