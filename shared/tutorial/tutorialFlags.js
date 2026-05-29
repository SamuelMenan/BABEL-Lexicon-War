// Flags one-shot por tutorial. Versionado para forzar re-mostrar tras cambios mayores.

import { loadProfile, saveProfile } from '../services/playerProfile.js';

export const TUTORIAL_VERSIONS = {
  combat: 'v1',
  racing: 'v1',
  hangar: 'v1',
  typing: 'v1',
};

export function hasSeenTutorial(id) {
  const p = loadProfile();
  const v = p.tutorialsSeen?.[id];
  return v === TUTORIAL_VERSIONS[id];
}

export function markTutorialSeen(id) {
  const p = loadProfile();
  p.tutorialsSeen = { ...(p.tutorialsSeen || {}), [id]: TUTORIAL_VERSIONS[id] };
  saveProfile(p);
  return p.tutorialsSeen;
}

export function resetTutorialFlags() {
  const p = loadProfile();
  p.tutorialsSeen = {};
  saveProfile(p);
  return p.tutorialsSeen;
}

export function getAllSeen() {
  return loadProfile().tutorialsSeen || {};
}
