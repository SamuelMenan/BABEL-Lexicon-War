import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this._composer = null;
    this._renderer = renderer;
    this._scene    = scene;
    this._camera   = camera;
  }

  init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this._composer = new EffectComposer(this._renderer);

    const renderPass = new RenderPass(this._scene, this._camera);
    this._composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      0.85,  // strength
      0.35,  // radius
      0.18,  // threshold
    );
    this._composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    this._composer.addPass(outputPass);

    window.addEventListener('resize', () => {
      this._composer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  render() {
    this._composer.render();
  }
}
