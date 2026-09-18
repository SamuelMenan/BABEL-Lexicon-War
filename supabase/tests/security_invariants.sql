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
  )
  select string_agg(violacion, E'\n  - '), count(*) into v_violaciones, v_total from v;

  if v_total > 0 then
    raise exception E'% invariante(s) de seguridad rotas:\n  - %', v_total, v_violaciones;
  end if;

  raise notice 'OK: todas las invariantes de seguridad se cumplen.';
end $$;
