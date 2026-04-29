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
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(COLORS.BACKGROUND);
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
    const ambient = new THREE.AmbientLight(0x202020, 0.9);
    this.scene.add(ambient);
    this._globalAmbient = ambient;

    const front = new THREE.PointLight(0xffffff, 1.2, 26);
    front.position.set(0, 2, 10);
    this.scene.add(front);
    this._globalFront = front;

    const back = new THREE.PointLight(0x667788, 0.55, 32);
    back.position.set(0, -3, -15);
    this.scene.add(back);
    this._globalBack = back;
  }

  suppressGlobalLights() {
    if (this._globalAmbient) this._globalAmbient.intensity = 0;
    if (this._globalFront)   this._globalFront.intensity   = 0;
    if (this._globalBack)    this._globalBack.intensity    = 0;
  }

  restoreGlobalLights() {
    if (this._globalAmbient) this._globalAmbient.intensity = 0.9;
    if (this._globalFront)   this._globalFront.intensity   = 1.2;
    if (this._globalBack)    this._globalBack.intensity    = 0.55;
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
