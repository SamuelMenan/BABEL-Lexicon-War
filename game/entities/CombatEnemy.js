import * as THREE from 'three';
import { Entity } from './Entity.js';
import { COLORS, ENEMY_BASE_SPEED } from '../../shared/constants.js';
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
import { createBehavior } from './enemyBehaviors/behaviorRegistry.js';
import { QUALITY, getQualityTier } from '../../shared/qualitySettings.js';
import { waveTrace } from '../debug/WaveTrace.js';

// Re-exports: preserve external import surface (SpawnDirector, CombatSceneManager).
export { ENEMY_TYPES, TYPE_META } from '../data/enemyConfigs.js';

export class CombatEnemy extends Entity {
  constructor(word, position, speed = ENEMY_BASE_SPEED, type = ENEMY_TYPES.SCOUT) {
    super();
    this._group = new THREE.Group();
    this.mesh   = this._group;
    this._rings    = [];
    this._ringMats = [];
    this.reset(word, position, type, speed);
  }

  // Re-init para Object Pooling. Fast path: si el type no cambió desde el último
  // build, reusamos materiales/meshes — solo restauramos estado (color, opacidad,
  // intensidad). Evita dispose+rebuild de N materiales en cada acquire del pool.
  reset(word, position, type = ENEMY_TYPES.SCOUT, speed = ENEMY_BASE_SPEED) {
    this.id        = crypto.randomUUID();
    this.word      = word;
    this.speed     = speed;
    this.targeted  = false;
    this.active    = true;
    this._type     = type;
    this._cfg      = CFGS[type] ?? CFGS.scout;
    this._t        = Math.random() * Math.PI * 2;

    if (this._lastBuiltType !== type) {
      waveTrace.bracket('reset.fullRebuild', () => {
        this._disposeOwnMaterials();
        this._group.clear();
        this._rings.length    = 0;
        this._ringMats.length = 0;
        this._behavior = createBehavior(type);
        this._build();
        this._lastBuiltType = type;
      }, { type, prev: this._lastBuiltType });
    } else {
      waveTrace.bracket('reset.fastPath', () => {
        this._behavior = createBehavior(type);
        this._restoreMaterialState();
        // Restaurar frustumCulled (warmShaders puede haberlo desactivado).
        this._group.traverse(o => { o.frustumCulled = true; });
      }, { type });
    }

    this._group.scale.setScalar(1);
    this._group.rotation.set(0, 0, 0);
    if (position) this._group.position.copy(position);
    this._group.visible = true;
    return this;
  }

  // Restaura color/opacidad/intensidad a valores del cfg — limpia mutaciones
  // dejadas por behaviors (phantom phase, sentinel pulse) o setTargeted previo.
  _restoreMaterialState() {
    const cfg = this._cfg;
    const c   = cfg.color;
    if (this._lineMat) {
      this._lineMat.color.set(c);
      this._lineMat.opacity = cfg.hullOpacity ?? 0.9;
    }
    if (this._coreMat) {
      this._coreMat.color.set(c);
      this._coreMat.emissive.set(c);
      this._coreMat.emissiveIntensity = cfg.emissiveInt;
    }
    for (const m of this._ringMats) {
      m.color.set(c); m.emissive.set(c);
      m.emissiveIntensity = cfg.emissiveInt * 0.6;
    }
    if (this._glow?.material) this._glow.material.opacity = cfg.glowOp;
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

    // hull edges - USE CACHE (tesseract usa prebuiltEdges)
    const edges = waveTrace.bracket('_build.getSharedEdges',
      () => getSharedEdges(this._type, cfg.geo, !!cfg.prebuiltEdges),
      { type: this._type });
    // Solo marca transparent si opacity<1 (alpha sort cuesta — evitar cuando es opaco).
    const hullOp = cfg.hullOpacity ?? 0.9;
    this._lineMat = new THREE.LineBasicMaterial({
      color,
      transparent: hullOp < 0.98,
      opacity: hullOp,
    });
    const hull = new THREE.LineSegments(edges, this._lineMat);
    this._group.add(hull);

    // core: nodo wireframe sólido (sin esfera opaca lavando geometría interna).
    this._coreMat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: cfg.emissiveInt,
      roughness: 0.6, metalness: 0.25, flatShading: true,
      wireframe: true,
    });
    this._core = new THREE.Mesh(sharedCore, this._coreMat);
    this._core.scale.setScalar(cfg.coreR * 0.55); // núcleo más pequeño = lectura limpia
    this._group.add(this._core);

    // Glow sprite recortado: evita la lectura de esfera. Se reserva para apex en tier HIGH.
    const tier = getQualityTier();
    const showGlow = this._type === 'apex' && tier === QUALITY.HIGH;
    if (showGlow) {
      this._glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: getSoftGlowTexture(), color: cfg.glowColor,
        transparent: true, opacity: cfg.glowOp,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      this._glow.scale.set(cfg.glowSize, cfg.glowSize, 1);
      this._group.add(this._glow);
    } else {
      this._glow = null;
    }

    // rings - USE CACHE
    cfg.rings.forEach(rd => {
      const rg  = getSharedRing(rd.r, rd.tube);
      const mat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: cfg.emissiveInt * 0.6,
        roughness: 0.5, metalness: 0.12, flatShading: true,
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
    // Clamp velocidad efectiva: [MIN, MAX]. Stored para que behaviors NO usen
    // `this.speed` directo (eso bypassa cap en waves altas).
    const raw      = this.speed * cfg.speedMult;
    this._effSpeed = Math.min(CombatEnemy.MAX_APPROACH_SPEED,
                              Math.max(CombatEnemy.MIN_APPROACH_SPEED, raw));
    this._group.position.addScaledVector(CombatEnemy._tempDir, this._effSpeed * delta);

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
// Clamp velocidad efectiva (units/s). Playable a 80-100 wpm. MAX bajo a propósito
// — dificultad escala con cantidad/longitud de palabras, no con velocidad.
CombatEnemy.MIN_APPROACH_SPEED = 1.2;
CombatEnemy.MAX_APPROACH_SPEED = 2.6;
