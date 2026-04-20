import * as THREE from 'three';
import { GameLoop } from './GameLoop.js';
import { Camera } from '../rendering/Camera.js';
import { PostProcessing } from '../rendering/PostProcessing.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { COLORS } from '../../shared/constants.js';

export class Engine {
  constructor(mountEl) {
    this.mountEl  = mountEl;
    this.loop     = new GameLoop();
    this.systems  = {};
    this.scene    = null;
    this._cam     = null;
    this.renderer = null;
    this._post    = null;
  }

  get camera()        { return this._cam.instance; }
  get camController() { return this._cam; }

  init() {
    this._initRenderer();
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
    // Iluminacion neutra para no alterar los colores del modelo.
    const ambient = new THREE.AmbientLight(0x202020, 0.9);
    this.scene.add(ambient);

    const front = new THREE.PointLight(0xffffff, 1.2, 26);
    front.position.set(0, 2, 10);
    this.scene.add(front);

    const back = new THREE.PointLight(0x667788, 0.55, 32);
    back.position.set(0, -3, -15);
    this.scene.add(back);
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

  start()   { this.loop.start(); }
  stop()    { this.loop.stop(); }

  destroy() {
    this.stop();
    this.renderer.dispose();
    this.mountEl.removeChild(this.renderer.domElement);
  }
}
