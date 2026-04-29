import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BLOOM_LAYER } from '../../shared/constants.js';
import { getQualityProfile } from '../../shared/qualitySettings.js';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this._bloomComposer  = null;
    this._finalComposer  = null;
    this._simpleComposer = null; // used when bloom is disabled
    this._renderer = renderer;
    this._scene    = scene;
    this._camera   = camera;

    this._bloomLayer = new THREE.Layers();
    this._bloomLayer.set(BLOOM_LAYER);

    this._darkMeshMaterial   = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this._darkLineMaterial   = new THREE.LineBasicMaterial({ color: 0x000000 });
    this._darkPointsMaterial = new THREE.PointsMaterial({ color: 0x000000, size: 0.001 });

    // Cache of non-bloom scene objects rebuilt once per scene, not per frame.
    this._nonBloomCache      = [];
    this._cachedMaterials    = [];
    this._nonBloomCacheDirty = true;

    this._damageVignettePass      = null;
    this._damageVignetteStrength  = 0;
    this._damageFadePerSecond     = 1.5;
    this._maxDamageForFullVignette = 45;

    this._bloomEnabled = true; // resolved in init()
  }

  init() {
    const profile = getQualityProfile();
    this._bloomEnabled = profile.bloomEnabled;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const vignettePass = this._buildVignettePass();

    if (this._bloomEnabled) {
      this._initBloomPath(w, h, profile.bloomResScale, vignettePass);
    } else {
      this._initSimplePath(vignettePass);
    }

    window.addEventListener('resize', () => this._onResize());
  }

  _buildVignettePass() {
    const pass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture:      { value: null },
          vignetteStrength: { value: 0 },
          vignetteColor:    { value: new THREE.Color(0xff1a1a) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D baseTexture;
          uniform float vignetteStrength;
          uniform vec3 vignetteColor;
          varying vec2 vUv;

          void main() {
            vec4 base = texture2D(baseTexture, vUv);

            vec2 p = vUv * 2.0 - 1.0;
            float radial = length(p);
            float edgeMask = smoothstep(0.5, 1.1, radial);

            // Stronger response near corners than side centers.
            float cornerMask = pow(clamp(abs(p.x) * abs(p.y), 0.0, 1.0), 0.55);

            float mask = clamp(edgeMask * 0.72 + cornerMask * 1.25, 0.0, 1.0);
            float amount = clamp(mask * vignetteStrength, 0.0, 1.0);

            vec3 outColor = mix(base.rgb, vignetteColor, amount);
            gl_FragColor = vec4(outColor, base.a);
          }
        `,
      }),
      'baseTexture',
    );
    this._damageVignettePass = pass;
    return pass;
  }

  _initBloomPath(w, h, resScale, vignettePass) {
    const bw = Math.floor(w * resScale);
    const bh = Math.floor(h * resScale);
    const renderPass = new RenderPass(this._scene, this._camera);

    this._bloomComposer = new EffectComposer(this._renderer);
    this._bloomComposer.renderToScreen = false;
    this._bloomComposer.setSize(bw, bh);
    this._bloomComposer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(bw, bh), 0.55, 0.28, 0.28);
    this._bloomComposer.addPass(bloomPass);

    const mixPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture:  { value: null },
          bloomTexture: { value: this._bloomComposer.renderTarget2.texture },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() {
            vec4 base = texture2D(baseTexture, vUv);
            vec4 glow = texture2D(bloomTexture, vUv);
            gl_FragColor = base + glow;
          }
        `,
      }),
      'baseTexture',
    );

    this._finalComposer = new EffectComposer(this._renderer);
    this._finalComposer.addPass(new RenderPass(this._scene, this._camera));
    this._finalComposer.addPass(mixPass);
    this._finalComposer.addPass(vignettePass);
    this._finalComposer.addPass(new OutputPass());
  }

  _initSimplePath(vignettePass) {
    // No bloom: single scene render + vignette + output. ~50% GPU savings on mid/low hardware.
    this._simpleComposer = new EffectComposer(this._renderer);
    this._simpleComposer.addPass(new RenderPass(this._scene, this._camera));
    this._simpleComposer.addPass(vignettePass);
    this._simpleComposer.addPass(new OutputPass());
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (this._bloomEnabled) {
      const scale = getQualityProfile().bloomResScale;
      this._bloomComposer.setSize(Math.floor(w * scale), Math.floor(h * scale));
      this._finalComposer.setSize(w, h);
    } else {
      this._simpleComposer.setSize(w, h);
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  setBloomEnabled(enabled) {
    if (this._bloomEnabled === enabled) return;
    // Runtime toggle — requires composers to already be initialized.
    // If switching to bloom but bloomComposer was never built (LOW tier), silently ignore.
    if (enabled && !this._bloomComposer) return;
    this._bloomEnabled = enabled;
  }

  onPlayerDamage(amount = 0) {
    const normalized = THREE.MathUtils.clamp(amount / this._maxDamageForFullVignette, 0, 1);
    this._damageVignetteStrength = THREE.MathUtils.clamp(
      this._damageVignetteStrength + normalized, 0, 1,
    );
  }

  update(delta) {
    if (!this._damageVignettePass) return;
    this._damageVignetteStrength = Math.max(
      0,
      this._damageVignetteStrength - delta * this._damageFadePerSecond,
    );
    this._damageVignettePass.uniforms.vignetteStrength.value = this._damageVignetteStrength;
  }

  // Call whenever objects are added/removed from the scene (e.g. on mode switch).
  invalidateBloomCache() {
    this._nonBloomCacheDirty = true;
  }

  render() {
    if (!this._bloomEnabled) {
      this._simpleComposer.render();
      return;
    }

    // Rebuild non-bloom object list once per scene setup, never per frame.
    if (this._nonBloomCacheDirty) {
      this._nonBloomCache = [];
      this._scene.traverse((obj) => {
        if ((obj.isMesh || obj.isLine || obj.isPoints) && !this._bloomLayer.test(obj.layers)) {
          this._nonBloomCache.push(obj);
        }
      });
      this._nonBloomCacheDirty = false;
    }

    const cache = this._nonBloomCache;
    const len   = cache.length;
    if (this._cachedMaterials.length < len) this._cachedMaterials.length = len;

    for (let i = 0; i < len; i++) {
      const obj = cache[i];
      this._cachedMaterials[i] = obj.material;
      obj.material = obj.isPoints ? this._darkPointsMaterial
        : obj.isLine ? this._darkLineMaterial
        : this._darkMeshMaterial;
    }
    this._bloomComposer.render();
    for (let i = 0; i < len; i++) {
      cache[i].material = this._cachedMaterials[i];
    }
    this._finalComposer.render();
  }
}
