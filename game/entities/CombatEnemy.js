import * as THREE from 'three';
import { Entity } from './Entity.js';
import { BLOOM_LAYER, COLORS, ENEMY_BASE_SPEED } from '../../shared/constants.js';
import { getSoftGlowTexture } from '../../shared/softVisuals.js';
import {
  CFGS,
  ENEMY_TYPES,
  SPEED_MULT_MIN,
  SPEED_MULT_RANGE,
} from '../data/enemyConfigs.js';
import {
  getSharedEdges,
  getSharedRing,
  sharedCore,
} from '../rendering/EnemyGeometryCache.js';
import { createBehavior } from './enemyBehaviors/index.js';

// Re-exports — preserve external import surface (SpawnDirector, CombatSceneManager).
export { ENEMY_TYPES, TYPE_META, pickEnemyType } from '../data/enemyConfigs.js';

export class CombatEnemy extends Entity {
  constructor(word, position, speed = ENEMY_BASE_SPEED, type = ENEMY_TYPES.SCOUT) {
    super();
    this._group = new THREE.Group();
    this.mesh   = this._group;
    this._rings    = [];
    this._ringMats = [];
    this.reset(word, position, type, speed);
  }

  // Re-init para Object Pooling: reutiliza Group + behaviors slots, recrea materiales
  // (geometrías permanecen cacheadas en EnemyGeometryCache — sin GC pressure).
  reset(word, position, type = ENEMY_TYPES.SCOUT, speed = ENEMY_BASE_SPEED) {
    this.id        = crypto.randomUUID();
    this.word      = word;
    this.speed     = speed;
    this.targeted  = false;
    this.active    = true;
    this._type     = type;
    this._cfg      = CFGS[type] ?? CFGS.scout;
    this._t        = Math.random() * Math.PI * 2;

    this._disposeOwnMaterials();
    this._group.clear();
    this._group.scale.setScalar(1);
    this._group.rotation.set(0, 0, 0);
    this._rings.length    = 0;
    this._ringMats.length = 0;

    this._behavior = createBehavior(type);
    this._build();
    if (position) this._group.position.copy(position);
    this._group.visible = true;
    return this;
  }

  _disposeOwnMaterials() {
    this._lineMat?.dispose();
    this._coreMat?.dispose();
    this._ringMats.forEach(m => m.dispose());
    if (this._glow?.material) this._glow.material.dispose();
    this._lineMat = null;
    this._coreMat = null;
    this._glow    = null;
  }

  // Pool: ocultar/restaurar sin remover del scene graph.
  setVisible(v) { this._group.visible = !!v; }
  isVisible()   { return this._group.visible; }

