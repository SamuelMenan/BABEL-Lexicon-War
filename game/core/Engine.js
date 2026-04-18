import * as THREE from 'three';
import { GameLoop } from './GameLoop.js';
import { Camera } from '../rendering/Camera.js';
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
  }

  get camera() { return this._cam.instance; }

  init() {
    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLights();
    this._bindResize();

    // Render al final de cada frame
    this.loop.addSystem({
      update: () => this.renderer.render(this.scene, this.camera),
    });

    EventBus.emit(EventTypes.SCENE_READY);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(COLORS.BACKGROUND);
    this.mountEl.appendChild(this.renderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(COLORS.BACKGROUND, 0.018);
  }

  _initCamera() {
    this._cam = new Camera();
    this._cam.init();
    // Cámara actualiza en loop
    this.loop.addSystem({ update: (d) => this._cam.update(d) });
  }

  _initLights() {
    // Luz ambiental fría — base de visibilidad
    const ambient = new THREE.AmbientLight(0x112233, 1.2);
    this.scene.add(ambient);

    // Luz puntual delantera — ilumina enemigos al acercarse
    const front = new THREE.PointLight(0x00ffcc, 3, 30);
    front.position.set(0, 2, 10);
    this.scene.add(front);

    // Luz de relleno trasera — profundidad
    const back = new THREE.PointLight(0xff4466, 1.5, 40);
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

  start()   { this.loop.start(); }
  stop()    { this.loop.stop(); }

  destroy() {
    this.stop();
    this.renderer.dispose();
    this.mountEl.removeChild(this.renderer.domElement);
  }
}
