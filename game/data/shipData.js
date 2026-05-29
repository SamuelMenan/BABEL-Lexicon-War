// Datos de presentacion del hangar por nave — no afectan logica de juego
const SHIP_DATA = {
  spaceship: {
    coreId: '0X14·A2',
    stats: { velocidad: 6, escudo: 5, precision: 7, capacidad: 6 },
    arsenal: [
      { name: 'Lex·Cannon I', slot: 'A·I',  locked: false },
      { name: 'Verb·Burst',   slot: 'B·II', locked: false },
      { name: 'Sigil·Mines',  slot: 'C·I',  locked: false },
      { name: null,           slot: '—',    locked: true  },
    ],
  },
  spaceshipnew: {
    coreId: '0X22·B1',
    stats: { velocidad: 8, escudo: 4, precision: 6, capacidad: 7 },
    arsenal: [
      { name: 'Lex·Cannon II', slot: 'A·I',  locked: false },
      { name: 'Surge·Burst',   slot: 'B·I',  locked: false },
      { name: null,            slot: '—',    locked: true  },
      { name: null,            slot: '—',    locked: true  },
    ],
  },
  cb1: {
    coreId: '0X31·C4',
    stats: { velocidad: 5, escudo: 8, precision: 5, capacidad: 8 },
    arsenal: [
      { name: 'Shield·Pulse', slot: 'A·I',  locked: false },
      { name: 'Verb·Burst',   slot: 'B·II', locked: false },
      { name: 'Lex·Barrier',  slot: 'C·II', locked: false },
      { name: null,           slot: '—',    locked: true  },
    ],
  },
  ig127: {
    coreId: '0X44·D0',
    stats: { velocidad: 9, escudo: 3, precision: 8, capacidad: 5 },
    arsenal: [
      { name: 'Lex·Cannon III', slot: 'A·II', locked: false },
      { name: 'Nova·Strike',    slot: 'B·I',  locked: false },
      { name: null,             slot: '—',    locked: true  },
      { name: null,             slot: '—',    locked: true  },
    ],
  },
  lowpoly: {
    coreId: '0X08·A0',
    stats: { velocidad: 4, escudo: 6, precision: 6, capacidad: 4 },
    arsenal: [
      { name: 'Lex·Cannon I', slot: 'A·I', locked: false },
      { name: null,           slot: '—',   locked: true  },
      { name: null,           slot: '—',   locked: true  },
      { name: null,           slot: '—',   locked: true  },
    ],
  },
  colaid1: {
    coreId: '0X55·E3',
    stats: { velocidad: 7, escudo: 6, precision: 7, capacidad: 6 },
    arsenal: [
      { name: 'Lex·Cannon II', slot: 'A·I',  locked: false },
      { name: 'Verb·Burst',    slot: 'B·II', locked: false },
      { name: 'Sigil·Mines',   slot: 'C·I',  locked: false },
      { name: 'Echo·Field',    slot: 'D·I',  locked: false },
    ],
  },
  waldeinsamkeit: {
    coreId: '0X99·WCS',
    stats: { velocidad: 3, escudo: 10, precision: 9, capacidad: 10 },
    arsenal: [
      { name: 'Survey·Beam',    slot: 'A·I',   locked: false },
      { name: 'Lex·Barrier II', slot: 'B·III', locked: false },
      { name: 'Sigil·Mines II', slot: 'C·II',  locked: false },
      { name: 'Echo·Field II',  slot: 'D·II',  locked: false },
    ],
  },
  // Nave secreta (Juanito01) — regalo privado. Stats balanceados (6-7), especial
  // pero no roto.
  xwing: {
    coreId: '0XRG·001',
    stats: { velocidad: 7, escudo: 6, precision: 7, capacidad: 6 },
    arsenal: [
      { name: 'Proton·Torpedo', slot: 'A·I',  locked: false },
      { name: 'Quad·Laser',     slot: 'B·II', locked: false },
      { name: 'Astromech·Aid',  slot: 'C·I',  locked: false },
      { name: 'S·Foil·Lock',    slot: 'D·I',  locked: false },
    ],
  },
};

export function getShipData(shipId) {
  return SHIP_DATA[shipId] ?? SHIP_DATA.spaceship;
}
