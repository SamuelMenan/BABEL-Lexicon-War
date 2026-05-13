// Runtime FPS sampler → auto-degrada calidad gráfica.
// Suscribe renderer + post para ajustar pixelRatio y bloom on-the-fly.
//
// Uso:
//   const qm = new QualityManager(renderer, post);
//   qm.start();
//   loop: qm.tick(deltaMs);

import { QUALITY, getQualityTier, setQualityTier, getQualityProfile } from '../../shared/qualitySettings.js';

const SAMPLE_WINDOW_MS = 1500;   // ventana evaluación
const DOWNGRADE_FPS    = 45;     // por debajo: bajar calidad
const UPGRADE_FPS      = 58;     // por encima sostenido: subir
const STABILITY_MS     = 6000;   // tiempo sostenido antes de subir
const COOLDOWN_MS      = 4000;   // pausa entre cambios para evitar flapping

// Cadena: high → mid → low → veryLow
const PIXEL_RATIO_BY_TIER = {
  high: () => Math.min(window.devicePixelRatio, 2),
  mid:  () => 1.0,
  low:  () => Math.min(0.85, window.devicePixelRatio),
  veryLow: () => 0.65,
};

export class QualityManager {
  constructor(renderer, post, { onTierChange } = {}) {
    this._renderer  = renderer;
    this._post      = post;
    this._onChange  = onTierChange ?? null;

    this._enabled       = true;
    this._currentTier   = getQualityTier();
    this._dprOverride   = null;
    this._frames        = 0;
    this._acc           = 0;
    this._goodStreak    = 0;
    this._cooldown      = 0;
  }

  start() { this._enabled = true; }
  stop()  { this._enabled = false; }
  forceTier(tier) { this._applyTier(tier); }

  tick(deltaMs) {
    if (!this._enabled) return;
    this._frames++;
    this._acc      += deltaMs;
    this._cooldown -= deltaMs;

    if (this._acc < SAMPLE_WINDOW_MS) return;

    const fps = (this._frames * 1000) / this._acc;
    this._acc = 0; this._frames = 0;

    if (this._cooldown > 0) return;

    if (fps < DOWNGRADE_FPS) {
      this._downgrade();
      this._goodStreak = 0;
      this._cooldown   = COOLDOWN_MS;
    } else if (fps >= UPGRADE_FPS) {
      this._goodStreak += SAMPLE_WINDOW_MS;
      if (this._goodStreak >= STABILITY_MS) {
        this._upgrade();
        this._goodStreak = 0;
        this._cooldown   = COOLDOWN_MS;
      }
    } else {
      this._goodStreak = 0;
    }
  }

  _downgrade() {
    const order = ['high', 'mid', 'low', 'veryLow'];
    const idx = order.indexOf(this._currentTier);
    if (idx < 0 || idx === order.length - 1) return;
    this._applyTier(order[idx + 1]);
  }

  _upgrade() {
    const order = ['high', 'mid', 'low', 'veryLow'];
    const idx = order.indexOf(this._currentTier);
    if (idx <= 0) return;
    this._applyTier(order[idx - 1]);
  }

  _applyTier(tier) {
    this._currentTier = tier;
    // veryLow no existe en QUALITY_PROFILES; mapear a 'low' para profiles
    const profileTier = (tier === 'veryLow') ? QUALITY.LOW : tier;
    setQualityTier(profileTier);

    // Pixel ratio
    const dpr = (PIXEL_RATIO_BY_TIER[tier] ?? PIXEL_RATIO_BY_TIER.mid)();
    this._renderer.setPixelRatio(dpr);
    this._renderer.setSize(window.innerWidth, window.innerHeight, false);

    // Bloom on/off + resScale via post hooks
    const profile = getQualityProfile();
    this._post?.setBloomEnabled?.(profile.bloomEnabled && tier !== 'veryLow');
    this._post?.setBloomResScale?.(profile.bloomResScale ?? 1.0);

    console.info(`[QualityManager] tier=${tier} dpr=${dpr.toFixed(2)} bloom=${profile.bloomEnabled}`);
    this._onChange?.(tier);
  }
}
