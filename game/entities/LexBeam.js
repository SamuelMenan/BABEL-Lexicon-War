import * as THREE from 'three';
import { Entity } from './Entity.js';
import { COLORS_FLOW } from '../../shared/constants.js';
import { createBeam } from '../rendering/fx/BeamVisual.js';

const BEAM_LIFE = 0.10;
// Multiplica el scaleMul del muzzle para que el haz sea visible en escala combate.
const BEAM_SCALE_BOOST = 1;

export class LexBeam extends Entity {
  // origin: Vector3 (origen fijo) o THREE.Object3D (anchor del muzzle —
  // worldPosition leida cada frame; evita lag cuando la nave se mueve).
  constructor(origin, target, onHit, shipColor = null, scaleMul = 1.0) {
    super();
    if (origin && origin.isObject3D) {
      this._anchor = origin;
      this._origin = new THREE.Vector3();
      origin.getWorldPosition(this._origin);
    } else {
      this._anchor = null;
      this._origin = origin.clone();
    }
    this._target = target;
    this._age    = 0;

    const beamColor = shipColor ?? COLORS_FLOW.BEAM;
    this._visual = createBeam({ color: beamColor, scale: scaleMul * BEAM_SCALE_BOOST });
    this.mesh = this._visual.root;

    this._visual.setSegment(this._origin, this._target.position);
    onHit();
  }

  update(delta) {
    if (!this.active) return;
    this._age += delta;
    if (this._age >= BEAM_LIFE || !this._target.active) {
      this.active = false;
      return;
    }
    // Re-leer origen si tenemos anchor dinamico (nave en movimiento).
    if (this._anchor) this._anchor.getWorldPosition(this._origin);
    // Tracking real del extremo final cada frame.
    this._visual.setSegment(this._origin, this._target.position);
    const k = 1 - this._age / BEAM_LIFE;
    this._visual.fade(k);
  }

  removeFromScene(scene) {
    super.removeFromScene(scene);
    this._visual?.dispose();
    this._visual = null;
  }
}
