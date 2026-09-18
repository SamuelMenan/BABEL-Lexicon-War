-- Fase 3 — Autorización real de salas.
-- Ver docs/security/supabase-hardening-plan.md

-- ── 3.1 · Códigos generados en servidor ────────────────────────────────────
-- Antes: 4 dígitos con Math.random() del cliente (9000 combinaciones).
-- Ahora: 6 caracteres cripto-aleatorios de un alfabeto sin I/L/O/0/1 para que
-- se puedan dictar en voz alta. 31^6 = 887.503.681 combinaciones.
--
-- OJO: este cuerpo lo corrige la migración siguiente. gen_random_bytes() vive
-- en el esquema `extensions`, no en `public`, así que tal cual está aquí
-- falla en ejecución con 42883.
create or replace function public.gen_room_code()
returns text
language plpgsql
volatile
set search_path = public
as $function$
declare
  k_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- 31 chars
  v_code text := '';
  v_byte int;
  i int;
begin
  for i in 1..6 loop
    -- Muestreo por rechazo: 248 = 31*8. Descartar el resto elimina el sesgo
    -- del módulo, que si no favorecería a los primeros 8 caracteres.
    loop
      v_byte := get_byte(gen_random_bytes(1), 0);
      exit when v_byte < 248;
    end loop;
    v_code := v_code || substr(k_alphabet, 1 + (v_byte % 31), 1);
  end loop;
  return v_code;
end;
$function$;
revoke execute on function public.gen_room_code() from public, anon, authenticated;

-- create_race_room pierde p_code: el cliente ya no elige el código.
drop function if exists public.create_race_room(text, boolean, text);
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
  v_player  := public.ensure_player(p_display_name);
  v_room_id := replace(gen_random_uuid()::text, '-', '');

  -- Reintento sobre el UNIQUE de code en vez de comprobar-y-luego-insertar,
  -- que dejaría una ventana de carrera entre ambas operaciones.
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

-- Códigos normalizados a mayúsculas: el jugador los teclea a mano.
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

-- ── 3.2 · RLS por participación ────────────────────────────────────────────
-- La policy invoca current_player_id(), y las expresiones de RLS se evalúan
-- con los privilegios de quien consulta: sin EXECUTE la policy fallaría. Esto
-- revierte a propósito el revoke de la Fase 1. La función solo puede devolver
-- el player id del propio llamante, así que exponerla no aporta nada a nadie.
grant execute on function public.current_player_id() to authenticated;

drop policy if exists rooms_select_all on public.race_rooms;
create policy rooms_select_participant on public.race_rooms
  for select to authenticated
  using (
    host_id  = (select public.current_player_id())
    or guest_id = (select public.current_player_id())
  );

-- El descubrimiento de salas públicas pasa íntegramente por list_public_rooms(),
-- que es SECURITY DEFINER y por tanto no pasa por esta policy.

-- ── 3.3 · players: separar lo público de lo interno ────────────────────────
-- auth_user_id es un identificador interno de Auth y no debe salir de la base.
-- Un GRANT de tabla cubre todas las columnas, así que toca revocar y reconceder
-- columna a columna (mismo patrón que race_rooms.code en la Fase 0).
-- Las vistas de leaderboard solo leen id y display_name, así que no se rompen.
revoke select on public.players from anon, authenticated;
grant select (id, display_name, created_at, last_seen_at)
  on public.players to anon, authenticated;

-- ── Grants de las funciones recreadas ──────────────────────────────────────
-- Los DEFAULT PRIVILEGES de Supabase vuelven a conceder EXECUTE a anon en cada
-- función nueva: hay que revocar a public Y a anon, por su nombre.
revoke execute on function public.create_race_room(text, boolean)       from public, anon;
revoke execute on function public.join_race_room_by_code(text, text)    from public, anon;
grant  execute on function public.create_race_room(text, boolean)       to authenticated;
grant  execute on function public.join_race_room_by_code(text, text)    to authenticated;
