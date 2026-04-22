import * as THREE from 'three';
import { Entity } from './Entity.js';
import { BLOOM_LAYER, COLORS, ENEMY_BASE_SPEED } from '../../shared/constants.js';
import { getSoftGlowTexture } from '../../shared/softVisuals.js';

export const ENEMY_TYPES = {
  SCOUT:    'scout',    // icosaedro pequeño, cyan, rápido
  SENTINEL: 'sentinel', // octaedro medio, violeta, 3 anillos
  GUARDIAN: 'guardian', // dodecaedro grande, naranja, lento
  PHANTOM:  'phantom',  // tetraedro, teal translúcido, sin anillos
  APEX:     'apex',     // icosaedro grande, dorado, 4 anillos, boss
};

const CFGS = {
  scout: {
    geo: () => new THREE.IcosahedronGeometry(0.55, 1),
    color: 0xff4466, glowColor: 0xff4466,
    coreR: 0.18, coreScale: 1,
    glowSize: 2.4, glowOp: 0.5,
    rings: [
      { r: 0.85, tube: 0.035, rotX: Math.PI/3,       rotSpeed: [0,1.5,0] },
      { r: 0.85, tube: 0.035, rotZ: Math.PI/2.5,     rotSpeed: [1.2,0,0] },
    ],
    speedMult: 1.25, tumble: [0.7, 1.0], pulseFreq: 2.5, glowFreq: 2.1,
    emissiveInt: 0.8,
    rarityWeight: 0.34, hpTier: 1,
    lexHeatImpact: 0.20, shieldDamageMult: 1.10, hullDamageMult: 0.80,
    special: 'dash', specialCd: 2.8, specialPower: 0.35, threatBase: 0.42,
  },
  sentinel: {
    geo: () => new THREE.OctahedronGeometry(0.72, 0),
    color: 0xaa44ff, glowColor: 0x8822ee,
    coreR: 0.22, coreScale: 1,
    glowSize: 3.2, glowOp: 0.55,
    rings: [
      { r: 1.0,  tube: 0.04, rotX: Math.PI/4,       rotSpeed: [0, 1.1, 0] },
      { r: 1.0,  tube: 0.04, rotZ: Math.PI/2,        rotSpeed: [0.9, 0, 0] },
      { r: 0.65, tube: 0.03, rotX: Math.PI/1.5,      rotSpeed: [0, -1.8, 0] },
    ],
    speedMult: 1.0, tumble: [0.5, 0.75], pulseFreq: 2.0, glowFreq: 1.7,
    emissiveInt: 0.9,
    rarityWeight: 0.24, hpTier: 2,
    lexHeatImpact: 0.55, shieldDamageMult: 1.00, hullDamageMult: 1.00,
    special: 'pulse', specialCd: 3.6, specialPower: 0.50, threatBase: 0.56,
  },
  guardian: {
    geo: () => new THREE.DodecahedronGeometry(0.9, 0),
    color: 0xff8800, glowColor: 0xff6600,
    coreR: 0.28, coreScale: 1,
    glowSize: 4.0, glowOp: 0.6,
    rings: [
      { r: 1.3,  tube: 0.055, rotX: Math.PI/3,      rotSpeed: [0, 0.7, 0] },
      { r: 1.3,  tube: 0.055, rotZ: Math.PI/2.5,    rotSpeed: [0.6, 0, 0] },
      { r: 0.9,  tube: 0.04,  rotX: Math.PI/1.8,    rotSpeed: [0, -1.0, 0] },
    ],
    speedMult: 0.65, tumble: [0.35, 0.55], pulseFreq: 1.6, glowFreq: 1.4,
    emissiveInt: 1.0,
    rarityWeight: 0.18, hpTier: 4,
    lexHeatImpact: 0.30, shieldDamageMult: 0.90, hullDamageMult: 1.35,
    special: 'crush', specialCd: 4.2, specialPower: 0.62, threatBase: 0.63,
  },
  phantom: {
    geo: () => new THREE.TetrahedronGeometry(0.8, 0),
    color: 0x00eedd, glowColor: 0x00ccbb,
    coreR: 0.16, coreScale: 0.85,
    glowSize: 3.8, glowOp: 0.35,
    rings: [],
    speedMult: 1.1, tumble: [1.1, 1.4], pulseFreq: 3.5, glowFreq: 3.0,
    emissiveInt: 0.6, hullOpacity: 0.45,
    rarityWeight: 0.16, hpTier: 2,
    lexHeatImpact: 0.70, shieldDamageMult: 0.95, hullDamageMult: 0.95,
    special: 'phase', specialCd: 3.0, specialPower: 0.58, threatBase: 0.60,
  },
  apex: {
    geo: () => new THREE.IcosahedronGeometry(1.1, 1),
    color: 0xffdd44, glowColor: 0xffaa00,
    coreR: 0.35, coreScale: 1,
    glowSize: 5.5, glowOp: 0.7,
    rings: [
      { r: 1.6,  tube: 0.06,  rotX: Math.PI/3,      rotSpeed: [0, 0.55, 0] },
      { r: 1.6,  tube: 0.06,  rotZ: Math.PI/2.5,    rotSpeed: [0.5, 0, 0] },
      { r: 1.1,  tube: 0.04,  rotX: Math.PI/1.5,    rotSpeed: [0, -0.9, 0] },
      { r: 0.75, tube: 0.03,  rotZ: Math.PI/1.2,    rotSpeed: [-0.7, 0.4, 0] },
    ],
    speedMult: 0.5, tumble: [0.3, 0.4], pulseFreq: 1.2, glowFreq: 1.0,
    emissiveInt: 1.4,
    rarityWeight: 0.08, hpTier: 5,
    lexHeatImpact: 0.85, shieldDamageMult: 1.20, hullDamageMult: 1.45,
    special: 'nova', specialCd: 5.0, specialPower: 0.85, threatBase: 0.82,
  },
};

