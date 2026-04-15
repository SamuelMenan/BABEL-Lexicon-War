// Mueve entidades y detecta si alcanzaron al jugador

import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';

const PLAYER_RADIUS = 2.5;

export class PhysicsSystem {
  constructor() {
    this.enemies = [];
  }

  setEnemies(enemies) { this.enemies = enemies; }

  update(delta) {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      enemy.update(delta);

      if (enemy.distanceToPlayer <= PLAYER_RADIUS) {
        EventBus.emit(EventTypes.ENEMY_REACHED, { id: enemy.id });
      }
    }
  }
}
