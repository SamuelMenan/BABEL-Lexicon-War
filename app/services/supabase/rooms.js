// Servicio RPC + Realtime para salas de carrera online.
// Diseño: docs/design/online-race-mode.md
// Fase 1: lobby + pick nave + ready. Sin gameplay sync todavia.

import { supabase } from './client.js';

function ensure() {
  if (!supabase) throw new Error('Supabase no configurado — modo online deshabilitado');
  return supabase;
}

// Codigo aleatorio 4 digitos para salas privadas.
export function generateRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function createRoom({ playerId, displayName, isPrivate = false }) {
  const sb = ensure();
  const code = isPrivate ? generateRoomCode() : null;
  const { data, error } = await sb.rpc('create_race_room', {
    p_host_id:    playerId,
    p_host_name:  displayName || 'Pilot',
    p_is_private: isPrivate,
    p_code:       code,
  });
  if (error) throw error;
  return { roomId: data, code };
}

export async function joinRoomById({ roomId, playerId, displayName }) {
  const sb = ensure();
  const { data, error } = await sb.rpc('join_race_room', {
    p_room_id:    roomId,
    p_guest_id:   playerId,
    p_guest_name: displayName || 'Pilot',
  });
  if (error) throw error;
  if (!data) throw new Error('No se pudo unir a la sala (llena o cerrada)');
  return roomId;
}

export async function joinRoomByCode({ code, playerId, displayName }) {
  const sb = ensure();
  const { data, error } = await sb.rpc('join_race_room_by_code', {
    p_code:       code,
    p_guest_id:   playerId,
    p_guest_name: displayName || 'Pilot',
  });
  if (error) throw error;
  if (!data) throw new Error('Codigo invalido o sala llena');
  return data;
}

export async function setRoomShip({ roomId, playerId, shipId }) {
  const sb = ensure();
  const { data, error } = await sb.rpc('set_room_ship', {
    p_room_id:   roomId,
    p_player_id: playerId,
    p_ship_id:   shipId,
  });
  if (error) throw error;
  if (!data) throw new Error('Nave no disponible (la escogio el rival)');
  return true;
}

export async function setRoomReady({ roomId, playerId, ready }) {
  const sb = ensure();
  const { data, error } = await sb.rpc('set_room_ready', {
    p_room_id:   roomId,
    p_player_id: playerId,
    p_ready:     ready,
  });
  if (error) throw error;
  return !!data;
}

export async function leaveRoom({ roomId, playerId }) {
  const sb = ensure();
  const { error } = await sb.rpc('leave_race_room', {
    p_room_id:   roomId,
    p_player_id: playerId,
  });
  if (error) throw error;
}

export async function fetchRoom(roomId) {
  const sb = ensure();
  const { data, error } = await sb.from('race_rooms').select('*').eq('id', roomId).single();
  if (error) throw error;
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
