import * as THREE from 'three';
import { DeploymentTrail } from '../../rendering/fx/DeploymentTrail.js';
import { Shockwave } from '../../rendering/fx/Shockwave.js';
import { WarpFlash } from '../../rendering/fx/WarpFlash.js';
import { DustPuff } from '../../rendering/fx/DustPuff.js';
import { playSfx } from '../../../shared/audioManager.js';

// Pose final por modo — debe coincidir con Camera.js (_updateCombat/_updateRacing).
const END_POSES = {
  combat: { pos: new THREE.Vector3(0, 2,   8), look: new THREE.Vector3(0, 0.5, -8),  fov: 75 },
  racing: { pos: new THREE.Vector3(0, 1.4, 8), look: new THREE.Vector3(0, 0.8, -80), fov: 75 },
};

/**
 * Cinematic ship launch sequence — 4 phases:
 *   0.0 → T1  Ignition / Suspension  — levitate, slow orbital pan
 *   T1  → T2  Recoil                 — brief backward lurch, camera shake
 *   T2  → T3  Hangar Exit            — exponential acceleration, pitch arc
 *   T3  → T4  Warp                   — escape velocity, FOV stretch, trail white-hot
 */
export class DeploymentAnimator {
  constructor(scene, camera, cameraController) {
    this._scene            = scene;
    this._camera           = camera;
    this._cameraController = cameraController;
    this._state            = null;
  }

  get isActive()        { return !!this._state?.active; }
  get shakeAmp()        { return this._state?.shakeAmp ?? 0; }
  get shakeElapsed()    { return this._state?.elapsed  ?? 0; }
  // Flag: cuando true, DeploymentAnimator escribe camera.position/lookAt
  // directamente. ShipSelectionScene debe omitir _cam.applyPosition.
  get cameraTakeover()  { return !!this._state?.cameraTakeover; }
  // Phase-aware booster drive — leido por ShipSelectionScene cada frame.
  get boosterDrive() {
    return this._state?.boosterDrive ?? { accel: false, vScale: 1.0, rScale: 1.0, flowRatio: 0 };
  }

  /**
   * Starts the deployment animation for the given ship wrapper.
   * Returns a Promise that resolves when the sequence finishes.
   */
  triggerDeployment(wrapper, palette = null, gameMode = 'combat') {
    return new Promise((resolve) => {
      if (!wrapper) { resolve(); return; }
      const endPose = END_POSES[gameMode] ?? END_POSES.combat;

      const forward   = new THREE.Vector3(0, 0, 1);
      const pitchAxis = new THREE.Vector3(1, 0, 0);

      const trail = new DeploymentTrail(this._scene, { palette });
      const dust  = new DustPuff(this._scene, wrapper.position.clone(), { palette });

      this._state = {
        active:       true,
        elapsed:      0,
        resolve,
        wrapper,
        palette,
        forward,
        pitchAxis,
        startQuat:    wrapper.quaternion.clone(),
        startPos:     wrapper.position.clone(),
        forwardAccum: 0,
        startFov:     this._camera.fov,
        shakeAmp:     0,
        trail,
        dust,
        warpFlash: null,
        warpFlashSpawned: false,
        boostSoundSpawned: false,
        shockwavesSpawned: { t1: false, t2: false },
        boosterDrive: { accel: false, vScale: 1.0, rScale: 1.0, flowRatio: 0 },
        // Camera coreografia
        gameMode,
        endPose,
        cameraTakeover:    false,
        f4Snapshot:        null,        // { pos, look, fov } al inicio de F4
        currentLookTarget: new THREE.Vector3(),
      };
    });
  }

