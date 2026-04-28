import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BLOOM_LAYER } from '../../shared/constants.js';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this._bloomComposer = null;
    this._finalComposer = null;
    this._renderer = renderer;
    this._scene    = scene;
    this._camera   = camera;

    this._bloomLayer = new THREE.Layers();
    this._bloomLayer.set(BLOOM_LAYER);

    this._darkMeshMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this._darkLineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    this._darkPointsMaterial = new THREE.PointsMaterial({ color: 0x000000, size: 0.001 });
    this._storedMaterials = {};

    this._damageVignettePass = null;
    this._damageVignetteStrength = 0;
    this._damageFadePerSecond = 1.5;
    this._maxDamageForFullVignette = 45;
  }

  init() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const renderPass = new RenderPass(this._scene, this._camera);

    this._bloomComposer = new EffectComposer(this._renderer);
    this._bloomComposer.renderToScreen = false;
    this._bloomComposer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      0.55,  // strength
      0.28,  // radius
      0.28,  // threshold
    );
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
    this._finalComposer.addPass(renderPass);
    this._finalComposer.addPass(mixPass);

    this._damageVignettePass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          vignetteStrength: { value: 0 },
          vignetteColor: { value: new THREE.Color(0xff1a1a) },
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
    this._finalComposer.addPass(this._damageVignettePass);

    const outputPass = new OutputPass();
    this._finalComposer.addPass(outputPass);

    window.addEventListener('resize', () => {
      this._bloomComposer.setSize(window.innerWidth, window.innerHeight);
      this._finalComposer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  onPlayerDamage(amount = 0) {
    const normalized = THREE.MathUtils.clamp(
      amount / this._maxDamageForFullVignette,
      0,
      1,
    );

    // Stack small hits naturally; big hits can push close to full vignette.
    this._damageVignetteStrength = THREE.MathUtils.clamp(
      this._damageVignetteStrength + normalized,
      0,
      1,
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

  _darkenNonBloomed(obj) {
    if (!(obj.isMesh || obj.isLine || obj.isPoints)) return;
    if (this._bloomLayer.test(obj.layers)) return;

    this._storedMaterials[obj.uuid] = obj.material;

    if (obj.isPoints) {
      obj.material = this._darkPointsMaterial;
      return;
    }

    if (obj.isLine) {
      obj.material = this._darkLineMaterial;
      return;
    }

    obj.material = this._darkMeshMaterial;
  }

  _restoreMaterial(obj) {
    const oldMaterial = this._storedMaterials[obj.uuid];
    if (!oldMaterial) return;
    obj.material = oldMaterial;
    delete this._storedMaterials[obj.uuid];
  }

  render() {
    this._scene.traverse((obj) => this._darkenNonBloomed(obj));
    this._bloomComposer.render();
    this._scene.traverse((obj) => this._restoreMaterial(obj));
    this._finalComposer.render();
  }
}

