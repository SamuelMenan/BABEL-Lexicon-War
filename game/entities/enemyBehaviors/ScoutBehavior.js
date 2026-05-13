// Scout: dash periódico hacia el jugador.
export class ScoutBehavior {
  constructor() {
    this._specialTimer = 0;
    this._dashTimer    = 0;
  }
  update(enemy, delta, dir) {
    const cfg = enemy._cfg;
    this._specialTimer += delta;
    if (this._specialTimer >= cfg.specialCd) {
      this._specialTimer = 0;
      this._dashTimer = 0.4;
    }
    if (this._dashTimer > 0) {
      this._dashTimer -= delta;
      enemy._group.position.addScaledVector(dir, enemy.speed * 1.6 * delta);
    }
  }
}
