-- Fase 6.2 — Mantenimiento programado.
-- Ver docs/security/supabase-hardening-plan.md
--
-- Hasta ahora la limpieza de salas fantasma dependía de que un cliente abriera
-- el lobby (list_public_rooms la invoca). Sin jugadores online, las salas
-- muertas se quedaban ahí indefinidamente. pg_cron lo hace incondicional.

create extension if not exists pg_cron;

-- Purga de contadores de rate limit. check_rate ya se autolimpia al abrir
-- ventana nueva, pero eso solo actúa sobre jugadores activos: quien deja de
-- jugar deja sus filas atrás. Esto es la red de seguridad.
create or replace function public.purge_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_count integer;
begin
  with deleted as (
    delete from public.rpc_rate_limit
    where window_start < now() - interval '1 hour'
    returning 1
  )
  select count(*) into v_count from deleted;
  return v_count;
end;
$function$;
revoke execute on function public.purge_rate_limits() from public, anon, authenticated;

-- Salas fantasma cada 5 min; contadores de rate limit cada hora.
-- Los jobs corren como `postgres`, que es el owner: por eso pueden invocar
-- funciones cuyo EXECUTE está revocado a anon y authenticated.
select cron.schedule(
  'cleanup-stale-rooms',
  '*/5 * * * *',
  $$select public.cleanup_stale_rooms()$$
);
select cron.schedule(
  'purge-rate-limits',
  '17 * * * *',
  $$select public.purge_rate_limits()$$
);
