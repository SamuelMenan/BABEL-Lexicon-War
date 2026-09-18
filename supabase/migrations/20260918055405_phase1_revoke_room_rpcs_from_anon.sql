-- Corrección de los grants de la Fase 1.
--
-- Supabase define DEFAULT PRIVILEGES en el schema public que conceden EXECUTE
-- a anon y authenticated en toda función nueva. Al recrear las RPC con firma
-- nueva, anon recibió un grant EXPLÍCITO, así que `revoke ... from public`
-- (que solo quita la herencia de PUBLIC) no lo eliminaba. Hay que revocar a
-- anon por su nombre.
revoke execute on function public.ensure_player(text)                   from anon;
revoke execute on function public.create_race_room(text, boolean, text) from anon;
revoke execute on function public.join_race_room(text, text)            from anon;
revoke execute on function public.join_race_room_by_code(text, text)    from anon;
revoke execute on function public.set_room_ship(text, text)             from anon;
revoke execute on function public.set_room_ready(text, boolean)         from anon;
revoke execute on function public.leave_race_room(text)                 from anon;
revoke execute on function public.touch_room(text)                      from anon;
revoke execute on function public.get_room_code(text)                   from anon;

-- current_player_id es un helper interno: no debe estar en la API REST.
revoke execute on function public.current_player_id() from anon, authenticated;