// Read-only data snapshot for Spawn Director — mirrors CFGS fields used for composition
export const TYPE_META = {
  scout:    { threatBase: 0.42, rarityWeight: 0.34, lexHeatImpact: 0.20 },
  sentinel: { threatBase: 0.56, rarityWeight: 0.24, lexHeatImpact: 0.55 },
  guardian: { threatBase: 0.63, rarityWeight: 0.18, lexHeatImpact: 0.30 },
  phantom:  { threatBase: 0.60, rarityWeight: 0.16, lexHeatImpact: 0.70 },
  apex:     { threatBase: 0.82, rarityWeight: 0.08, lexHeatImpact: 0.85 },
};

// speed range across all types: [0.5, 1.25]
const SPEED_MULT_MIN   = 0.5;
const SPEED_MULT_RANGE = 0.75;

export function pickEnemyType(word = '', wave = 1) {
  const w = {};
  for (const [t, c] of Object.entries(CFGS)) w[t] = c.rarityWeight;

  if (wave >= 4) {
    w.sentinel *= 1.30;
    w.guardian *= 1.25;
    w.phantom  *= 1.25;
  }
  if (wave >= 7) {
    w.apex *= 1.50;
  }

  // scout never drops below 12% share
  const MIN_SCOUT_SHARE = 0.12;
  let total = Object.values(w).reduce((s, v) => s + v, 0);
  if (w.scout / total < MIN_SCOUT_SHARE) {
    w.scout = (MIN_SCOUT_SHARE * total) / (1 - MIN_SCOUT_SHARE);
  }

  total = Object.values(w).reduce((s, v) => s + v, 0);
  let r = Math.random() * total;
  for (const [t, v] of Object.entries(w)) {
    r -= v;
    if (r <= 0) return t;
  }
  return ENEMY_TYPES.SCOUT;
}

export class CombatEnemy extends Entity {
  constructor(word, position, speed = ENEMY_BASE_SPEED, type = ENEMY_TYPES.SCOUT) {
    super();
    this.word     = word;
    this.speed    = speed;
    this.targeted = false;
    this._type    = type;
    this._cfg     = CFGS[type] ?? CFGS.scout;
    this._t       = Math.random() * Math.PI * 2;
    this._rings   = [];
    this._ringMats= [];

    this._specialTimer      = 0;
    this._dashTimer         = 0;
    this._pulseTimer        = 0;
    this._pulseActive       = false;
    this._novaTimer         = 0;
    this._novaActive        = false;

    this._group = new THREE.Group();
    this.mesh   = this._group;
    this._build();
    this._group.position.copy(position);
  }