  _build() {
    const cfg   = this._cfg;
    const color = cfg.color;

    // hull edges - USE CACHE
    const edges = getSharedEdges(this._type, cfg.geo);
    this._lineMat = new THREE.LineBasicMaterial({
      color, transparent: true, opacity: cfg.hullOpacity ?? 0.9,
    });
    const hull = new THREE.LineSegments(edges, this._lineMat);
    this._group.add(hull);

    // core - USE CACHE
    this._coreMat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: cfg.emissiveInt,
      transparent: true, opacity: 0.55,
    });
    this._core = new THREE.Mesh(sharedCore, this._coreMat);
    this._core.scale.setScalar(cfg.coreR); // scale the unit sphere
    this._group.add(this._core);

    // glow sprite
    this._glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getSoftGlowTexture(), color: cfg.glowColor,
      transparent: true, opacity: cfg.glowOp,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this._glow.scale.set(cfg.glowSize, cfg.glowSize, 1);
    this._group.add(this._glow);

    // rings - USE CACHE
    cfg.rings.forEach(rd => {
      const rg  = getSharedRing(rd.r, rd.tube);
      const mat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: cfg.emissiveInt * 0.6,
      });
      const mesh = new THREE.Mesh(rg, mat);
      const grp = new THREE.Group();
      grp.add(mesh);
      if (rd.rotX !== undefined) grp.rotation.x = rd.rotX;
      if (rd.rotZ !== undefined) grp.rotation.z = rd.rotZ;
      grp.userData.rotSpeed = rd.rotSpeed ?? [0, 1, 0];
      this._rings.push(grp);
      this._ringMats.push(mat);
      this._group.add(grp);
    });
  }

  setTargeted(val) {
    this.targeted = val;
    const color = val ? COLORS.ENEMY_TARGETED : this._cfg.color;
    this._lineMat.color.set(color);
    this._coreMat.color.set(color);
    this._coreMat.emissive.set(color);
    this._coreMat.emissiveIntensity = val ? 1.8 : this._cfg.emissiveInt;
    this._ringMats.forEach(m => {
      m.color.set(color); m.emissive.set(color);
      m.emissiveIntensity = val ? 1.2 : this._cfg.emissiveInt * 0.6;
    });
    if (this._glow?.material) this._glow.material.opacity = val ? 0.85 : this._cfg.glowOp;
  }

  hitFlash() {
    this._coreMat.emissiveIntensity = 5;
    setTimeout(() => {
      this._coreMat.emissiveIntensity = this.targeted ? 1.8 : this._cfg.emissiveInt;
    }, 100);
  }

  getThreatScore() {
    const cfg   = this._cfg;
    const speed = Math.min(1, Math.max(0, (cfg.speedMult - SPEED_MULT_MIN) / SPEED_MULT_RANGE));
    const hp    = cfg.hpTier / 5;
    const score = 0.35 * speed + 0.25 * hp + 0.20 * cfg.lexHeatImpact + 0.20 * cfg.specialPower;
    return Math.min(1, Math.max(0, score));
  }

  getProfile() {
    const cfg = this._cfg;
    return {
      type:             this._type,
      speedMult:        cfg.speedMult,
      hpTier:           cfg.hpTier,
      lexHeatImpact:    cfg.lexHeatImpact,
      shieldDamageMult: cfg.shieldDamageMult,
      hullDamageMult:   cfg.hullDamageMult,
      special:          cfg.special,
      threatBase:       cfg.threatBase,
      threatScore:      this.getThreatScore(),
    };
  }

  update(delta) {
    if (!this.active) return;
    this._t += delta;
    const cfg = this._cfg;

    CombatEnemy._tempDir.subVectors(CombatEnemy.PLAYER_POS, this._group.position).normalize();
    this._group.position.addScaledVector(CombatEnemy._tempDir, this.speed * cfg.speedMult * delta);

    this._behavior.update(this, delta, CombatEnemy._tempDir);

    this._group.rotation.x += delta * cfg.tumble[0];
    this._group.rotation.y += delta * cfg.tumble[1];

    this._rings.forEach(grp => {
      const rs = grp.userData.rotSpeed;
      grp.rotation.x += delta * rs[0];
      grp.rotation.y += delta * rs[1];
      grp.rotation.z += delta * rs[2];
    });

    const pulse = cfg.coreScale + Math.sin(this._t * cfg.pulseFreq) * 0.14;
    this._core.scale.setScalar(pulse);
    if (this._glow) {
      this._glow.scale.setScalar(cfg.glowSize + Math.sin(this._t * cfg.glowFreq) * 0.18);
    }

    // apex nova owns scale during burst; targeted wobble applies otherwise
    if (!(this._behavior.novaActive)) {
      if (this.targeted) {
        this._group.scale.setScalar(1 + Math.sin(this._t * 18) * 0.03);
      } else {
        this._group.scale.setScalar(1);
      }
    }
  }

  get distanceToPlayer() { return this._group.position.distanceTo(CombatEnemy.PLAYER_POS); }
  get position()         { return this._group.position; }
}

CombatEnemy.PLAYER_POS = new THREE.Vector3(0, 0.2, 2);
CombatEnemy._tempDir = new THREE.Vector3();
