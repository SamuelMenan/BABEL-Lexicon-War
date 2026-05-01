import * as THREE from 'three';
import { Entity } from './Entity.js';
import { BLOOM_LAYER } from '../../shared/constants.js';

export const PROJECTILE_TYPES = {
  STANDARD: 'standard', // cyan  — velocidad media, equilibrado
  RAPID:    'rapid',    // amarillo — rápido, fino, destello corto
  HEAVY:    'heavy',    // magenta  — lento, gordo, trail largo
  BURST:    'burst',    // naranja  — muy rápido, estela corta intensa
};

const CONFIGS = {
  standard: {
    speed: 35, life: 3,
    trail: 16,
    coreColor: 0x2440b8, coreR: 0.035, coreLen: 1.0,
    glowColor: 0x4d98ff, glowR0: 0.05, glowR1: 0.14, glowLen: 1.2, glowOp: 0.38,
    tipColor:  0x9feaff, tipR: 0.065,
    trailColor: 0x3f7fff, trailOp: 0.55,
  },
  rapid: {
    speed: 62, life: 2,
    trail: 8,
    coreColor: 0x4f8dff, coreR: 0.022, coreLen: 0.7,
    glowColor: 0x87ddff, glowR0: 0.03, glowR1: 0.08, glowLen: 0.85, glowOp: 0.42,
    tipColor:  0xc8f7ff, tipR: 0.04,
    trailColor: 0x5c8dff, trailOp: 0.65,
  },
  heavy: {
    speed: 20, life: 4,
    trail: 26,
    coreColor: 0x18358f, coreR: 0.07,  coreLen: 1.4,
    glowColor: 0x5d86ff, glowR0: 0.09, glowR1: 0.22, glowLen: 1.7,  glowOp: 0.45,
    tipColor:  0x89deff, tipR: 0.1,
    trailColor: 0x2d6cff, trailOp: 0.6,
  },
  burst: {
    speed: 80, life: 1.5,
    trail: 6,
    coreColor: 0xffddaa, coreR: 0.028, coreLen: 0.55,
    glowColor: 0xff6600, glowR0: 0.04, glowR1: 0.09, glowLen: 0.7,  glowOp: 0.5,
    tipColor:  0xffffff, tipR: 0.045,
    trailColor: 0xff8800, trailOp: 0.75,
  },
};

const _projDataCache = new Map();
function getProjData(type) {
  if (_projDataCache.has(type)) return _projDataCache.get(type);
  const cfg = CONFIGS[type] ?? CONFIGS.standard;
  
  const coreGeo = new THREE.CylinderGeometry(cfg.coreR, cfg.coreR, cfg.coreLen, 5);
  coreGeo.rotateX(Math.PI / 2);
  const coreMat = new THREE.MeshBasicMaterial({ color: cfg.coreColor });
  
  const glowGeo = new THREE.CylinderGeometry(cfg.glowR0, cfg.glowR1, cfg.glowLen, 5);
  glowGeo.rotateX(Math.PI / 2);
  const glowMat = new THREE.MeshBasicMaterial({
    color: cfg.glowColor, transparent: true, opacity: cfg.glowOp,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  
  const tipGeo = new THREE.SphereGeometry(cfg.tipR, 5, 5);
  const tipMat = new THREE.MeshBasicMaterial({ color: cfg.tipColor });
  
  const trailMat = new THREE.LineBasicMaterial({
    color: cfg.trailColor, transparent: true, opacity: cfg.trailOp,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  
  const data = { coreGeo, coreMat, glowGeo, glowMat, tipGeo, tipMat, trailMat };
  _projDataCache.set(type, data);
  return data;
}

export class Projectile extends Entity {
  constructor(origin, target, onHit, type = PROJECTILE_TYPES.STANDARD, colorOverride = null) {
    super();
    this._target   = target;
    this._onHit    = onHit;
    this._age      = 0;
    const cfg      = CONFIGS[type] ?? CONFIGS.standard;
    this._speed    = cfg.speed;
    this._life     = cfg.life;
    this._trailMax = cfg.trail;
    this._tempPos  = origin.clone();
    
    // We try to fill trail point arrays initially rather than allocating inside loop
    this._trailPts = Array.from({ length: cfg.trail }, () => origin.clone());

    this.mesh = new THREE.Group();
    this.mesh.position.copy(origin);

    const d = getProjData(type);

    let coreMat, glowMat, tipMat, trailMat;
    if (colorOverride) {
      const col = new THREE.Color(colorOverride);
      coreMat  = new THREE.MeshBasicMaterial({ color: col });
      glowMat  = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: cfg.glowOp, depthWrite: false, blending: THREE.AdditiveBlending });
      tipMat   = new THREE.MeshBasicMaterial({ color: 0xffffff });
      trailMat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: cfg.trailOp, depthWrite: false, blending: THREE.AdditiveBlending });
      this._ownsMats = [coreMat, glowMat, tipMat, trailMat];
    } else {
      coreMat = d.coreMat; glowMat = d.glowMat; tipMat = d.tipMat; trailMat = d.trailMat;
      this._ownsMats = null;
    }

    const core = new THREE.Mesh(d.coreGeo, coreMat);
    core.layers.enable(BLOOM_LAYER);
    this.mesh.add(core);

    const glow = new THREE.Mesh(d.glowGeo, glowMat);
    glow.layers.enable(BLOOM_LAYER);
    this.mesh.add(glow);

    const tip = new THREE.Mesh(d.tipGeo, tipMat);
    tip.position.z = -(cfg.coreLen / 2 + cfg.tipR * 0.5);
    tip.layers.enable(BLOOM_LAYER);
    this.mesh.add(tip);

    this._trailGeo  = new THREE.BufferGeometry().setFromPoints(this._trailPts);
    this._trailLine = new THREE.Line(this._trailGeo, trailMat);
    this._trailLine.layers.enable(BLOOM_LAYER);
  }

  addToScene(scene)    { scene.add(this.mesh); scene.add(this._trailLine); }
  removeFromScene(scene) {
    scene.remove(this.mesh); scene.remove(this._trailLine);
    this._trailGeo.dispose();
    if (this._ownsMats) this._ownsMats.forEach(m => m.dispose());
  }

  update(delta) {
    if (!this.active) return;
    this._age += delta;
    if (this._age > this._life) { this.active = false; return; }
    if (!this._target.active)   { this.active = false; return; }

    const targetPos = this._target.position;
    
    // Optimize: REUSE _tempPos instead of creating new Vector3 every frame
    this._tempPos.subVectors(targetPos, this.mesh.position).normalize();
    this.mesh.position.addScaledVector(this._tempPos, this._speed * delta);
    this.mesh.lookAt(targetPos);

    // Optimize array shift by shifting elements manually or re-assigning values (Object Pooling style inside array)
    const lastPos = this._trailPts.pop();
    lastPos.copy(this.mesh.position);
    this._trailPts.unshift(lastPos);
    
    // Update geo without instantiating new vectors
    const positions = this._trailGeo.attributes.position.array;
    for(let i=0; i<this._trailPts.length; i++) {
        const pt = this._trailPts[i];
        positions[i*3]   = pt.x;
        positions[i*3+1] = pt.y;
        positions[i*3+2] = pt.z;
    }
    this._trailGeo.attributes.position.needsUpdate = true;

    if (this.mesh.position.distanceToSquared(targetPos) < 1.0) { // distanceToSquared is faster
      this._onHit(); this.active = false;
    }
  }
}
