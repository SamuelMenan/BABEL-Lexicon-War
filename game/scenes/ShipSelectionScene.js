import * as THREE from 'three';
import { SHIP_PALETTES } from '../../shared/constants.js';
import { getShipsForHangar } from '../../shared/shopCatalog.js';

const SHIPS = getShipsForHangar();
import { ParticleEmitter } from '../rendering/ParticleEmitter.js';
import { HangarRenderer } from './hangar/HangarRenderer.js';
import { HangarCameraController } from './hangar/HangarCameraController.js';
import { HangarLoader } from './hangar/HangarLoader.js';
import { DeploymentAnimator } from './hangar/DeploymentAnimator.js';
import { HangarProjectiles } from './hangar/HangarProjectiles.js';
import { HangarLaser } from './hangar/HangarLaser.js';
import { Bridge } from '../../shared/bridge.js';
import { playSfx } from '../../shared/audioManager.js';

const FIRE_COOLDOWN_MS      = 150;
const AUTO_FIRE_INTERVAL_MS = 110; // cadencia rafaga K (corto, continuo)
const FLOW_RAMP_SPEED       = 1 / 0.6; // 0→1 en 0.6s

// Adjusts vertical spawn position of all ships. Negative = lower, positive = higher.
const SHIP_SPAWN_OFFSET = { x: 0, y: -0.1, z: 0 };

export class ShipSelectionScene {
  constructor(mount, { onLoadStart, onLoadEnd } = {}) {
    this._alive      = true;
    this._keys       = new Set();
    this._autoRotate = true;
    this._lastTime   = performance.now();
    this._rafId      = null;

    this._env    = new HangarRenderer(mount);
    this._cam    = new HangarCameraController(this._env.camera);
    this._loader = new HangarLoader(this._env.scene, { onLoadStart, onLoadEnd });
    this._deploy = new DeploymentAnimator(this._env.scene, this._env.camera, this._cam);
    this._projectiles = new HangarProjectiles(this._env.scene);
    this._laser       = new HangarLaser(this._env.scene);
    // ParticleEmitter — mismo sistema que combat. Habilita playerDeathSequence
    // (animacion cinematica completa: flash + scatter bursts + 2 shockwaves +
    // ember). Antes hangar usaba ShipDestroyFx directo (1 burst plano).
    this._particles   = new ParticleEmitter(this._env.scene);
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
    // Skip primer load (mount inicial) — solo dispara en cambios de nave.
    if (this._loadShipCalled) playSfx('hangar.ship_change');
    this._loadShipCalled = true;
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
    const gameMode = Bridge.peekState?.()?.pendingGameMode ?? 'combat';
    playSfx('propulsion.ignite');
    // Estabilizar nave a pose baseline (lerp suave ~350ms) ANTES de iniciar
    // launch. Antes se hacia snap instantaneo + animator arrancaba desde
    // cualquier punto del ciclo de flotacion → nave visualmente desalineada
    // al despegar. Ahora se ve "asentarse" antes del despegue.
    return this._stabilizeShip(wrapper).then(() => {
      return this._deploy.triggerDeployment(wrapper, palette, gameMode).then((res) => {
        this._loader.boosters.forEach(b => b.setHangarMode?.(true));
        this._flowModeOff = true;
        return res;
      });
    });
  }

