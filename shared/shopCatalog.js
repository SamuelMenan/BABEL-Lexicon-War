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

import { SHIPS } from './constants.js';

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
};

// Naves sin entrada en SHIP_CATALOG: precio infinito, orden al final (no rompen).
const FALLBACK = { price: Infinity, displayOrder: Number.MAX_SAFE_INTEGER, unlockedByDefault: false };

export function getShipCatalogEntry(shipId) {
  return SHIP_CATALOG[shipId] ?? FALLBACK;
}

// Devuelve SHIPS combinado con datos del catalogo, ordenado por displayOrder.
// El hangar y todo lo que liste naves para mostrar al jugador debe usar esto.
export function getShipsForHangar() {
  return SHIPS
    .map(s => ({ ...s, ...getShipCatalogEntry(s.id) }))
    .filter(s => !s.hidden)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}
