// Guardian: crush — empuje extra a corta distancia. Clamped via _effSpeed.
const CRUSH_BOOST_FACTOR = 0.15;
const CRUSH_BOOST_CAP    = 0.5;

export class GuardianBehavior {
  update(enemy, delta, dir) {
    if (enemy.distanceToPlayer < 5.0) {
      const eff   = enemy._effSpeed ?? enemy.speed;
      const boost = Math.min(eff * CRUSH_BOOST_FACTOR, CRUSH_BOOST_CAP);
      enemy._group.position.addScaledVector(dir, boost * delta);
    }
  }
}
