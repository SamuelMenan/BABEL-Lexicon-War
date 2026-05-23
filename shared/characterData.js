// Catálogo de personajes/pilotos seleccionables en hangar.

export const CHARACTERS = {
  kael: {
    id:       'kael',
    name:     'Kael',
    codename: 'K-07',
    role:     'Vanguard',
    bio:      'Piloto de asalto. Lectura rápida, reflejos quirúrgicos.',
    portrait:       '/characters/Kael.png',
    portraitChosen: '/characters/KaelElegido.png',
  },
  voss: {
    id:       'voss',
    name:     'Voss',
    codename: 'V-12',
    role:     'Strider',
    bio:      'Estratega de flujo. Mantiene cadencias bajo presión.',
    portrait:       '/characters/Voss.png',
    portraitChosen: '/characters/VossElegida.png',
  },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS);
export const DEFAULT_CHARACTER_ID = 'kael';

export function getCharacter(id) {
  return CHARACTERS[id] || CHARACTERS[DEFAULT_CHARACTER_ID];
}
export function listCharacters() {
  return CHARACTER_IDS.map(id => CHARACTERS[id]);
}
