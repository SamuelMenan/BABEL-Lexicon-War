// Servicio RPC + Realtime para salas de carrera online.
// Diseño: docs/design/online-race-mode.md
// Fase 1: lobby + pick nave + ready. Sin gameplay sync todavia.

import { supabase } from './client.js';

function ensure() {
  if (!supabase) throw new Error('Supabase no configurado — modo online deshabilitado');
  return supabase;
}

// Alfabeto de los codigos de sala: 31 chars sin I/L/O/0/1, para que se puedan
// dictar en voz alta sin confusiones. Lo genera el servidor (gen_room_code);
// aqui solo sirve para validar y normalizar lo que teclea el jugador.
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH   = 6;

const CODE_STRIP_RE = new RegExp(`[^${ROOM_CODE_ALPHABET}]`, 'g');

export function normalizeRoomCode(raw) {
  return String(raw || '').toUpperCase().replace(CODE_STRIP_RE, '').slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(raw) {
  return normalizeRoomCode(raw).length === ROOM_CODE_LENGTH;
}

// El codigo ya no lo elige el cliente: lo genera el servidor y solo el host
// puede leerlo despues, via fetchRoomCode().
export async function createRoom({ displayName, isPrivate = false }) {
  const sb = ensure();
  const { data, error } = await sb.rpc('create_race_room', {
    p_display_name: displayName || 'Pilot',
    p_is_private:   isPrivate,
  });
  if (error) throw error;
  return { roomId: data };
}

export async function joinRoomById({ roomId, displayName }) {
  const sb = ensure();
  const { data, error } = await sb.rpc('join_race_room', {
    p_room_id:      roomId,
    p_display_name: displayName || 'Pilot',
  });
  if (error) throw error;
  if (!data) throw new Error('No se pudo unir a la sala (llena o cerrada)');
  return roomId;
}

export async function joinRoomByCode({ code, displayName }) {
  const sb = ensure();
  const { data, error } = await sb.rpc('join_race_room_by_code', {
    p_code:         code,
    p_display_name: displayName || 'Pilot',
  });
  if (error) throw error;
  if (!data) throw new Error('Codigo invalido o sala llena');
  return data;
}

export async function setRoomShip({ roomId, shipId }) {
  const sb = ensure();
  const { data, error } = await sb.rpc('set_room_ship', {
    p_room_id: roomId,
    p_ship_id: shipId,
  });
  if (error) throw error;
  if (!data) throw new Error('Nave no disponible (la escogio el rival)');
  return true;
}

export async function setRoomReady({ roomId, ready }) {
  const sb = ensure();
  const { data, error } = await sb.rpc('set_room_ready', {
    p_room_id: roomId,
    p_ready:   ready,
  });
  if (error) throw error;
  return !!data;
}

export async function leaveRoom({ roomId }) {
  const sb = ensure();
  const { error } = await sb.rpc('leave_race_room', {
    p_room_id: roomId,
  });
  if (error) throw error;
}

// Heartbeat — clientes en RoomScreen/race lo llaman cada 30s. Bumps
// last_activity_at; sin pings la sala se considera fantasma y cleanup la borra.
export async function touchRoom({ roomId }) {
  const sb = ensure();
  const { error } = await sb.rpc('touch_room', {
    p_room_id: roomId,
  });
  if (error) throw error;
}

// `code` esta revocada a nivel de columna para anon/authenticated: un select('*')
// devolveria permission denied. Se pide aparte via get_room_code(), que solo
// responde al host de la sala.
const ROOM_COLUMNS = [
  'id', 'is_private', 'host_id', 'guest_id',
  'host_ship', 'guest_ship', 'host_pilot', 'guest_pilot',
  'host_ready', 'guest_ready', 'status',
  'created_at', 'started_at', 'finished_at', 'last_activity_at',
].join(',');

export async function fetchRoomCode({ roomId }) {
  const sb = ensure();
  const { data, error } = await sb.rpc('get_room_code', {
    p_room_id: roomId,
  });
  if (error) throw error;
  return data ?? null;
}

// playerId opcional: evita una RPC de mas cuando ya sabemos que no somos el
// host. El servidor revalida contra auth.uid() de todos modos.
export async function fetchRoom(roomId, { playerId } = {}) {
  const sb = ensure();
  const { data, error } = await sb.from('race_rooms').select(ROOM_COLUMNS).eq('id', roomId).single();
  if (error) throw error;
  if (!data) return data;
  if (data.is_private && playerId && data.host_id === playerId) {
    data.code = await fetchRoomCode({ roomId }).catch(() => null);
  }
  return data;
}

export async function listPublicRooms() {
  const sb = ensure();
  const { data, error } = await sb.rpc('list_public_rooms');
  if (error) throw error;
  return data ?? [];
}

// Suscribe a cambios row-level en una sala — devuelve unsub.
// El callback recibe la nueva fila completa.
export function subscribeRoom(roomId, onChange) {
  const sb = ensure();
  const channel = sb
    .channel(`race_rooms:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'race_rooms', filter: `id=eq.${roomId}` },
      (payload) => {
        onChange?.(payload.new ?? null, payload);
      },
    )
    .subscribe();
  return () => { sb.removeChannel(channel); };
}

// Broadcast efimero por canal de sala (race ticks, chat, etc. — fase 2).
// Devuelve { send, unsub }.
// Anti-cheat: WPM record humano ~216. Clampear a 250 evita inyeccion trivial.
const MAX_HUMAN_WPM = 250;
const clampWpm = (v) => {
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(Math.round(v), MAX_HUMAN_WPM));
};
const clampAcc = (v) => {
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(Number(v), 100));
};

// Registra resultado online — solo el HOST llama esta RPC.
// guest_avg_wpm + accuracy llegan via broadcast 'finish' del guest.
export async function recordOnlineMatch({
  roomId, hostAvgWpm, guestAvgWpm, hostAccuracy, guestAccuracy, winnerPlayerId,
}) {
  const sb = ensure();
  const { error } = await sb.rpc('record_online_match', {
    p_room_id:          roomId,
    p_host_avg_wpm:     clampWpm(hostAvgWpm),
    p_guest_avg_wpm:    clampWpm(guestAvgWpm),
    p_host_accuracy:    clampAcc(hostAccuracy),
    p_guest_accuracy:   clampAcc(guestAccuracy),
    p_winner_player_id: winnerPlayerId,
  });
  if (error) throw error;
}

export function openRoomChannel(roomId, onMessage) {
  const sb = ensure();
  const channel = sb.channel(`room:${roomId}`, { config: { broadcast: { self: false } } });
  channel.on('broadcast', { event: '*' }, (msg) => onMessage?.(msg));
  channel.subscribe();
  return {
    send: (event, payload) => channel.send({ type: 'broadcast', event, payload }),
    unsub: () => { sb.removeChannel(channel); },
  };
}
