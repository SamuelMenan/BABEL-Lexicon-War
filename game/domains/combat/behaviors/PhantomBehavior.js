// Phantom: phase — ciclo de invisibilidad parcial sobre opacidad hull + glow.
export class PhantomBehavior {
  constructor() { this._specialTimer = 0; }
  update(enemy, delta, _dir) {
    const cfg = enemy._cfg;
    this._specialTimer += delta;
    const phasePos  = (this._specialTimer % cfg.specialCd) / cfg.specialCd;
    const phaseHide = phasePos < 0.40;
    enemy._lineMat.opacity = phaseHide ? 0.08 : (cfg.hullOpacity ?? 0.45);
    if (enemy._glow) {
      enemy._glow.material.opacity = phaseHide ? 0.06 : cfg.glowOp;
    }
  }
}
