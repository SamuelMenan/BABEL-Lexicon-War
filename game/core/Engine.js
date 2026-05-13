import * as THREE from 'three';
import { GameLoop } from './GameLoop.js';
import { Camera } from '../rendering/Camera.js';
import { PostProcessing } from '../rendering/PostProcessing.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { COLORS } from '../../shared/constants.js';
import { detectQualityTier, setQualityTier, getQualityTier } from '../../shared/qualitySettings.js';

export class Engine {
  constructor(mountEl) {
    this.mountEl    = mountEl;
    this.loop       = new GameLoop();
    this.systems    = {};
    this.scene      = null;
    this._cam       = null;
    this.renderer   = null;
    this._post      = null;
    this.qualityTier = null; // set in init() after renderer is available
  }

  get quality() { return this.qualityTier; }

  get camera()        { return this._cam.instance; }
  get camController() { return this._cam; }

  init() {
    this._initRenderer();
    // Detect hardware capability immediately after renderer is created.
    const tier = detectQualityTier(this.renderer);
    setQualityTier(tier);
    this.qualityTier = tier;

    this._initScene();
    this._initCamera();
    this._initLights();
    this._initPost();
    this._bindResize();

    // Render al final de cada frame via composer (bloom)
    this.loop.addSystem({
      update: (d) => {
        this._post.update(d);
        this._post.render();
      },
    });

    EventBus.emit(EventTypes.SCENE_READY);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    // Cap pixelRatio a 1.5: retina renderea 2.25× píxeles vs 4× con cap 2.
    // ~45% menos fragment work, diferencia visual sutil (texto/UI siguen nítidos via DOM).
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(COLORS.BACKGROUND);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.mountEl.appendChild(this.renderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x00000a);
    this.scene.fog = new THREE.FogExp2(0x00000a, 0.006);
  }

  _initCamera() {
    this._cam = new Camera();
    this._cam.init();
    this.loop.addSystem({ update: (d) => this._cam.update(d) });
  }

  _initPost() {
    this._post = new PostProcessing(this.renderer, this.scene, this.camera);
    this._post.init();
  }

  _initLights() {
    // Mirror HangarRenderer rig so ships look identical across hangar/combat/race.
    const ambient = new THREE.AmbientLight(0x060c1a, 1.0);
    this.scene.add(ambient);
    this._globalAmbient = ambient;

    const front = new THREE.DirectionalLight(0xc8d8ff, 3.5);
    front.position.set(-10, 8, 12);
    this.scene.add(front);
    this._globalFront = front;

    const back = new THREE.DirectionalLight(0x00ccee, 2.2);
    back.position.set(0, 4, -12);
    this.scene.add(back);
    this._globalBack = back;

    const warm = new THREE.DirectionalLight(0x3a2810, 1.2);
    warm.position.set(8, -3, 6);
    this.scene.add(warm);
    this._globalWarm = warm;
  }

  suppressGlobalLights() {
    if (this._globalAmbient) this._globalAmbient.intensity = 0;
    if (this._globalFront)   this._globalFront.intensity   = 0;
    if (this._globalBack)    this._globalBack.intensity    = 0;
    if (this._globalWarm)    this._globalWarm.intensity    = 0;
  }

  restoreGlobalLights() {
    if (this._globalAmbient) this._globalAmbient.intensity = 1.0;
    if (this._globalFront)   this._globalFront.intensity   = 3.5;
    if (this._globalBack)    this._globalBack.intensity    = 2.2;
    if (this._globalWarm)    this._globalWarm.intensity    = 1.2;
  }

  _bindResize() {
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  addSystem(name, system) {
    this.systems[name] = system;
    this.loop.addSystem(system);
  }

  onPlayerDamage(amount) {
    this._post?.onPlayerDamage(amount);
  }

  invalidateBloomCache() {
    this._post?.invalidateBloomCache();
  }

  setBloomEnabled(enabled) {
    this._post?.setBloomEnabled(enabled);
  }

  start()   { this.loop.start(); }
  stop()    { this.loop.stop(); }

  destroy() {
    this.stop();
    this.renderer.dispose();
    this.mountEl.removeChild(this.renderer.domElement);
  }
}
