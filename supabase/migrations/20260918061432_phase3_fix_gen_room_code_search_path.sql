-- Corrección de 3.1. gen_room_code() tenía `set search_path = public`, pero
-- gen_random_bytes() vive en el esquema `extensions` (pgcrypto), no en public
-- ni en pg_catalog. La migración se aplicó sin quejarse porque plpgsql resuelve
-- las llamadas en ejecución, no al crear la función: crear una sala privada
-- habría fallado con 42883.
--
-- El resto de funciones no se ve afectado: usan gen_random_uuid(), que además
-- de en extensions existe en pg_catalog desde PG13.
--
-- Se cualifica el esquema en vez de añadir `extensions` al search_path, para
-- no ampliar la superficie de resolución de nombres de una SECURITY DEFINER.
create or replace function public.gen_room_code()
returns text
language plpgsql
volatile
set search_path = public
as $function$
declare
  k_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- 31 chars, sin I L O 0 1
  v_code text := '';
  v_byte int;
  i int;
begin
  for i in 1..6 loop
    -- Muestreo por rechazo: 248 = 31*8. Descartar el resto elimina el sesgo
    -- del módulo, que si no favorecería a los primeros 8 caracteres.
    loop
      v_byte := get_byte(extensions.gen_random_bytes(1), 0);
      exit when v_byte < 248;
    end loop;
    v_code := v_code || substr(k_alphabet, 1 + (v_byte % 31), 1);
  end loop;
  return v_code;
end;
$function$;
revoke execute on function public.gen_room_code() from public, anon, authenticated;
