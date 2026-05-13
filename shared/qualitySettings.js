// Hardware quality tiers — set once at startup, read by rendering subsystems.

export const QUALITY = Object.freeze({ LOW: 'low', MID: 'mid', HIGH: 'high' });

// Particle and effect budgets per tier.
export const QUALITY_PROFILES = Object.freeze({
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
    // del 100% pero ~3× más barato. Es solo el RT interno; final composite sigue full res.
    bloomResScale:         0.60,
  },
});

let _tier = QUALITY.MID;

export function setQualityTier(tier) {
  if (!QUALITY_PROFILES[tier]) return;
  _tier = tier;
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
