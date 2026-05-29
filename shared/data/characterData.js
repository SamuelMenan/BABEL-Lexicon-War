// Catalogo de personajes/pilotos seleccionables en hangar.

import { getLocale } from './i18n/index.js';

const CHARACTERS_ES = {
  kael: {
    id:       'kael',
    name:     'Kael',
    codename: 'K-07',
    role:     'Vanguard',
    bio:      'Piloto de asalto. Lectura rapida, reflejos quirurgicos.',
    portrait:       '/characters/Kael.png',
    portraitChosen: '/characters/KaelElegido.png',
  },
  voss: {
    id:       'voss',
    name:     'Voss',
    codename: 'V-12',
    role:     'Strider',
    bio:      'Estratega de flujo. Mantiene cadencias bajo presion.',
    portrait:       '/characters/Voss.png',
    portraitChosen: '/characters/VossElegida.png',
  },
};

const CHARACTERS_EN = {
  kael: {
    id:       'kael',
    name:     'Kael',
    codename: 'K-07',
    role:     'Vanguard',
    bio:      'Assault pilot. Rapid reading, surgical reflexes.',
    portrait:       '/characters/Kael.png',
    portraitChosen: '/characters/KaelElegido.png',
  },
  voss: {
    id:       'voss',
    name:     'Voss',
    codename: 'V-12',
    role:     'Strider',
    bio:      'Flow strategist. Maintains cadences under pressure.',
    portrait:       '/characters/Voss.png',
    portraitChosen: '/characters/VossElegida.png',
  },
};

export function getCharacters() {
  return getLocale() === 'en' ? CHARACTERS_EN : CHARACTERS_ES;
}

export const CHARACTERS = new Proxy({}, {
  get: (_, k) => getCharacters()[k],
  ownKeys: () => Reflect.ownKeys(getCharacters()),
  getOwnPropertyDescriptor: (_, k) => Object.getOwnPropertyDescriptor(getCharacters(), k),
});

export const CHARACTER_IDS = Object.keys(CHARACTERS_ES);
export const DEFAULT_CHARACTER_ID = 'kael';

export function getCharacter(id) {
  return getCharacters()[id] || getCharacters()[DEFAULT_CHARACTER_ID];
}

export function listCharacters() {
  return CHARACTER_IDS.map(id => getCharacters()[id]);
}
