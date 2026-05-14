import * as THREE from 'three';

// Ribbon aditiva con tinte de paleta. Reemplaza el Points lineal anterior.
// Construcción: strip de quads (2 vértices por sample, perpendiculares al
// world-up). Fade por cola via brightness de vertex colors (no necesita
// alpha por vértice ni shader custom — AdditiveBlending interpreta el
// brillo como contribución).

const MAX_SAMPLES   = 140;
const SAMPLE_DT     = 0.012;  // seg entre samples
const BASE_WIDTH    = 0.10;
const SPEED_WIDTH_K = 0.22;
const WORLD_UP      = new THREE.Vector3(0, 1, 0);

// Sparks
const SPARK_MAX       = 90;
const SPARK_LIFE      = 0.55;
const SPARK_EMIT_RATE = 0.018; // seg entre emisiones (cuando hay velocidad)

export class DeploymentTrail {
  constructor(scene, { palette = null } = {}) {
    this._scene = scene;
    this._t     = 0;
    this._timer = 0;

    // Color base de paleta (hangarColor → tono caliente). Si no hay, default azul.
    const baseHex = palette?.hangarColor ?? palette?.flameColor ?? 0x44ccff;
    this._baseCol = new THREE.Color(baseHex);
    this._hotCol  = new THREE.Color(0xffffff);

    // Buffers: 2 vértices por sample (left/right).
    this._positions = new Float32Array(MAX_SAMPLES * 2 * 3);
    this._colors    = new Float32Array(MAX_SAMPLES * 2 * 3);
    this._indices   = new Uint16Array((MAX_SAMPLES - 1) * 6);
    for (let i = 0; i < MAX_SAMPLES - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      const o = i * 6;
      this._indices[o    ] = a; this._indices[o + 1] = b; this._indices[o + 2] = c;
      this._indices[o + 3] = b; this._indices[o + 4] = d; this._indices[o + 5] = c;
    }

    this._geo = new THREE.BufferGeometry();
    this._geo.setAttribute('position', new THREE.BufferAttribute(this._positions, 3));
    this._geo.setAttribute('color',    new THREE.BufferAttribute(this._colors,    3));
    this._geo.setIndex(new THREE.BufferAttribute(this._indices, 1));
    this._geo.setDrawRange(0, 0);

    this._mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent:  true,
      opacity:      1.0,
      blending:     THREE.AdditiveBlending,
      depthWrite:   false,
      side:         THREE.DoubleSide,
      toneMapped:   false,
    });
    this._mesh = new THREE.Mesh(this._geo, this._mat);
    this._mesh.frustumCulled = false;
    this._scene.add(this._mesh);

    // Samples ring buffer.
    this._samples = [];
    this._lastPos = null;

    // ── Sparks ──────────────────────────────────────────────────────────
    this._sparkPos   = new Float32Array(SPARK_MAX * 3);
    this._sparkVel   = new Float32Array(SPARK_MAX * 3);
    this._sparkLife  = new Float32Array(SPARK_MAX); // remaining time
    this._sparkSlot  = 0;
    this._sparkTimer = 0;

    this._sparkGeo = new THREE.BufferGeometry();
    this._sparkGeo.setAttribute('position', new THREE.BufferAttribute(this._sparkPos, 3));
    this._sparkMat = new THREE.PointsMaterial({
      color:           0xffe0a0,
      size:            0.10,
      sizeAttenuation: true,
      transparent:     true,
      opacity:         0.95,
      blending:        THREE.AdditiveBlending,
      depthWrite:      false,
      toneMapped:      false,
    });
    this._sparks = new THREE.Points(this._sparkGeo, this._sparkMat);
    this._sparks.frustumCulled = false;
    this._scene.add(this._sparks);
  }

  // headPos: posición actual de la nave. speedNorm: ∈[0,1].
  update(dt, headPos, speedNorm = 0) {
    this._t     += dt;
    this._timer += dt;

    // Envejecer samples existentes.
    for (const s of this._samples) s.age += dt;

    // Añadir sample nuevo cada SAMPLE_DT.
    if (this._timer >= SAMPLE_DT) {
      this._timer = 0;
      const prev = this._lastPos ?? headPos;
      this._samples.push({
        pos:    headPos.clone(),
        age:    0,
        dir:    new THREE.Vector3().subVectors(headPos, prev).normalize(),
        width:  BASE_WIDTH + speedNorm * SPEED_WIDTH_K,
        speed:  speedNorm,
      });
      if (this._samples.length > MAX_SAMPLES) this._samples.shift();
      this._lastPos = headPos.clone();
    }

    // Rebuild buffers.
    const n = this._samples.length;
    if (n < 2) {
      this._geo.setDrawRange(0, 0);
      return;
    }

    const tmpPerp = new THREE.Vector3();
    const tmpCol  = new THREE.Color();
    const maxAge  = SAMPLE_DT * MAX_SAMPLES;

    for (let i = 0; i < n; i++) {
      const s = this._samples[i];
      // Perp horizontal: cross(dir, up). Si dir paralelo a up, usar X.
      tmpPerp.crossVectors(s.dir, WORLD_UP);
      if (tmpPerp.lengthSq() < 1e-6) tmpPerp.set(1, 0, 0);
      else tmpPerp.normalize();

      const halfW = s.width * 0.5;
      const li = i * 2 * 3;
      const ri = li + 3;
      // Left vertex
      this._positions[li    ] = s.pos.x - tmpPerp.x * halfW;
      this._positions[li + 1] = s.pos.y - tmpPerp.y * halfW;
      this._positions[li + 2] = s.pos.z - tmpPerp.z * halfW;
      // Right vertex
      this._positions[ri    ] = s.pos.x + tmpPerp.x * halfW;
      this._positions[ri + 1] = s.pos.y + tmpPerp.y * halfW;
      this._positions[ri + 2] = s.pos.z + tmpPerp.z * halfW;

      // Brillo: cola decae; tono se vuelve blanco con velocidad.
      const lifeK   = Math.max(0, 1 - s.age / maxAge);     // 1 head → 0 tail
      const heatK   = s.speed;                              // velocidad → blanco
      tmpCol.copy(this._baseCol).lerp(this._hotCol, heatK);
      const bright  = lifeK * (0.55 + heatK * 0.45);
      this._colors[li    ] = tmpCol.r * bright;
      this._colors[li + 1] = tmpCol.g * bright;
      this._colors[li + 2] = tmpCol.b * bright;
      this._colors[ri    ] = tmpCol.r * bright;
      this._colors[ri + 1] = tmpCol.g * bright;
      this._colors[ri + 2] = tmpCol.b * bright;
    }

    this._geo.attributes.position.needsUpdate = true;
    this._geo.attributes.color.needsUpdate    = true;
    this._geo.setDrawRange(0, (n - 1) * 6);

    // ── Sparks update + emisión ────────────────────────────────────────
    // Emite mientras hay velocidad. Dirección lateral random + componente
    // contraria al avance (despide hacia atrás).
    this._sparkTimer += dt;
    if (speedNorm > 0.05 && this._sparkTimer >= SPARK_EMIT_RATE) {
      this._sparkTimer = 0;
      const headSample = this._samples[this._samples.length - 1];
      const fwd = headSample.dir;
      const burst = 2 + Math.floor(speedNorm * 4);
      for (let b = 0; b < burst; b++) {
        const idx = this._sparkSlot;
        this._sparkSlot = (this._sparkSlot + 1) % SPARK_MAX;
        this._sparkPos[idx * 3]     = headSample.pos.x;
        this._sparkPos[idx * 3 + 1] = headSample.pos.y;
        this._sparkPos[idx * 3 + 2] = headSample.pos.z;
        const ang  = Math.random() * Math.PI * 2;
        const lat  = 1.5 + Math.random() * 2.5;
        const back = 2.0 + Math.random() * 4.0 * speedNorm;
        this._sparkVel[idx * 3]     = Math.cos(ang) * lat - fwd.x * back;
        this._sparkVel[idx * 3 + 1] = Math.sin(ang) * lat * 0.4 - fwd.y * back;
        this._sparkVel[idx * 3 + 2] = Math.sin(ang) * lat - fwd.z * back;
        this._sparkLife[idx] = SPARK_LIFE;
      }
    }

    // Integrar todas las sparks activas.
    for (let i = 0; i < SPARK_MAX; i++) {
      if (this._sparkLife[i] <= 0) continue;
      this._sparkLife[i] -= dt;
      const decel = Math.max(0, this._sparkLife[i] / SPARK_LIFE);
      this._sparkPos[i * 3]     += this._sparkVel[i * 3]     * dt * decel;
      this._sparkPos[i * 3 + 1] += this._sparkVel[i * 3 + 1] * dt * decel - dt * 0.8 * (1 - decel);
      this._sparkPos[i * 3 + 2] += this._sparkVel[i * 3 + 2] * dt * decel;
    }
    this._sparkGeo.attributes.position.needsUpdate = true;
  }

  dispose() {
    if (this._mesh)   this._scene.remove(this._mesh);
    if (this._sparks) this._scene.remove(this._sparks);
    this._geo?.dispose();
    this._mat?.dispose();
    this._sparkGeo?.dispose();
    this._sparkMat?.dispose();
    this._mesh = null;
    this._sparks = null;
  }
}