  _build() {
    const cfg   = this._cfg;
    const color = cfg.color;

    // hull edges
    const geo   = cfg.geo();
    const edges = new THREE.EdgesGeometry(geo);
    this._lineMat = new THREE.LineBasicMaterial({
      color, transparent: true, opacity: cfg.hullOpacity ?? 0.9,
    });
    const hull = new THREE.LineSegments(edges, this._lineMat);
    hull.layers.enable(BLOOM_LAYER);
    this._group.add(hull);
    geo.dispose();

    // core
    this._coreMat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: cfg.emissiveInt,
      transparent: true, opacity: 0.55,
    });
    this._core = new THREE.Mesh(new THREE.SphereGeometry(cfg.coreR, 8, 8), this._coreMat);
    this._core.layers.enable(BLOOM_LAYER);
    this._group.add(this._core);

    // glow sprite
    this._glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getSoftGlowTexture(), color: cfg.glowColor,
      transparent: true, opacity: cfg.glowOp,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this._glow.scale.set(cfg.glowSize, cfg.glowSize, 1);
    this._glow.layers.enable(BLOOM_LAYER);
    this._group.add(this._glow);

    // rings
    const ringGeo = new THREE.TorusGeometry(1, 1, 6, 24); // placeholder — scaled per ring
    cfg.rings.forEach(rd => {
      const rg  = new THREE.TorusGeometry(rd.r, rd.tube, 6, 24);
      const mat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: cfg.emissiveInt * 0.6,
      });
      const mesh = new THREE.Mesh(rg, mat);
      mesh.layers.enable(BLOOM_LAYER);
      const grp = new THREE.Group();
      grp.add(mesh);
      if (rd.rotX !== undefined) grp.rotation.x = rd.rotX;
      if (rd.rotZ !== undefined) grp.rotation.z = rd.rotZ;
      grp.userData.rotSpeed = rd.rotSpeed ?? [0, 1, 0];
      this._rings.push(grp);
      this._ringMats.push(mat);
      this._group.add(grp);
    });
    ringGeo.dispose();
  }

  // Applies this frame's special ability. dir = normalized vector toward target center.
  _updateSpecial(delta, dir) {
    const cfg = this._cfg;
    this._specialTimer += delta;

    switch (this._type) {
      case 'scout': {
        if (this._specialTimer >= cfg.specialCd) {
          this._specialTimer = 0;
          this._dashTimer = 0.4;
        }
        if (this._dashTimer > 0) {
          this._dashTimer -= delta;
          this._group.position.addScaledVector(dir, this.speed * 1.6 * delta);
        }
        break;
      }

      case 'sentinel': {
        if (this._specialTimer >= cfg.specialCd) {
          this._specialTimer = 0;
          this._pulseTimer  = 0.5;
          this._pulseActive = true;
        }
        if (this._pulseTimer > 0) {
          this._pulseTimer -= delta;
          this._coreMat.emissiveIntensity = cfg.emissiveInt * 3.8;
        } else if (this._pulseActive) {
          this._pulseActive = false;
          this._coreMat.emissiveIntensity = this.targeted ? 1.8 : cfg.emissiveInt;
        }
        break;
      }

      case 'guardian': {
        if (this.distanceToPlayer < 5.0) {
          this._group.position.addScaledVector(dir, this.speed * 0.35 * delta);
        }
        break;
      }

      case 'phantom': {
        const phasePos  = (this._specialTimer % cfg.specialCd) / cfg.specialCd;
        const phaseHide = phasePos < 0.40;
        this._lineMat.opacity = phaseHide ? 0.08 : (cfg.hullOpacity ?? 0.45);
        if (this._glow) {
          this._glow.material.opacity = phaseHide ? 0.06 : cfg.glowOp;
        }
        break;
      }

      case 'apex': {
        if (this._specialTimer >= cfg.specialCd) {
          this._specialTimer = 0;
          this._novaTimer    = 0.8;
          this._novaActive   = true;
        }
        if (this._novaTimer > 0) {
          this._novaTimer -= delta;
          const progress  = 1 - this._novaTimer / 0.8;
          const intensity = cfg.emissiveInt + Math.sin(progress * Math.PI) * cfg.emissiveInt * 2.8;
          this._coreMat.emissiveIntensity = intensity;
          this._group.scale.setScalar(1.0 + Math.sin(progress * Math.PI) * 0.12);
        } else if (this._novaActive) {
          this._novaActive = false;
          this._coreMat.emissiveIntensity = this.targeted ? 1.8 : cfg.emissiveInt;
        }
        break;
      }
    }
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

    const dir = new THREE.Vector3()
      .subVectors(new THREE.Vector3(0, 0.2, 2), this._group.position)
      .normalize();
    this._group.position.addScaledVector(dir, this.speed * cfg.speedMult * delta);

    this._updateSpecial(delta, dir);

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
    if (!this._novaActive) {
      if (this.targeted) {
        this._group.scale.setScalar(1 + Math.sin(this._t * 18) * 0.03);
      } else {
        this._group.scale.setScalar(1);
      }
    }
  }

  get distanceToPlayer() { return this._group.position.distanceTo(new THREE.Vector3(0, 0.2, 2)); }
  get position()         { return this._group.position; }
}
