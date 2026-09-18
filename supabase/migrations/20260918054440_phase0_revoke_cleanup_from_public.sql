-- Corrección de 0.1. El revoke a anon/authenticated no bastó: las funciones
-- llevan un EXECUTE implícito para PUBLIC (proacl `=X/postgres`) que ambos
-- roles heredan. list_public_rooms() la sigue invocando como owner (postgres).
revoke execute on function public.cleanup_stale_rooms() from public;
