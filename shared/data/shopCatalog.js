// Catalogo economico del hangar — fuente de verdad para precio y orden visual.
//
// SHIPS (en constants.js) mantiene metadatos tecnicos (modelo, rotacion, eje).
// Este archivo solo define precio y orden — editable libremente sin tocar logica 3D.
//
// Para reordenar: cambiar `displayOrder`.
// Para abaratar/encarecer: cambiar `price`.
// Para regalar al inicio: `unlockedByDefault: true`.
//
// `displayOrder` actual = orden actual de SHIPS en constants.js.

import { SHIPS } from '../config/constants.js';

export const SHIP_CATALOG = {
  spaceship:       { price:     0, displayOrder: 0, unlockedByDefault: true  },
  spaceshipnew:    { price:  1500, displayOrder: 1, unlockedByDefault: false },
  cb1:             { price:  4000, displayOrder: 2, unlockedByDefault: false },
  ig127:           { price:  8000, displayOrder: 3, unlockedByDefault: false },
  lowpoly:         { price: 14000, displayOrder: 4, unlockedByDefault: false },
  // colaid1 deshabilitado — model GLB sin animaciones y con problemas en gameplay.
  // Para reactivar: quitar `hidden: true` y re-exportar GLB con clips.
  colaid1:         { price: 22000, displayOrder: 5, unlockedByDefault: false, hidden: true },
  waldeinsamkeit:  { price: 35000, displayOrder: 6, unlockedByDefault: false },
  // Nave secreta: precio Infinity → purchaseShip la rechaza (not_for_sale).
  // `secret` vive en SHIPS (constants). Solo se desbloquea con codigo y solo
  // aparece en el hangar si el jugador ya la posee. displayOrder al final.
  xwing:           { price: Infinity, displayOrder: 99, unlockedByDefault: false },
};

// Naves sin entrada en SHIP_CATALOG: precio infinito, orden al final (no rompen).
const FALLBACK = { price: Infinity, displayOrder: Number.MAX_SAFE_INTEGER, unlockedByDefault: false };

export function getShipCatalogEntry(shipId) {
  return SHIP_CATALOG[shipId] ?? FALLBACK;
}

// IDs de naves poseidas, leidos directo del perfil persistido. Se lee aqui (no
// se importa playerProfile) para evitar dependencia circular: playerProfile ya
// importa SHIP_CATALOG de este modulo.
const PROFILE_STORAGE_KEY = 'babel.profile.v1';
function ownedShipIds() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const p = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
    return Array.isArray(p.ownedShips) ? p.ownedShips : [];
  } catch { return []; }
}

// Devuelve SHIPS combinado con datos del catalogo, ordenado por displayOrder.
// El hangar y todo lo que liste naves para mostrar al jugador debe usar esto.
//
// `hidden` → nunca se muestra (nave deshabilitada). `secret` → solo se muestra
// si el jugador ya la posee (desbloqueada por codigo). Las naves secretas que no
// posees no aparecen ni se pueden navegar/comprar. Como esto se evalua al cargar
// el modulo, una nave recien canjeada se revela tras recargar (redeemCode hace
// location.reload()).
export function getShipsForHangar() {
  const owned = ownedShipIds();
  return SHIPS
    .map(s => ({ ...s, ...getShipCatalogEntry(s.id) }))
    .filter(s => !s.hidden && (!s.secret || owned.includes(s.id)))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}
