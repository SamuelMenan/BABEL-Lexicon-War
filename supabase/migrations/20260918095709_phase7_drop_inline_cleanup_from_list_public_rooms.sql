-- Rendimiento: list_public_rooms() dejaba de limpiar salas fantasma en cada
-- llamada.
--
-- El lobby la sondea cada pocos segundos por usuario, y cada llamada ejecutaba
-- un DELETE sobre race_rooms tomando bloqueos. Con 100 personas en el lobby eso
-- eran del orden de mil DELETE por minuto para un trabajo que no hace falta
-- hacer tan a menudo.
--
-- Desde la Fase 6.2 el job de pg_cron `cleanup-stale-rooms` lo hace cada 5
-- minutos de forma incondicional, que es justo lo que se necesita: las salas
-- se consideran fantasma a los 3 minutos sin actividad, no a los 3 segundos.
-- La llamada en linea era redundante.
create or replace function public.list_public_rooms()
returns table(id text, host_id text, host_name text, host_ship text, created_at timestamp with time zone)
language plpgsql
security definer
set search_path = public
as $function$
begin
  return query
    select rr.id, rr.host_id, p.display_name, rr.host_ship, rr.created_at
    from public.race_rooms rr
    join public.players p on p.id = rr.host_id
    where rr.status = 'lobby'
      and rr.is_private = false
      and rr.guest_id is null
      -- Filtro por actividad reciente: sin el DELETE en linea, una sala muerta
      -- podria seguir listada hasta que pase el cron. Esto la oculta ya.
      and rr.last_activity_at > now() - interval '3 minutes'
      and rr.created_at > now() - interval '30 minutes'
    order by rr.created_at desc
    limit 50;
end;
$function$;

-- Recrear una funcion la devuelve a los DEFAULT PRIVILEGES de Supabase.
revoke execute on function public.list_public_rooms() from public, anon;
grant  execute on function public.list_public_rooms() to authenticated;
