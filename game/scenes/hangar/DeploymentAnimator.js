import * as THREE from 'three';

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

  get isActive()     { return !!this._state?.active; }
  get shakeAmp()     { return this._state?.shakeAmp ?? 0; }
  get shakeElapsed() { return this._state?.elapsed  ?? 0; }

  /**
   * Starts the deployment animation for the given ship wrapper.
   * Returns a Promise that resolves when the sequence finishes.
   */
  triggerDeployment(wrapper) {
    return new Promise((resolve) => {
      if (!wrapper) { resolve(); return; }

      // Hangar exit door is always at world +Z. All ships are pre-rotated (startQuat)
      // to face +Z in hangar space, so these world-space constants are universal.
      const forward   = new THREE.Vector3(0, 0, 1);
      const pitchAxis = new THREE.Vector3(1, 0, 0);

      // Trail: circular buffer of Points
      const TRAIL_MAX = 120;
      const trailPos  = new Float32Array(TRAIL_MAX * 3);
      const trailGeo  = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
      trailGeo.setDrawRange(0, 0);
      const trailMat = new THREE.PointsMaterial({
        color: 0x44ccff,
        size: 0.07,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const trailMesh = new THREE.Points(trailGeo, trailMat);
      this._scene.add(trailMesh);

      this._state = {
        active:       true,
        elapsed:      0,
        resolve,
        wrapper,
        forward,
        pitchAxis,
        startQuat:    wrapper.quaternion.clone(),
        startPos:     wrapper.position.clone(),
        forwardAccum: 0,
        startFov:     this._camera.fov,
        shakeAmp:     0,
        trailPos,
        trailGeo,
        trailMat,
        trailMesh,
        trailCount:   0,
        trailHead:    0,
        trailTimer:   0,
        TRAIL_MAX,
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
    const T1 = 1.5;  // end of ignition / suspension
    const T2 = 1.8;  // end of recoil
    const T3 = 3.5;  // end of hangar exit
    const T4 = 4.5;  // warp complete → resolve

    // ── Helpers ──────────────────────────────────────────────────────────────
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const ss      = v => v * v * (3 - 2 * v);                    // smoothstep
    const phaseT  = (a, b) => ss(clamp01((t - a) / (b - a)));   // eased phase progress

    // ── PHASE 1: Ignition / Suspension (0 → T1) ───────────────────────────
    // Ship levitates slowly off the pad. Damped roll simulates mass inertia.
    const liftAmt   = 0.55 * ss(clamp01(t / T1));
    const rollAngle = 0.07 * Math.sin(t * 5.0) * Math.exp(-t * 2.2);

    // Slow orbital pan while suspended — scene stays alive
    if (t < T1) this._cameraController.orbit.theta += 0.18 * dt;

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

    // ── FOV STRETCH (warp tunnel effect, Phase 4 only) ───────────────────────
    if (t >= T3) {
      const warpT = ss(clamp01((t - T3) / (T4 - T3)));
      this._camera.fov = s.startFov + warpT * 58; // 45 → 103
      this._camera.updateProjectionMatrix();
    }

    // ── TRAIL ────────────────────────────────────────────────────────────────
    // Starts at exit, brightens to white-hot at warp.
    s.trailTimer += dt;
    if (t >= T2 && s.trailTimer >= 0.013) {
      s.trailTimer = 0;
      const wp = w.position;
      const i  = s.trailHead % s.TRAIL_MAX;
      s.trailPos[i * 3]     = wp.x;
      s.trailPos[i * 3 + 1] = wp.y;
      s.trailPos[i * 3 + 2] = wp.z;
      s.trailHead++;
      s.trailCount = Math.min(s.trailHead, s.TRAIL_MAX);
      s.trailGeo.setDrawRange(0, s.trailCount);
      s.trailGeo.attributes.position.needsUpdate = true;
      const norm         = Math.min(speed / 28, 1);
      s.trailMat.opacity = 0.35 + norm * 0.60;
      s.trailMat.size    = 0.07 + norm * 0.20;
      s.trailMat.color.lerpColors(
        new THREE.Color(0x44ccff),
        new THREE.Color(0xffffff),
        norm,
      );
    }

    // ── DONE ─────────────────────────────────────────────────────────────────
    if (t >= T4) {
      s.active = false;
      setTimeout(() => {
        if (s.trailMesh) {
          this._scene.remove(s.trailMesh);
          s.trailGeo.dispose();
          s.trailMat.dispose();
        }
      }, 300);
      s.resolve();
      this._state = null;
    }
  }
}
