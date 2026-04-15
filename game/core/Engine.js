// Núcleo del motor — inicializa renderer, sistemas y loop

import * as THREE from 'three';
import { GameLoop } from './GameLoop.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { COLORS, CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR } from '../../shared/constants.js';

export class Engine {
  constructor(mountEl) {
    this.mountEl = mountEl;
    this.loop    = new GameLoop();
    this.systems = {};
    this.scene   = null;
    this.camera  = null;
    this.renderer = null;
  }

  init() {
    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._bindResize();

    EventBus.emit(EventTypes.SCENE_READY);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(COLORS.BACKGROUND);
    this.mountEl.appendChild(this.renderer.domElement);

    // El renderer actualiza en cada tick del loop
    this.loop.addSystem({
      update: () => this.renderer.render(this.scene, this.camera),
    });
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(COLORS.BACKGROUND, 0.02);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CAMERA_NEAR,
      CAMERA_FAR,
    );
    this.camera.position.set(0, 0, 20);
  }

  _bindResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  addSystem(name, system) {
    this.systems[name] = system;
    this.loop.addSystem(system);
  }

  start() {
    this.loop.start();
  }

  stop() {
    this.loop.stop();
  }

  destroy() {
    this.stop();
    this.renderer.dispose();
    this.mountEl.removeChild(this.renderer.domElement);
  }
}
