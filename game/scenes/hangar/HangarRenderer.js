import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class HangarRenderer {
  constructor(mount) {
    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    mount.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020208);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 400);

    this._buildLights();
    this._buildStars();
    this._buildComposer(w, h);

    this._onResize = () => {
      const w2 = mount.clientWidth || window.innerWidth;
      const h2 = mount.clientHeight || window.innerHeight;
      this.renderer.setSize(w2, h2);
      this.composer.setSize(w2, h2);
      this.camera.aspect = w2 / h2;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this._onResize);
  }

  _buildLights() {
    // Deep blue ambient — space shadow fill
    this.scene.add(new THREE.AmbientLight(0x060c1a, 1.0));

    // Cold blue-white from upper-left — main illumination
    const starLight = new THREE.DirectionalLight(0xc8d8ff, 3.5);
    starLight.position.set(-10, 8, 12);
    this.scene.add(starLight);

    // Cold teal rim behind ship — separates silhouette from station
    const rimLight = new THREE.DirectionalLight(0x00ccee, 2.2);
    rimLight.position.set(0, 4, -12);
    this.scene.add(rimLight);

    // Warm secondary from right — adds depth to ship detail
    const warmFill = new THREE.DirectionalLight(0x3a2810, 1.2);
    warmFill.position.set(8, -3, 6);
    this.scene.add(warmFill);
  }

  _buildStars() {
    const pCount = 1400;
    const pPos   = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 80 + Math.random() * 120;
      pPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = r * Math.cos(phi);
    }
    this._starGeo = new THREE.BufferGeometry();
    this._starGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    this._starMat = new THREE.PointsMaterial({ color: 0x99aabb, size: 0.22, sizeAttenuation: true });
    this.scene.add(new THREE.Points(this._starGeo, this._starMat));
  }

  _buildComposer(w, h) {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // Bloom highlights station metallic edges and emissive elements
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.38, 0.55, 0.88);
    this.composer.addPass(bloom);
  }

  render() {
    this.composer.render();
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    this._starGeo.dispose();
    this._starMat.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