  update(dt) {
    const s = this._state;
    if (!s?.active) return;

    s.elapsed += dt;
    const t = s.elapsed;
    const w = s.wrapper;

    // ── Timing constants ─────────────────────────────────────────────────────
    const T1 = 2.0;  // end of ignition / suspension
    const T2 = 2.4;  // end of recoil
    const T3 = 4.3;  // end of hangar exit
    const T4 = 5.6;  // warp complete → resolve

    // ── Helpers ──────────────────────────────────────────────────────────────
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const ss      = v => v * v * (3 - 2 * v);                    // smoothstep
    const phaseT  = (a, b) => ss(clamp01((t - a) / (b - a)));   // eased phase progress

    // ── PHASE 1: Ignition / Suspension (0 → T1) ───────────────────────────
    // Ship levitates slowly off the pad. Damped roll simulates mass inertia.
    const liftAmt   = 0.55 * ss(clamp01(t / T1));
    const rollAngle = 0.07 * Math.sin(t * 5.0) * Math.exp(-t * 2.2);

    // Slow orbital pan while suspended — scene stays alive
    if (t < T1) this._cameraController.orbit.theta += 0.40 * dt;

    // ── PHASE 3 CAMERA: alinear detras de la nave ──────────────────────────
    // Lerp theta→π, phi→0.18, radius hacia 6.5 durante T2→T3 para preparar
    // pose final. Suavizado por phaseT.
    if (t >= T2 && t < T3) {
      const k = phaseT(T2, T3);
      const o = this._cameraController.orbit;
      const targetTheta  = Math.PI;
      const targetPhi    = 0.18;
      const targetRadius = 6.5;
      o.theta  += (targetTheta  - o.theta)  * Math.min(dt * 1.8 * (0.5 + k), 1);
      o.phi    += (targetPhi    - o.phi)    * Math.min(dt * 1.8 * (0.5 + k), 1);
      o.radius += (targetRadius - o.radius) * Math.min(dt * 1.4, 1);
    }

    // ── PHASE 2: Max Ignition / Recoil (T1 → T2) ─────────────────────────
    // Brief backward lurch from engine thrust. Camera starts shaking.
    const recoilProgress = phaseT(T1, T2);
    const recoilOffset   = -0.28 * Math.sin(Math.PI * recoilProgress);

    s.shakeAmp = t >= T1 && t <= T2 + 0.35
      ? 0.048 * Math.sin(Math.PI * clamp01((t - T1) / 0.5))
      : 0;

    // ── PHASE 3: Hangar Exit (T2 → T3) ───────────────────────────────────
    // Exponential acceleration, aggressive pitch up then level.
    let speed = 0;
    if (t >= T2 && t < T3) {
      const tE = t - T2;
      speed = 1.2 * tE * tE + 3.5 * tE;
    } else if (t >= T3) {
      // Phase 4 speed: continuous from T3
      const speedAtT3 = 1.2 * (T3 - T2) ** 2 + 3.5 * (T3 - T2);
      const tW = t - T3;
      speed = speedAtT3 + 55.0 * tW * tW + 18.0 * tW;
    }
    s.forwardAccum += speed * dt;

    // Extra upward drift reinforces the climb-to-orbit arc
    const exitLift = t >= T2 ? 0.40 * ss(clamp01((t - T2) / (T3 - T2))) : 0;

    // ── POSITION ─────────────────────────────────────────────────────────────
    // Decomposed so each component is independent and clean.
    w.position
      .copy(s.startPos)
      .addScaledVector(s.forward, s.forwardAccum + recoilOffset)
      .setY(s.startPos.y + liftAmt + exitLift);

    // ── ROTATION ─────────────────────────────────────────────────────────────
    // Pitch + roll via world-space quaternion composition.
    // Works for any ship orientation — no euler axis assumptions.
    let pitchAngle = 0;
    if (t >= T2 && t <= T3) {
      const peakT = T2 + (T3 - T2) * 0.50;
      pitchAngle = t <= peakT
        ? ss(clamp01((t - T2)    / (peakT - T2)))    * 0.44
        : (1 - ss(clamp01((t - peakT) / (T3 - peakT)))) * 0.44;
    }
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(s.pitchAxis, -pitchAngle);
    const rollQuat  = new THREE.Quaternion().setFromAxisAngle(s.forward,    rollAngle);
    w.quaternion.copy(s.startQuat).premultiply(pitchQuat).premultiply(rollQuat);

    // ── CAMERA FOCAL CHASE ───────────────────────────────────────────────────
    // Lag increases with speed so ship feels faster.
    const focalLag = t < T1 ? 0.012
      : t < T2              ? 0.035
      : t < T3              ? Math.min(0.05 + (t - T2) * 0.025, 0.18)
      :                       0.035;
    this._cameraController.focal.lerp(w.position, focalLag);

    // ── ORBIT RADIUS ─────────────────────────────────────────────────────────
    // Tight during suspension, pulls back on exit, rockets at warp.
    if (t >= T2) {
      const pullRate = t >= T3
        ? Math.min((t - T3) * 25 + 4.5, 45.0)
        : (t - T2) * 1.2;
      const o  = this._cameraController.orbit;
      o.radius = Math.min(o.radiusMax, o.radius + pullRate * dt);
    }

    // ── PHASE 4 CAMERA TAKEOVER ─────────────────────────────────────────────
    // T3→T4: bypass orbit. Lerp pos/look/fov directo hacia pose final
    // (combat o racing). Garantiza llegada exacta a la camara del modo.
    if (t >= T3) {
      if (!s.f4Snapshot) {
        // Snapshot pos/look/fov al entrar a F4. lookAt actual = focal.
        s.f4Snapshot = {
          pos:  this._camera.position.clone(),
          look: this._cameraController.focal.clone(),
          fov:  this._camera.fov,
        };
        s.cameraTakeover = true;
      }
      const k = ss(clamp01((t - T3) / (T4 - T3)));
      // Position lerp.
      this._camera.position.lerpVectors(s.f4Snapshot.pos, s.endPose.pos, k);
      // lookAt: punto frente a la camara a la MISMA altura (nivel horizontal).
      // Resultado: camara detras de la nave, mirando recto, sin pitch hacia abajo.
      s.currentLookTarget.copy(w.position);
      s.currentLookTarget.y = this._camera.position.y;
      this._camera.up.set(0, 1, 0);
      this._camera.lookAt(s.currentLookTarget);
      // FOV: pequeño stretch warp (snap → +20) y luego converge a endFov.
      const warpStretch = Math.sin(k * Math.PI) * 20;  // pico medio
      this._camera.fov = s.f4Snapshot.fov + (s.endPose.fov - s.f4Snapshot.fov) * k + warpStretch;
      this._camera.updateProjectionMatrix();
    }

    // ── BOOSTER DRIVE (phase-aware) ──────────────────────────────────────────
    // Rampa vScale/rScale/flowRatio segun fase. flowRatio>0 → BoosterEffect
    // usa FLOW_PALETTE (white-hot). Requiere setHangarMode(false) externamente.
    // Rampas suaves: crecimiento visible pero controlado. Maximos contenidos
    // para evitar boosters/aros desproporcionados durante warp.
    let bvScale, brScale, bflow;
    if (t < T1) {
      const k = phaseT(0, T1);
      bvScale = 1.0 + 0.35 * k;
      brScale = 1.0 + 0.20 * k;
      bflow   = 0.30 * k;
    } else if (t < T2) {
      const k = phaseT(T1, T2);
      bvScale = 1.35 + 0.25 * k;
      brScale = 1.20 + 0.15 * k;
      bflow   = 0.30 + 0.20 * k;
    } else if (t < T3) {
      const k = phaseT(T2, T3);
      bvScale = 1.60 + 0.25 * k;
      brScale = 1.35 + 0.15 * k;
      bflow   = 0.50 + 0.30 * k;
    } else {
      const k = phaseT(T3, T4);
      bvScale = 1.85 + 0.15 * k;
      brScale = 1.50 + 0.10 * k;
      bflow   = 0.80 + 0.20 * k;
    }
    s.boosterDrive = { accel: true, vScale: bvScale, rScale: brScale, flowRatio: bflow };

    // ── SHOCKWAVES ───────────────────────────────────────────────────────────
    // T1: ignicion plena. T2: punch de maximo empuje (mas grande).
    if (!s.shockwavesSpawned.t1 && t >= T1 * 0.85) {
      s.shockwavesSpawned.t1 = true;
      new Shockwave(this._scene, w.position.clone(), { palette: s.palette, size: 2.2, life: 0.55 });
    }
    if (!s.shockwavesSpawned.t2 && t >= T2) {
      s.shockwavesSpawned.t2 = true;
      new Shockwave(this._scene, w.position.clone(), { palette: s.palette, size: 4.5, life: 0.75 });
    }
    if (!s.boostSoundSpawned && t >= T2) {
      s.boostSoundSpawned = true;
      playSfx('propulsion.boost');
    }

    // ── TRAIL ────────────────────────────────────────────────────────────────
    const speedNorm = Math.min(speed / 28, 1);
    const trailStart = T1 * 0.6;
    if (t >= trailStart) {
      s.trail.update(dt, w.position, speedNorm);
    }

    // ── DUST PUFF (ignicion) ─────────────────────────────────────────────────
    s.dust?.update(dt);

    // ── WARP FLASH (entrada a fase 4) ────────────────────────────────────────
    if (!s.warpFlashSpawned && t >= T3) {
      s.warpFlashSpawned = true;
      s.warpFlash = new WarpFlash(this._scene, this._camera);
      playSfx('propulsion.warp');
    }
    s.warpFlash?.update(dt);

    // ── DONE ─────────────────────────────────────────────────────────────────
    if (t >= T4) {
      s.active = false;
      const trail = s.trail;
      setTimeout(() => { trail?.dispose(); }, 600);
      s.dust?.dispose();
      s.warpFlash?.dispose();
      s.resolve();
      this._state = null;
    }
  }
}
