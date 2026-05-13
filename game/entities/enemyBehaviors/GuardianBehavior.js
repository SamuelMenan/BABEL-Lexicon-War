// Guardian: crush — empuje extra a corta distancia.
export class GuardianBehavior {
  update(enemy, delta, dir) {
    if (enemy.distanceToPlayer < 5.0) {
      enemy._group.position.addScaledVector(dir, enemy.speed * 0.35 * delta);
    }
  }
}
