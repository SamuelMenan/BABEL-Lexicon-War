// Scout: dash periódico hacia el jugador.
// Usa _effSpeed (clamped) en vez de enemy.speed raw — evita explosión en waves altas.
const DASH_BOOST_FACTOR = 0.35;   // boost relativo a effSpeed
const DASH_BOOST_CAP    = 0.9;    // tope absoluto units/s extra

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
      const eff   = enemy._effSpeed ?? enemy.speed;
      const boost = Math.min(eff * DASH_BOOST_FACTOR, DASH_BOOST_CAP);
      enemy._group.position.addScaledVector(dir, boost * delta);
    }
  }
}