  // Lerp suave wrapper position.y + rotation.x/z desde valores actuales del ciclo
  // de flotacion hacia el baseline guardado en HangarLoader.loadShip. Durante el
  // lerp, _stabilizing=true bloquea updateFloat en el loop para evitar fight.
  _stabilizeShip(wrapper) {
    return new Promise((resolve) => {
      if (!wrapper || !wrapper.userData) { resolve(); return; }
      const ud = wrapper.userData;
      if (ud.floatBaseY == null) { resolve(); return; }
      this._stabilizing = true;
      const STAB_MS = 350;
      const startY  = wrapper.position.y;
      const startRX = wrapper.rotation.x;
      const startRZ = wrapper.rotation.z;
      const t0 = performance.now();
      const tick = () => {
        if (!this._alive) { this._stabilizing = false; resolve(); return; }
        const k  = Math.min(1, (performance.now() - t0) / STAB_MS);
        const ek = 1 - Math.pow(1 - k, 3);  // cubic ease-out
        wrapper.position.y = startY  + (ud.floatBaseY    - startY)  * ek;
        wrapper.rotation.x = startRX + (ud.floatBaseRotX - startRX) * ek;
        wrapper.rotation.z = startRZ + (ud.floatBaseRotZ - startRZ) * ek;
        if (k < 1) requestAnimationFrame(tick);
        else { this._stabilizing = false; resolve(); }
      };
      requestAnimationFrame(tick);
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
    // Si pasa a false: hangarMode se restaurara cuando _flowRatio vuelva a 0
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
    // Reusa playerDeathSequence de combate. Scale 0.45 — nave hangar es mas
    // pequeña que la de combat (target ~2.2 vs ~3.8). Reduce offsets +
    // intensidades de los bursts para no inundar la pantalla.
    const ship = SHIPS[this._loader.currentShipIndex ?? 0];
    const palette = ship ? SHIP_PALETTES[ship.id] : null;
    const colorRamp = palette?.normalRamp ?? null;
    const pos = new THREE.Vector3(0, SHIP_SPAWN_OFFSET.y, 0);
    playSfx('explosion.detonate');
    this._particles.playerDeathSequence(pos, colorRamp, 0.3);
  }

  addKey(key)    { this._keys.add(key); }
  removeKey(key) { this._keys.delete(key); }

  startDrag(x, y) { this._cam.startDrag(x, y); }
  drag(x, y)      { this._cam.drag(x, y); }
  endDrag()       { this._cam.endDrag(); }
  zoom(delta)     { this._cam.zoom(delta); }

  resetOrbit()    { this._cam.resetOrbit(); this._viewIdx = 0; }
  setTopView()    { this._cam.setTopView(); }
  setBottomView() { this._cam.setBottomView(); }
  setRearView()   { this._cam.setRearView(); }
  setSideView()   { this._cam.setSideView(); }

  // Cycle entre vistas predefinidas (front/top/rear/side).
  cycleCameraView() {
    this._viewIdx = ((this._viewIdx ?? 0) + 1) % 4;
    switch (this._viewIdx) {
      case 0: this._cam.resetOrbit();   break; // front
      case 1: this._cam.setTopView();   break;
      case 2: this._cam.setRearView();  break;
      case 3: this._cam.setSideView();  break;
    }
  }

  toggleDebugMarkers() { this._loader.toggleDebugMarkers(); }

  fireWeapon(cooldownMs = FIRE_COOLDOWN_MS) {
    if (this._deploy.isActive) return;
    if (this._laserOn) return; // laser activo: no mezclar rafaga
    const now = performance.now();
    if (now - this._lastShotAt < cooldownMs) return;
    const shots = this._loader.getMuzzleShots();
    if (!shots.length) return;
    this._lastShotAt = now;
    playSfx(this._flowSim ? 'weapons.laser' : 'weapons.shoot');
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
    this._particles?.dispose();
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
        // desfasaria estela vs nave.
        const d = this._deploy.boosterDrive;
        this._loader.boosters.forEach(b => b.update(dt, d.accel, d.vScale, d.rScale, d.flowRatio));
      } else {
        // Stabilize phase: _stabilizeShip dueño exclusivo del wrapper transform.
        // Skip updateFloat (escribiria sobre el lerp). Boosters siguen activos.
        if (!this._stabilizing) {
          this._floatTime += dt;
          this._loader.updateFloat(this._floatTime);
        }
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
        const vScale = 1.0 + fr * 1.0;  // max 2.0 (antes 3.2)
        const rScale = 1.0 + fr * 0.6;  // max 1.6 (antes 2.6)
        const accel  = fr > 0.05;
        this._loader.boosters.forEach(b => b.update(dt, accel, vScale, rScale, fr));
      }
      this._loader.mixers.forEach(m => m?.update(dt));

      // Modo laser tiene prioridad sobre rafaga K.
      if (isDeploying) {
        this._laser.clear();
      } else if (this._laserOn) {
        this._laser.update(this._loader.getMuzzleShots(), dt);
      } else if (this._autoFiring) {
        this.fireWeapon(AUTO_FIRE_INTERVAL_MS);
      }

      this._projectiles.update(dt);
      this._particles.update(dt);

      this._env.render();
    };
    animate();
  }
}
