// Hardware quality tiers — set once at startup, read by rendering subsystems.

export const QUALITY = Object.freeze({ LOW: 'low', MID: 'mid', HIGH: 'high' });

// Particle and effect budgets per tier.
const QUALITY_PROFILES = Object.freeze({
  low: {
    particleMaxBursts:     6,
    particlePerBurst:      14,

    destroyPoolSize:       2,
    destroyLetterCount:    4,

    boosterStarSprite:     false,
    boosterLightMult:      0.55,
    bloomEnabled:          false, // skip UnrealBloomPass entirely — saves ~2 full scene renders/frame
    bloomResScale:         1.0,
  },
  mid: {
    particleMaxBursts:     12,
    particlePerBurst:      28,

    destroyPoolSize:       4,
    destroyLetterCount:    8,

    boosterStarSprite:     true,
    boosterLightMult:      1.0,
    bloomEnabled:          true,
    bloomResScale:         0.60, // blur passes at 60% res — ~3× cheaper than full, barely visible
  },
  high: {
    particleMaxBursts:     20,
    particlePerBurst:      40,

    destroyPoolSize:       6,
    destroyLetterCount:    12,

    boosterStarSprite:     true,
    boosterLightMult:      1.0,
    bloomEnabled:          true,
    // Bloom a 60% res — UnrealBloomPass tiene strength=0.06, calidad indistinguible visualmente
    // del 100% pero ~3× mas barato. Es solo el RT interno; final composite sigue full res.
    bloomResScale:         0.60,
  },
});

let _tier = QUALITY.MID;

// Suscriptores para cambios de tier en caliente. Los consumidores del perfil
// (ParticleEmitter, BoosterEffect, PostProcessing) lo leen en su CONSTRUCTOR,
// asi que sin esto un cambio de tier no tendria ningun efecto sobre lo ya
// construido.
const _listeners = new Set();

export function onQualityChange(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

function _notify() {
  for (const cb of _listeners) {
    try { cb(_tier, QUALITY_PROFILES[_tier]); }
    catch (e) { console.warn('[quality] listener fallo', e); }
  }
}

export function setQualityTier(tier) {
  if (!QUALITY_PROFILES[tier]) return;
  if (tier === _tier) return;
  _tier = tier;
  _notify();
}

// Orden de menor a mayor coste. Solo se usa para BAJAR.
const TIER_ORDER = [QUALITY.LOW, QUALITY.MID, QUALITY.HIGH];

/**
 * Baja un escalon de calidad. Devuelve el nuevo tier, o null si ya esta en LOW.
 *
 * Solo se degrada, nunca se sube: subir exigiria reconstruir pools y passes ya
 * asignados (el pool de particulas se dimensiona en el constructor, el bloom
 * se construye o no en init). Degradar solo requiere usar menos de lo que ya
 * existe, que es seguro y barato. Si el equipo va sobrado, dejarlo como esta
 * no cuesta nada.
 */
export function downgradeQualityTier() {
  const i = TIER_ORDER.indexOf(_tier);
  if (i <= 0) return null;
  const next = TIER_ORDER[i - 1];
  _tier = next;
  _notify();
  return next;
}

export function getQualityTier()    { return _tier; }
export function getQualityProfile() { return QUALITY_PROFILES[_tier]; }

/**
 * Infers quality tier from WebGL renderer capabilities and system hints.
 * Call once after THREE.WebGLRenderer is initialized.
 */
export function detectQualityTier(renderer) {
  const maxTex  = renderer.capabilities.maxTextureSize;
  const cores   = navigator.hardwareConcurrency ?? 4;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  // Low-end signals: mobile UA, very limited texture memory, or minimal CPU
  if (isMobile || maxTex <= 4096 || cores <= 2) return QUALITY.LOW;

  // High-end: large texture budget + many cores (desktop discrete GPU)
  if (maxTex >= 16384 && cores >= 8) return QUALITY.HIGH;

  return QUALITY.MID;
}
