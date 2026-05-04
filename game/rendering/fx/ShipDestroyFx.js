import * as THREE from 'three';
import { BLOOM_LAYER } from '../../../shared/constants.js';
import { getSoftGlowTexture } from '../../../shared/softVisuals.js';

const TOTAL_DURATION  = 2.5;
const FLASH_DURATION  = 0.15;
const FALLBACK_GLYPHS = ['>', '_', '<', '|', '#', '/', '!', '?'];

const _glyphCache = new Map();

function _getGlyphTexture(char) {
  if (_glyphCache.has(char)) return _glyphCache.get(char);
  const size   = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle    = '#00ffcc';
  ctx.font         = `bold ${Math.floor(size * 0.75)}px monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, size * 0.5, size * 0.5);
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  _glyphCache.set(char, tex);
  return tex;
}

export class ShipDestroyFx {
  // Direct / hangar use: new ShipDestroyFx(scene, pos, opts) → spawn()
  // Pool use:            new ShipDestroyFx(scene, null, {}, letterCount) → spawn(pos, opts)
  constructor(scene, position = null, options = {}, maxLetters = 8, particleCount = 60) {
    this._scene         = scene;
    this._defPosition   = position ? position.clone() : new THREE.Vector3();
    this._defOptions    = options;
    this._maxLetters    = maxLetters;
    this._particleCount = particleCount;
    this._active        = false;
    this._age           = 0;
    this._activeLetters = 0;
    this._flashDone     = false;

    // Layer 1 — point particles
    const pArr = new Float32Array(particleCount * 3);
    this._pGeo  = new THREE.BufferGeometry();
    this._pGeo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
    this._pMat  = new THREE.PointsMaterial({
      color: 0x00ffcc, size: 0.15,
      transparent: true, opacity: 1,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this._points = new THREE.Points(this._pGeo, this._pMat);
    this._points.layers.enable(BLOOM_LAYER);
    this._pVels  = Array.from({ length: particleCount }, () => new THREE.Vector3());

    // Layer 2 — letter sprites
    this._letters    = [];
    this._letterVels = [];
    this._letterRot  = [];
    for (let i = 0; i < maxLetters; i++) {
      const mat = new THREE.SpriteMaterial({
        transparent: true, opacity: 1,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const s = new THREE.Sprite(mat);
      s.layers.enable(BLOOM_LAYER);
      this._letters.push(s);
      this._letterVels.push(new THREE.Vector3());
      this._letterRot.push(0);
    }

    // Layer 3 — flash sprite
    this._flashMat = new THREE.SpriteMaterial({
      map: getSoftGlowTexture(), color: 0xffffff,
      transparent: true, opacity: 1,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this._flashSprite = new THREE.Sprite(this._flashMat);
    this._flashSprite.layers.enable(BLOOM_LAYER);
  }

  spawn(position = null, options = null) {
    const pos  = position ?? this._defPosition;
    const { color = 0x00ffcc, word = '', intensity = 1.0 } = options ?? this._defOptions;

    this._age       = 0;
    this._active    = true;
    this._flashDone = false;

    // Layer 1
    this._pMat.color.setHex(color);
    this._pMat.opacity = 1;
    this._points.position.copy(pos);
    const pArr = this._pGeo.attributes.position.array;
    for (let i = 0; i < this._particleCount; i++) {
      pArr[i * 3] = pArr[i * 3 + 1] = pArr[i * 3 + 2] = 0;
      const spd = (2.5 + Math.random() * 4.5) * intensity;
      this._pVels[i].set(
        (Math.random() - 0.5) * spd,
        (Math.random() - 0.5) * spd,
        (Math.random() - 0.5) * spd,
      );
    }
    this._pGeo.attributes.position.needsUpdate = true;
    this._scene.add(this._points);

    // Layer 2
    const rawChars = word.length > 0
      ? [...word].slice(0, this._maxLetters)
      : FALLBACK_GLYPHS.slice(0, this._maxLetters);
    this._activeLetters = Math.min(rawChars.length, this._maxLetters);

    for (let i = 0; i < this._maxLetters; i++) {
      const s = this._letters[i];
      if (i < this._activeLetters) {
        const tex = _getGlyphTexture(rawChars[i].toUpperCase());
        s.material.map         = tex;
        s.material.opacity     = 1;
        s.material.rotation    = 0;
        s.material.needsUpdate = true;
        s.position.copy(pos);
        const sc = (0.35 + Math.random() * 0.25) * intensity;
        s.scale.set(sc, sc, 1);
        const spd = (1.2 + Math.random() * 2.5) * intensity;
        this._letterVels[i].set(
          (Math.random() - 0.5) * spd,
          (Math.random() - 0.5) * spd,
          (Math.random() - 0.5) * spd,
        );
        this._letterRot[i] = (Math.random() - 0.5) * 4;
        this._scene.add(s);
      } else if (s.parent) {
        this._scene.remove(s);
      }
    }

    // Layer 3
    const flashC = new THREE.Color(color);
    flashC.lerp(new THREE.Color(0xffffff), 0.7);
    this._flashMat.color.copy(flashC);
    this._flashMat.opacity = 1;
    const fsc = (4.0 + Math.random() * 2.0) * intensity;
    this._flashSprite.position.copy(pos);
    this._flashSprite.scale.set(fsc, fsc, 1);
    this._scene.add(this._flashSprite);
  }

  update(delta) {
    if (!this._active) return;
    this._age += delta;

    if (this._age >= TOTAL_DURATION) {
      this._active = false;
      this._doCleanup();
      return;
    }

    const t = this._age / TOTAL_DURATION;

    // Layer 1
    const drag = 1 - t * 0.5;
    const pArr = this._pGeo.attributes.position.array;
    for (let i = 0; i < this._particleCount; i++) {
      pArr[i * 3]     += this._pVels[i].x * delta * drag;
      pArr[i * 3 + 1] += this._pVels[i].y * delta * drag;
      pArr[i * 3 + 2] += this._pVels[i].z * delta * drag;
    }
    this._pGeo.attributes.position.needsUpdate = true;
    this._pMat.opacity = t < 0.4 ? 1.0 : 1.0 - (t - 0.4) / 0.6;

    // Layer 2
    const letterAlpha = t < 0.5 ? 1.0 : 1.0 - (t - 0.5) / 0.5;
    for (let i = 0; i < this._activeLetters; i++) {
      const s = this._letters[i];
      s.position.addScaledVector(this._letterVels[i], delta);
      s.material.rotation += this._letterRot[i] * delta;
      s.material.opacity   = letterAlpha;
    }

    // Layer 3
    if (!this._flashDone) {
      if (this._age <= FLASH_DURATION) {
        this._flashMat.opacity = 1.0 - this._age / FLASH_DURATION;
      } else {
        this._flashDone = true;
        if (this._flashSprite.parent) this._scene.remove(this._flashSprite);
      }
    }
  }

  cleanup() {
    if (!this._active) return;
    this._active = false;
    this._doCleanup();
  }

  _doCleanup() {
    if (this._points.parent)      this._scene.remove(this._points);
    if (this._flashSprite.parent) this._scene.remove(this._flashSprite);
    for (let i = 0; i < this._activeLetters; i++) {
      if (this._letters[i].parent) this._scene.remove(this._letters[i]);
    }
  }

  get done() { return !this._active; }

  dispose() {
    this._doCleanup();
    this._pGeo.dispose();
    this._pMat.dispose();
    for (const s of this._letters) {
      s.material.map = null;
      s.material.dispose();
    }
    this._flashMat.dispose();
  }
}
