import * as THREE from 'three';
import { SHIPS, SHIP_PALETTES } from '../../shared/constants.js';
import { ShipDestroyFx } from '../rendering/fx/ShipDestroyFx.js';
import { HangarRenderer } from './hangar/HangarRenderer.js';
import { HangarCameraController } from './hangar/HangarCameraController.js';
import { HangarLoader } from './hangar/HangarLoader.js';
import { DeploymentAnimator } from './hangar/DeploymentAnimator.js';
import { HangarProjectiles } from './hangar/HangarProjectiles.js';
import { HangarLaser } from './hangar/HangarLaser.js';
import { Bridge } from '../../shared/bridge.js';

const FIRE_COOLDOWN_MS      = 150;
const AUTO_FIRE_INTERVAL_MS = 110; // cadencia ráfaga K (corto, continuo)
const FLOW_RAMP_SPEED       = 1 / 0.6; // 0→1 en 0.6s

// Adjusts vertical spawn position of all ships. Negative = lower, positive = higher.
const SHIP_SPAWN_OFFSET = { x: 0, y: -0.1, z: 0 };

export class ShipSelectionScene {
  constructor(mount, { onLoadStart, onLoadEnd } = {}) {
    this._alive      = true;
    this._keys       = new Set();
    this._autoRotate = true;
    this._destroyFx  = null;
    this._lastTime   = performance.now();
    this._rafId      = null;

    this._env    = new HangarRenderer(mount);
    this._cam    = new HangarCameraController(this._env.camera);
    this._loader = new HangarLoader(this._env.scene, { onLoadStart, onLoadEnd });
    this._deploy = new DeploymentAnimator(this._env.scene, this._env.camera, this._cam);
    this._projectiles = new HangarProjectiles(this._env.scene);
    this._laser       = new HangarLaser(this._env.scene);
    this._lastShotAt  = 0;
    this._autoFiring  = false;  // K hold
    this._laserOn     = false;  // L toggle
    this._flowSim     = false;  // J toggle — simula crecimiento flow combat
    this._flowRatio   = 0;
    this._flowModeOff = true;   // hangarMode actual de boosters (true = idle)
    this._floatTime   = 0;      // acumulador para floating idle de naves

    this._loader.loadStation();
    this._startLoop();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  loadShip(index) {
    if (!this._alive) return;
    this._stopAllFire();
    this._resetFlowSim();
    this._loader.loadShip(index);
    this._cam.focal.set(0, 0, 0);
    this._flowModeOff = true; // boosters nuevos arrancan en hangarMode true (default false → fuerza estado conocido).
    this._loader.boosters.forEach(b => b.setHangarMode?.(true));
  }

  triggerDeployment() {
    this._stopAllFire();
    this._resetFlowSim();
    const wrapper = this._loader.shipGroup.children[0];
    const ship    = SHIPS[this._loader.currentShipIndex ?? 0];
    const palette = SHIP_PALETTES[ship?.id] ?? null;
    this._loader.boosters.forEach(b => b.setHangarMode?.(false));
    this._flowModeOff = false;
    // Snap a baseline ANTES de capturar startPos en DeploymentAnimator.
    // Evita que deploy arranque desde un offset de flotación residual.
    this._loader.updateFloat(null);
    const gameMode = Bridge.peekState?.()?.pendingGameMode ?? 'combat';
    return this._deploy.triggerDeployment(wrapper, palette, gameMode).then((res) => {
      this._loader.boosters.forEach(b => b.setHangarMode?.(true));
      this._flowModeOff = true;
      return res;
    });
  }

  startAutoFire() {
    if (this._deploy.isActive) return;
    this._autoFiring = true;
  }
  stopAutoFire() {
    this._autoFiring = false;
  }
  toggleLaser() {
    if (this._deploy.isActive) return;
    this._laserOn = !this._laserOn;
    if (!this._laserOn) this._laser.clear();
  }
  _stopAllFire() {
    this._autoFiring = false;
    this._laserOn    = false;
    this._laser.clear();
    this._projectiles.clear();
  }

  toggleFlowSim() {
    if (this._deploy.isActive) return;
    this._flowSim = !this._flowSim;
    if (this._flowSim) {
      // Salir de hangarMode → permite que la rampa flow afecte size/opacity/color.
      this._loader.boosters.forEach(b => b.setHangarMode?.(false));
      this._flowModeOff = false;
    }
    // Si pasa a false: hangarMode se restaurará cuando _flowRatio vuelva a 0
    // (en el loop), para evitar snap brusco.
  }
  _resetFlowSim() {
    this._flowSim   = false;
    this._flowRatio = 0;
    if (!this._flowModeOff) {
      this._loader.boosters.forEach(b => b.setHangarMode?.(true));
      this._flowModeOff = true;
    }
  }

  detonateCurrentShip() {
    if (this._destroyFx && !this._destroyFx.done) {
      this._destroyFx.cleanup();
    }
    const ship = SHIPS[this._loader.currentShipIndex ?? 0];
    const word = ship?.name ?? 'BABEL';
    const pos  = new THREE.Vector3(0, SHIP_SPAWN_OFFSET.y, 0);
    this._destroyFx = new ShipDestroyFx(this._env.scene, pos, {
      color: 0x00eeff,
      word,
      intensity: 1.2,
    });
    this._destroyFx.spawn();
  }

  setAutoRotate(enabled) {
    this._autoRotate = enabled;
    if (enabled) this._unfreezeModels();
    else         this._freezeModels();
  }

  isAutoRotating() { return this._autoRotate; }

  addKey(key)    { this._keys.add(key); }
  removeKey(key) { this._keys.delete(key); }

  startDrag(x, y) { this._cam.startDrag(x, y); }
  drag(x, y)      { this._cam.drag(x, y); }
  endDrag()       { this._cam.endDrag(); }
  zoom(delta)     { this._cam.zoom(delta); }

  resetOrbit()    { this._cam.resetOrbit(); }
  setTopView()    { this._cam.setTopView(); }
  setBottomView() { this._cam.setBottomView(); }
  setRearView()   { this._cam.setRearView(); }
  setSideView()   { this._cam.setSideView(); }

  toggleDebugMarkers() { this._loader.toggleDebugMarkers(); }

  fireWeapon(cooldownMs = FIRE_COOLDOWN_MS) {
    if (this._deploy.isActive) return;
    if (this._laserOn) return; // laser activo: no mezclar ráfaga
    const now = performance.now();
    if (now - this._lastShotAt < cooldownMs) return;
    const shots = this._loader.getMuzzleShots();
    if (!shots.length) return;
    this._lastShotAt = now;
    shots.forEach(s => {
      this._projectiles.spawn(s.origin, s.dir, {
        color:    s.color,
        emissive: s.emissive,
        scale:    s.scale,
      });
    });
  }

  destroy() {
    this._alive = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._destroyFx?.cleanup();
    this._projectiles.dispose();
    this._laser.dispose();
    this._loader.dispose();
    this._env.destroy();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _freezeModels() {
    this._loader.freezeMixers();
    [this._loader.shipGroup, this._loader.stationGroup].forEach(group => {
      group.traverse(obj => {
        if (obj.isMesh || obj.isGroup) obj.matrixAutoUpdate = false;
      });
    });
  }

  _unfreezeModels() {
    this._loader.unfreezeMixers();
    [this._loader.shipGroup, this._loader.stationGroup].forEach(group => {
      group.traverse(obj => {
        if (obj.isMesh || obj.isGroup) obj.matrixAutoUpdate = true;
      });
    });
    this._loader.shipGroup.children.forEach(ch => this._loader.restoreModelOriginals(ch));
  }

  _startLoop() {
    const animate = () => {
      this._rafId = requestAnimationFrame(animate);
      if (!this._alive) return;

      const now = performance.now();
      const dt  = Math.min((now - this._lastTime) / 1000, 0.05);
      this._lastTime = now;

      this._cam.updateFromKeys(this._keys, this._deploy.isActive);

      if (this._deploy.isActive) {
        this._deploy.update(dt);
      }

      // Skip orbit-based cam si DeploymentAnimator hizo takeover (F4).
      if (!this._deploy.cameraTakeover) {
        this._cam.applyPosition(this._deploy.shakeAmp, this._deploy.shakeElapsed);
      }

      const isDeploying = this._deploy.isActive;
      if (isDeploying) {
        // Durante deploy: NO tocar wrapper transform. DeploymentAnimator es
        // dueño exclusivo de position/rotation. Trail samplea w.position y
        // debe coincidir con el render — cualquier escritura posterior
        // desfasaría estela vs nave.
        const d = this._deploy.boosterDrive;
        this._loader.boosters.forEach(b => b.update(dt, d.accel, d.vScale, d.rScale, d.flowRatio));
      } else {
        this._floatTime += dt;
        this._loader.updateFloat(this._floatTime);
        // Rampa flow simulada (tecla J).
        const target = this._flowSim ? 1 : 0;
        if (this._flowRatio !== target) {
          const delta = Math.sign(target - this._flowRatio) * FLOW_RAMP_SPEED * dt;
          this._flowRatio = Math.max(0, Math.min(1, this._flowRatio + delta));
        }
        // Cuando regresa a 0 sin sim activa, restaurar hangarMode.
        if (!this._flowSim && this._flowRatio === 0 && !this._flowModeOff) {
          this._loader.boosters.forEach(b => b.setHangarMode?.(true));
          this._flowModeOff = true;
        }
        const fr     = this._flowRatio;
        const vScale = 1.0 + fr * 1.0;  // máx 2.0 (antes 3.2)
        const rScale = 1.0 + fr * 0.6;  // máx 1.6 (antes 2.6)
        const accel  = fr > 0.05;
        this._loader.boosters.forEach(b => b.update(dt, accel, vScale, rScale, fr));
      }
      this._loader.mixers.forEach(m => m?.update(dt));

      // Modo láser tiene prioridad sobre ráfaga K.
      if (isDeploying) {
        this._laser.clear();
      } else if (this._laserOn) {
        this._laser.update(this._loader.getMuzzleShots(), dt);
      } else if (this._autoFiring) {
        this.fireWeapon(AUTO_FIRE_INTERVAL_MS);
      }

      this._projectiles.update(dt);

      if (this._destroyFx && !this._destroyFx.done) {
        this._destroyFx.update(dt);
      }

      this._env.render();
    };
    animate();
  }
}
