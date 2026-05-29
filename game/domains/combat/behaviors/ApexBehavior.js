// Apex: nova — burst de escala + emissive cada specialCd.
// novaActive toma control del scale del grupo durante el burst (Enemy.update lo respeta).
export class ApexBehavior {
  constructor() {
    this._specialTimer = 0;
    this._novaTimer    = 0;
  }
  get novaActive() { return this._novaTimer > 0; }
  update(enemy, delta, _dir) {
    const cfg = enemy._cfg;
    this._specialTimer += delta;
    if (this._specialTimer >= cfg.specialCd) {
      this._specialTimer = 0;
      this._novaTimer    = 0.8;
      this._novaWasActive = true;
    }
    if (this._novaTimer > 0) {
      this._novaTimer -= delta;
      const progress  = 1 - this._novaTimer / 0.8;
      const intensity = cfg.emissiveInt + Math.sin(progress * Math.PI) * cfg.emissiveInt * 2.8;
      enemy._coreMat.emissiveIntensity = intensity;
      enemy._group.scale.setScalar(1.0 + Math.sin(progress * Math.PI) * 0.12);
    } else if (this._novaWasActive) {
      this._novaWasActive = false;
      enemy._coreMat.emissiveIntensity = enemy.targeted ? 1.8 : cfg.emissiveInt;
    }
  }
}
