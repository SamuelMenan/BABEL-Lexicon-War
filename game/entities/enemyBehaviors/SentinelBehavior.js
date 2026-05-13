// Sentinel: pulso de emissive cada specialCd segundos.
export class SentinelBehavior {
  constructor() {
    this._specialTimer = 0;
    this._pulseTimer   = 0;
    this._pulseActive  = false;
  }
  update(enemy, delta, _dir) {
    const cfg = enemy._cfg;
    this._specialTimer += delta;
    if (this._specialTimer >= cfg.specialCd) {
      this._specialTimer = 0;
      this._pulseTimer   = 0.5;
      this._pulseActive  = true;
    }
    if (this._pulseTimer > 0) {
      this._pulseTimer -= delta;
      enemy._coreMat.emissiveIntensity = cfg.emissiveInt * 3.8;
    } else if (this._pulseActive) {
      this._pulseActive = false;
      enemy._coreMat.emissiveIntensity = enemy.targeted ? 1.8 : cfg.emissiveInt;
    }
  }
}
