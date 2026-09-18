-- Invariantes de seguridad del esquema public.
-- Codifica lo que las Fases 0–4 establecieron, para que una migración futura
-- no lo deshaga por descuido. Ver docs/security/supabase-hardening-plan.md
--
-- Uso:  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security_invariants.sql
-- Sale con código != 0 si alguna invariante se rompe, y lista cuáles.
--
-- Por qué estas y no el linter: el advisor avisa de patrones genéricos; esto
-- afirma las decisiones concretas de este proyecto, incluidas las que el
-- advisor marca como WARN a propósito (las RPC SECURITY DEFINER para
-- authenticated son la API del juego).

\echo 'Comprobando invariantes de seguridad...'

do $$
declare
  v_violaciones text;
  v_total       int;
begin
  with v as (
    -- 1. anon no ejecuta NADA en public. Recordatorio: los DEFAULT PRIVILEGES
    --    de Supabase reconceden EXECUTE a anon en cada función nueva, así que
    --    toda migración que cree o reemplace una función debe revocar a
    --    `public` Y a `anon` por su nombre.
    select 'funcion ejecutable por anon: ' || p.proname as violacion
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
      and has_function_privilege('anon', p.oid, 'EXECUTE')

    -- 2. El código de sala solo sale por get_room_code(), nunca leyendo la tabla.
    union all select 'anon lee race_rooms.code'
      where has_column_privilege('anon', 'public.race_rooms', 'code', 'SELECT')
    union all select 'authenticated lee race_rooms.code'
      where has_column_privilege('authenticated', 'public.race_rooms', 'code', 'SELECT')

    -- 3. auth_user_id es un identificador interno de Auth: no sale de la base.
    union all select 'anon lee players.auth_user_id'
      where has_column_privilege('anon', 'public.players', 'auth_user_id', 'SELECT')
    union all select 'authenticated lee players.auth_user_id'
      where has_column_privilege('authenticated', 'public.players', 'auth_user_id', 'SELECT')

    -- 4. El online es solo para registrados.
    union all select 'anon lee race_rooms'
      where has_table_privilege('anon', 'public.race_rooms', 'SELECT')

    -- 5. RLS activa en toda tabla de public.
    union all
    select 'tabla sin RLS: ' || c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity

    -- 6. Tablas internas: RLS activa y CERO policies = puerta cerrada.
    union all
    select 'tabla interna con policies: ' || tablename
    from pg_policies
    where schemaname = 'public' and tablename in ('flagged_results', 'rpc_rate_limit')

    -- 7. Nada de volver a un select-all en race_rooms (era el agujero C2).
    union all
    select 'policy permisiva a todos en race_rooms: ' || policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'race_rooms' and qual = 'true'

    -- 8. Una SECURITY DEFINER sin search_path fijado es escalada de privilegios
    --    esperando a que alguien cree un objeto con el mismo nombre.
    union all
    select 'SECURITY DEFINER sin search_path fijado: ' || p.proname
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosecdef
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%'
      )

    -- 9. Lista blanca cerrada de la API del juego.
    --
    --    El advisor de Supabase marca estas 14 como WARN
    --    (authenticated_security_definer_function_executable) y es correcto que
    --    lo haga: no puede saber que son deliberadas. El riesgo de "14 avisos
    --    aceptados" es que el numero 15 se pierda entre el ruido.
    --
    --    Aqui el conjunto es cerrado: una funcion nueva, una sobrecarga o una
    --    retirada rompen el build. Si el cambio es intencionado, actualiza esta
    --    lista a proposito — esa friccion es el objetivo.
    union all
    select 'SECURITY DEFINER expuesta a authenticated y NO aprobada: '
           || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and p.proname not in (
        'create_race_room','current_player_id','ensure_player','get_room_code',
        'join_race_room','join_race_room_by_code','leave_race_room','list_public_rooms',
        'record_match_result','record_online_match','set_room_ready','set_room_ship',
        'start_session','touch_room'
      )

    -- Cuenta exacta: una sobrecarga con nombre ya aprobado pasaria el filtro
    -- anterior, pero no este.
    union all
    select 'el numero de SECURITY DEFINER expuestas cambio: ' || count(*) || ' (esperadas 14)'
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    having count(*) <> 14

    -- 10. La decision central de la Fase 1: la identidad sale de auth.uid(),
    --     nunca de un parametro. Si alguien reintroduce uno de estos nombres en
    --     una funcion alcanzable desde el cliente, volvemos al agujero original.
    --     Solo se miran las expuestas: un helper interno como check_rate()
    --     recibe el jugador ya derivado del token, y eso es correcto.
    union all
    select 'parametro de identidad reintroducido: ' || p.proname || '.' || arg
    from pg_proc p, unnest(coalesce(p.proargnames, '{}')) arg
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
      and (has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
      and arg in ('p_player_id','p_host_id','p_guest_id','p_auth_user_id')
  )
  select string_agg(violacion, E'\n  - '), count(*) into v_violaciones, v_total from v;

  if v_total > 0 then
    raise exception E'% invariante(s) de seguridad rotas:\n  - %', v_total, v_violaciones;
  end if;

  raise notice 'OK: todas las invariantes de seguridad se cumplen.';
end $$;
