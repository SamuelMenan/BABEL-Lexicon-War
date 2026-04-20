import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Enemy, pickEnemyType } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { Projectile, PROJECTILE_TYPES } from '../entities/Projectile.js';
import { WordToken } from '../entities/WordToken.js';
import { ParticleEmitter } from '../rendering/ParticleEmitter.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import { WORD_POOL_ES,ENEMY_BASE_SPEED,ENEMY_SPEED_SCALE,MAX_ACTIVE_ENEMIES,WAVE_INTERVAL_MS,PLAYER_MAX_HP,HIT_DAMAGE,BLOOM_LAYER } from '../../shared/constants.js';
import { getSoftGlowTexture } from '../../shared/softVisuals.js';

const ARENA_SCENARIO_1='scenario-1-legacy';
const ARENA_SCENARIO_2='scenario-2-combat-clean';
const ACTIVE_ARENA_SCENARIO=ARENA_SCENARIO_2;

const CAM_Z = 8;
const MOON_SCREEN_R = 0.26; // projected angular radius + buffer
function randomSpawnPosition() {
  const z = -(62 + Math.random()*28);
  const zone = Math.random();
  let x, y;
  if (zone < 0.33) {
    // center zone — come from above or below moon
    x = (Math.random()-0.5) * 10;
    y = (Math.random() < 0.5 ? 1 : -1) * (24 + Math.random()*10);
  } else if (zone < 0.66) {
    // left zone
    x = -(20 + Math.random()*14);
    y = (Math.random()-0.5) * 22;
  } else {
    // right zone
    x = 20 + Math.random()*14;
    y = (Math.random()-0.5) * 22;
  }
  return new THREE.Vector3(x, y, z);
}
function randomWord(exclude=[]) {
  const pool=WORD_POOL_ES.filter(w=>!exclude.includes(w));
  return pool[Math.floor(Math.random()*pool.length)];
}
export class SceneManager {
  constructor(scene,lexicon,physics,hudCanvas,cam=null) {
    this.scene=scene; this.lexicon=lexicon; this.physics=physics; this.hudCanvas=hudCanvas; this._cam=cam;
    this.enemies=[]; this.tokens=[]; this.projectiles=[];
    this.wave=0; this.hp=PLAYER_MAX_HP; this._waveTimer=0;
    this._unsubs=[]; this._player=null; this._particles=null; this._decorRings=[]; this._backdrop=null; this._backdropMixer=null;
    this._arenaScenario=ACTIVE_ARENA_SCENARIO;
    this._moon=null;
    this._moonLight=null;
    this._moonRings=[]; this._torusRings=[]; this._coreRings=[]; this._coreGroup=null;
  }
  init() {
    this._buildArena(); this._buildPlayer();
    this._particles=new ParticleEmitter(this.scene);
    this._unsubs.push(
EventBus.on(EventTypes.WORD_COMPLETED,(pp)=>this._onWordCompleted(pp)),
      EventBus.on(EventTypes.ENEMY_REACHED,(pp)=>this._onEnemyReached(pp)),
      EventBus.on(EventTypes.WORD_PROGRESS,(pp)=>this._onWordProgress(pp)),
    );
  }
  destroy() {
    this._unsubs.forEach(fn=>fn());
    this._particles?.dispose();
    this._backdropMixer?.stopAllAction();
    this._backdropMixer=null;
    this._backdrop?.removeFromParent();
    this._backdrop=null;
    if(this._moon){ this._moon.removeFromParent(); this._moon=null; }
    if(this._moonLight){ this._moonLight.removeFromParent(); this._moonLight=null; }
  }
  update(delta) {
    this.physics.update(delta); this.hudCanvas.update(delta);
    this._particles.update(delta); this._player?.update(delta);
    this._backdropMixer?.update(delta);
    this._updateProjectiles(delta); this._autoTarget(); this._pruneDeadEnemies();
    for(const r of this._decorRings) r.rotation.z+=delta*0.05;
    if(this._moon) this._moon.rotation.y-=delta*0.08;
    const _rSpeeds=[0.055,0.042,0.038,0.038,0.035,0.07,0.032,0.018]; this._moonRings.forEach((r,i)=>{ r.rotation.y += delta*(_rSpeeds[i]??0.04); }); this._torusRings.forEach(r=>{ r.rotation.z -= delta*0.04; }); if(this._coreGroup){ this._coreGroup.rotation.y += delta*0.12; this._coreRings.forEach(grp=>{ const rs=grp.userData.rotSpeed; grp.rotation.x+=delta*rs[0]; grp.rotation.y+=delta*rs[1]; grp.rotation.z+=delta*rs[2]; }); }
    this._waveTimer+=delta*1000;
    if(this._waveTimer>=WAVE_INTERVAL_MS&&this.enemies.filter(e=>e.active).length===0){
      this._waveTimer=0; this._startWave();
    }
  }
  _buildArena() {
    if(this._arenaScenario===ARENA_SCENARIO_1){
      this._buildArenaScenario1();
      return;
    }

    this._buildArenaScenario2();
  }
  _buildArenaScenario1() {
    // Escenario 1 (guardado): version anterior con capas decorativas.
    this._addNebula(0,0,-30,0x000000,1.0,280,THREE.BackSide);
    this._loadCombatBackdropScenario1();

    // Nubes nebulosas — capas tipo Pilares de la Creacion
    this._addNebula(-60,20,-120,0x05070a,0.06,70);
    this._addNebula(70,-10,-140,0x04070b,0.05,80);
    this._addNebula(0,30,-100,0x08080d,0.045,60);
    this._addNebula(-30,-20,-90,0x090703,0.04,50);
    this._addNebula(40,25,-110,0x050809,0.038,55);
    this._addNebula(-10,10,-70,0x0b0507,0.035,38);
    this._addNebula(20,-15,-80,0x040506,0.04,45);

    // Estrellas — distintos tamanos y colores
    this._addStarField(2000,500,0.1,0xc7d6e6);
    this._addStarField(700,200,0.2,0xd8e2ef);
    this._addStarField(200,100,0.35,0xeaf3ff);
    this._addStarField(40,80,0.75,0xffffff);

    this._addDecorRing(0,0,-60,22,0x0a2030);
    this._addDecorRing(0,0,-90,35,0x0a1525);
  }
  _buildArenaScenario2() {
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = null;

    // ── Starfield: farther stars bigger size so they read clearly ──
    // Deep background carpet
    this._addStarField(8000, 900, 0.32, 0x8899bb, 0.72);
    // Mid cold-blue layer
    this._addStarField(3500, 650, 0.20, 0xaabbdd, 0.82);
    // Warm yellow-white layer mixed in
    this._addStarField(1800, 700, 0.28, 0xffeecc, 0.75);
    // Close bright stars
    this._addStarField(500,  300, 0.40, 0xddeeff, 0.95);
    // Very bright individuals — high spread so they appear at edges too
    this._addStarField(120,  800, 0.90, 0xffffff, 1.0);
    // Ultra-bright rare giants — scattered everywhere
    this._addStarField(30,   600, 1.60, 0xeef6ff, 1.0);
    // Star clusters — concentrated patches like Pleiades
    this._addStarCluster(-180, 80, -200,  90, 22, 0.35, 0xccddff, 0.90);
    this._addStarCluster( 220,-60, -350,  70, 18, 0.30, 0xffeedd, 0.85);
    this._addStarCluster( 60, 150, -280, 110, 28, 0.25, 0xddeeff, 0.80);
    this._addStarCluster(-100,-120,-180,  50, 15, 0.45, 0xffffff, 1.00);
    this._addStarCluster(-380,  20, -250, 200, 45, 0.28, 0xccddff, 0.85);
    this._addStarCluster(-280, -40, -180, 150, 35, 0.22, 0xddeeff, 0.78);
    this._addStarCluster(-450,  80, -320, 120, 30, 0.32, 0xffffff, 0.70);

    // ── Milky Way band — diagonal dense strip ──
    this._addMilkyWay();


    this._loadMoon();

    // Ship lights — PointLights close to ship, range 9 so they can't reach moon
    const shipKey = new THREE.PointLight(0xc8deff, 1.6, 9);
    shipKey.position.set(-1.5, 2.5, 5.5);
    this.scene.add(shipKey);

    const shipFill = new THREE.PointLight(0x1a2a55, 1.0, 7);
    shipFill.position.set(2, -1.5, 5);
    this.scene.add(shipFill);

    const shipAmb = new THREE.AmbientLight(0x06090f, 1.0);
    this.scene.add(shipAmb);
  }
  _addBackgroundVoid(color,radius) {
    const mat=new THREE.MeshBasicMaterial({color,side:THREE.BackSide,depthWrite:false});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,14,14),mat);
    this.scene.add(mesh);
  }
  _loadCombatBackdropScenario1() {
    const loader=new GLTFLoader();
    loader.load(
      '/models/radiation_of_space.glb',
      (gltf)=>{
        const sceneRoot=gltf?.scene;
        if(!sceneRoot) return;

        const wrapper=new THREE.Group();
        wrapper.add(sceneRoot);

        sceneRoot.traverse((node)=>{
          if(!node.isMesh) return;
          node.castShadow=false;
          node.receiveShadow=false;
          node.frustumCulled=false;

          const sourceMats=Array.isArray(node.material)?node.material:[node.material];
          const tunedMats=sourceMats.map((sourceMat)=>{
            if(!sourceMat) return sourceMat;

            // Clonar para no contaminar materiales de otros modelos (p.ej. la nave).
            const mat=sourceMat.clone();
            const baseColor=mat.color?.clone?.()??new THREE.Color(0x9fb7ff);

            mat.fog=false;
            mat.depthWrite=false;
            mat.depthTest=true;
            mat.toneMapped=false;
            mat.side=THREE.DoubleSide;

            if('color' in mat && mat.color){
              mat.color.copy(baseColor.lerp(new THREE.Color(0xffffff),0.2));
            }

            if('emissive' in mat && mat.emissive){
              mat.emissive.copy(baseColor);
              mat.emissiveIntensity=Math.max(mat.emissiveIntensity??0,1.4);
            }

            if(mat.transparent){
              mat.opacity=Math.max(mat.opacity??1,0.9);
            }

            mat.needsUpdate=true;
            return mat;
          });

          node.material=Array.isArray(node.material)?tunedMats:tunedMats[0];
        });

        const initialBox=new THREE.Box3().setFromObject(wrapper);
        if(!initialBox.isEmpty()){
          const center=initialBox.getCenter(new THREE.Vector3());
          sceneRoot.position.sub(center);

          const centeredBox=new THREE.Box3().setFromObject(wrapper);
          const size=centeredBox.getSize(new THREE.Vector3());
          const longest=Math.max(size.x,size.y,size.z)||1;
          wrapper.scale.setScalar(320/longest);

          // Asegura que el modelo completo quede detras del plano de combate.
          const scaledBox=new THREE.Box3().setFromObject(wrapper);
          const nearestZ=scaledBox.max.z;
          const targetNearestZ=-95;
          const zShift=targetNearestZ-nearestZ;
          wrapper.position.z+=zShift;
        }

        // Modelo fijo al fondo, lejos del plano de combate.
        wrapper.position.x=0;
        wrapper.position.y=-6;
        wrapper.rotation.y=Math.PI;
        wrapper.renderOrder=-1000;

        this.scene.add(wrapper);
        this._backdrop=wrapper;
      },
      undefined,
      (err)=>{
        console.warn('Combat backdrop model could not be loaded.',err);
      },
    );
  }
  _loadCombatBackdropScenario2() {
    const loader=new GLTFLoader();
    loader.load(
      '/models/radiation_of_space.glb',
      (gltf)=>{
        const sceneRoot=gltf?.scene;
        if(!sceneRoot) return;

        this._backdropMixer?.stopAllAction();
        this._backdropMixer=null;

        const wrapper=new THREE.Group();
        wrapper.add(sceneRoot);

        sceneRoot.traverse((node)=>{
          if(!node.isMesh) return;
          node.castShadow=false;
          node.receiveShadow=false;
          node.frustumCulled=false;
          // Poner en bloom layer para que bloom lo ilumina
          node.layers.enable(BLOOM_LAYER);

          // Preservar materiales originales del GLB — solo ajustar propiedades de render
          const mats=Array.isArray(node.material)?node.material:[node.material];
          mats.forEach((mat)=>{
            if(!mat) return;
            mat.fog=false;
            mat.depthWrite=false;
            mat.side=THREE.DoubleSide;
            mat.toneMapped=false;
            // Boost emissive si existe para que brille más
            if('emissiveIntensity' in mat) mat.emissiveIntensity=Math.max(mat.emissiveIntensity??0,1.2);
            if('emissive' in mat && mat.emissive){
              const c=mat.color?.clone?.()??new THREE.Color(0x8844ff);
              mat.emissive.copy(c);
            }
            mat.needsUpdate=true;
          });
        });

        const initialBox=new THREE.Box3().setFromObject(wrapper);
        if(!initialBox.isEmpty()){
          const center=initialBox.getCenter(new THREE.Vector3());
          sceneRoot.position.sub(center);

          const centeredBox=new THREE.Box3().setFromObject(wrapper);
          const size=centeredBox.getSize(new THREE.Vector3());
          const longest=Math.max(size.x,size.y,size.z)||1;
          wrapper.scale.setScalar(360/longest);
        }

        // Centro del tunel alineado con el volumen de combate.
        wrapper.position.set(0,0,-50);
        wrapper.rotation.set(0,0,0);
        wrapper.renderOrder=-1000;

        this.scene.add(wrapper);
        this._backdrop=wrapper;

        const clips=gltf.animations||[];
        if(clips.length>0){
          this._backdropMixer=new THREE.AnimationMixer(wrapper);
          for(const clip of clips){
            const action=this._backdropMixer.clipAction(clip);
            action.reset();
            action.play();
          }
        }
      },
      undefined,
      (err)=>{
        console.warn('Combat backdrop model could not be loaded.',err);
      },
    );
  }
  _loadMoon() {
    const loader = new GLTFLoader();
    loader.load(
      '/models/truth_about_the_dark_side_of_the_moon.glb',
      (gltf) => {
        const root = gltf?.scene;
        if (!root) return;
        const box = new THREE.Box3().setFromObject(root);
        if (!box.isEmpty()) {
          const center = box.getCenter(new THREE.Vector3());
          root.position.sub(center);
          const size = box.getSize(new THREE.Vector3());
          const longest = Math.max(size.x, size.y, size.z) || 1;
          root.scale.setScalar(38 / longest);
        }
        root.traverse((node) => {
          if (!node.isMesh) return;
          node.layers.enable(BLOOM_LAYER);
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((mat) => {
            if (!mat) return;
            // Force material to respond to lights
            if (mat.isMeshBasicMaterial) {
              const stdMat = new THREE.MeshStandardMaterial({
                color: mat.color ?? new THREE.Color(0x888888),
                roughness: 0.85, metalness: 0.05,
              });
              Object.assign(mat, stdMat);
            } else {
              mat.roughness = mat.roughness ?? 0.85;
              mat.metalness = mat.metalness ?? 0.05;
            }
            mat.toneMapped = false;
            mat.needsUpdate = true;
          });
        });
        root.position.set(0, 0, -78);
        root.rotation.y = -Math.PI * 0.25;
        this.scene.add(root);
        this._moon = root;

        // Moon key — PointLight 18 units from moon surface, range 50 (never reaches ship at z=2.85)
        const keyLight = new THREE.PointLight(0xffe8b0, 1800, 72);
        keyLight.position.set(-22, 18, -65);
        this.scene.add(keyLight);
        this._moonLight = keyLight;

        // Moon core entity — APEX-style decoration + light
        const coreGroup = new THREE.Group();
        coreGroup.position.set(0, 0, -78);

        const sunLight = new THREE.PointLight(0xffcc44, 2800, 85);
        coreGroup.add(sunLight);

        const hullGeo = new THREE.IcosahedronGeometry(4.5, 1);
        const hullEdges = new THREE.EdgesGeometry(hullGeo);
        const hullMat = new THREE.LineBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.9 });
        const hullMesh = new THREE.LineSegments(hullEdges, hullMat);
        hullMesh.layers.enable(BLOOM_LAYER);
        coreGroup.add(hullMesh);
        hullGeo.dispose();

        const coreMat2 = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 2.5, transparent: true, opacity: 0.7 });
        const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 10), coreMat2);
        coreMesh.layers.enable(BLOOM_LAYER);
        coreGroup.add(coreMesh);

        const glowSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: getSoftGlowTexture(), color: 0xffcc44, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
        glowSpr.scale.set(28, 28, 1);
        glowSpr.layers.enable(BLOOM_LAYER);
        coreGroup.add(glowSpr);

        const coreRingDefs = [
          { r: 7.0, tube: 0.18, rotX: Math.PI/3,   speed: [0, 0.8, 0] },
          { r: 7.0, tube: 0.18, rotZ: Math.PI/2.5,  speed: [0.7, 0, 0] },
          { r: 5.0, tube: 0.12, rotX: Math.PI/1.5,  speed: [0, -1.2, 0] },
          { r: 3.5, tube: 0.09, rotZ: Math.PI/1.2,  speed: [-0.6, 0.4, 0] },
        ];
        this._coreRings = [];
        coreRingDefs.forEach(rd => {
          const rg = new THREE.TorusGeometry(rd.r, rd.tube, 6, 32);
          const rm = new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffaa00, emissiveIntensity: 1.8 });
          const rmesh = new THREE.Mesh(rg, rm);
          rmesh.layers.enable(BLOOM_LAYER);
          const grp = new THREE.Group();
          grp.add(rmesh);
          if (rd.rotX !== undefined) grp.rotation.x = rd.rotX;
          if (rd.rotZ !== undefined) grp.rotation.z = rd.rotZ;
          grp.userData.rotSpeed = rd.speed;
          this._coreRings.push(grp);
          coreGroup.add(grp);
        });

        this._coreGroup = coreGroup;
        this.scene.add(coreGroup);

        // Moon cold rim from right — defines crescent edge
        const rimLight = new THREE.PointLight(0x2255cc, 500, 62);
        rimLight.position.set(24, -12, -65);
        this.scene.add(rimLight);

        // Moon-local ambient only (very dim, won't affect bright ship area)
        const moonAmb = new THREE.AmbientLight(0x030508, 1.5);
        this.scene.add(moonAmb);

        // ── Void environment around the moon ──
        // Dark absorbing halo (slightly bigger than moon)
        const haloGeo = new THREE.SphereGeometry(22, 20, 20);
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0x000000, transparent: true, opacity: 0.72,
          depthWrite: false, side: THREE.FrontSide,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.set(0, 0, -78);
        halo.renderOrder = -1;
        this.scene.add(halo);

        // Saturn-style particle rings — varied shapes and star colors
        const _makeShapeTex = (shape) => {
          const c = document.createElement('canvas');
          c.width = c.height = 32;
          const ctx = c.getContext('2d');
          ctx.clearRect(0, 0, 32, 32);
          ctx.fillStyle = '#ffffff';
          const cx = 16, cy = 16, r = 13;
          if (shape === 'square') {
            ctx.fillRect(4, 4, 24, 24);
          } else if (shape === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy);
            ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
            ctx.closePath(); ctx.fill();
          } else if (shape === 'cross') {
            ctx.fillRect(cx - 3, cy - r, 6, r * 2);
            ctx.fillRect(cx - r, cy - 3, r * 2, 6);
          } else if (shape === 'star') {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
              const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
              const b = a + (2 * Math.PI) / 10;
              i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
                      : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
              ctx.lineTo(cx + (r * 0.45) * Math.cos(b), cy + (r * 0.45) * Math.sin(b));
            }
            ctx.closePath(); ctx.fill();
          } else {
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
          }
          return new THREE.CanvasTexture(c);
        };
        const _makeRing = (count, rMin, rMax, tiltX, sz, op, color, shape) => {
          const pos = new Float32Array(count * 3);
          for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const r = rMin + Math.random() * (rMax - rMin);
            pos[i*3]   = r * Math.cos(theta);
            pos[i*3+1] = (Math.random() - 0.5) * 0.5;
            pos[i*3+2] = r * Math.sin(theta);
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          const mat = new THREE.PointsMaterial({
            color, size: sz, sizeAttenuation: true,
            transparent: true, opacity: op,
            blending: THREE.AdditiveBlending, depthWrite: false,
            alphaTest: 0.01,
          });
          mat.map = _makeShapeTex(shape);
          mat.alphaMap = mat.map;
          const pts = new THREE.Points(geo, mat);
          pts.position.set(0, 0, -78);
          pts.rotation.x = tiltX;
          pts.frustumCulled = false;
          pts.layers.enable(BLOOM_LAYER);
          this.scene.add(pts);
          this._moonRings.push(pts);
        };
        _makeRing(600, 13, 20, Math.PI / 2.6, 0.07, 0.85, 0xaaddff, 'circle');
        _makeRing(800, 21, 31, Math.PI / 2.4, 0.28, 0.88, 0xfff4e0, 'square');
        // ── Static torus between ring 2 and ring 3 — no animation ──
        (() => {
          const addT = (radius, tube, color, opacity) => {
            const geo = new THREE.TorusGeometry(radius, tube, 4, 120);
            const mat = new THREE.MeshBasicMaterial({
              color, transparent: true, opacity,
              depthWrite: false, depthTest: true,
              blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(0, -4, -78);
            mesh.rotation.x = 0.15;
            mesh.layers.enable(BLOOM_LAYER);
            this.scene.add(mesh);
            this._torusRings.push(mesh);
          };
          addT(34.0, 0.28, 0xfff8ee, 0.88);
        }).call(this);
        _makeRing(500, 33, 42, Math.PI / 2.2, 0.16, 0.72, 0xffffff, 'diamond');
        _makeRing(700, 44, 56, Math.PI / 2.0, 0.06, 0.65, 0xc8d8ff, 'cross');
        _makeRing(400, 58, 68, Math.PI / 1.85, 0.22, 0.45, 0xe0eeff, 'star');
        _makeRing(2200, 54, 65, Math.PI / 2.3, 0.85, 0.82, 0xffffff, 'circle');
        (() => {
          const addOT = (radius, tube, color, opacity) => {
            const geo = new THREE.TorusGeometry(radius, tube, 4, 160);
            const mat = new THREE.MeshBasicMaterial({
              color, transparent: true, opacity,
              depthWrite: false, depthTest: true,
              blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(0, -10, -78);
            mesh.rotation.x = 0.15;
            mesh.frustumCulled = false;
            mesh.layers.enable(BLOOM_LAYER);
            this.scene.add(mesh);
            this._torusRings.push(mesh);
          };
          addOT(51.0, 0.22, 0xfff8ee, 0.75);
          addOT(52.2, 0.12, 0xffeedd, 0.45);
        }).call(this);

                // Debris particle field around moon
        const debrisCount = 180;
        const debrisPos = new Float32Array(debrisCount * 3);
        for (let i = 0; i < debrisCount; i++) {
          const theta = Math.random() * Math.PI * 2;
          const phi   = Math.acos(2 * Math.random() - 1);
          const r     = 22 + Math.random() * 18;
          debrisPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
          debrisPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
          debrisPos[i*3+2] = -78 + r * Math.cos(phi);
        }
        const debrisGeo = new THREE.BufferGeometry();
        debrisGeo.setAttribute('position', new THREE.BufferAttribute(debrisPos, 3));
        const debrisMesh = new THREE.Points(debrisGeo, new THREE.PointsMaterial({
          color: 0x8899cc, size: 0.18, sizeAttenuation: true,
          transparent: true, opacity: 0.7,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        debrisMesh.layers.enable(BLOOM_LAYER);
        this.scene.add(debrisMesh);
      },
      undefined,
      (err) => console.warn('Moon model could not be loaded.', err),
    );
  }
  _addMilkyWay() {
    const count = 5000;
    const pos = new Float32Array(count * 3);
    // Band runs diagonally: x from -600 to 600, z from -100 to -500
    // y is thin (band thickness ~40 units) with gaussian-ish distribution
    for (let i = 0; i < count; i++) {
      const t  = (Math.random() - 0.5) * 2;
      const perp = (Math.random() - 0.5) * 55;
      const thick = (Math.random() - 0.5) * 18;
      pos[i*3]   = t * 1100 + perp * 0.2;
      pos[i*3+1] = thick + perp * 0.08;
      pos[i*3+2] = -500 + t * 80 + perp * 0.4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xbbccee, size: 0.18, sizeAttenuation: true,
      transparent: true, opacity: 0.55,
      map: getSoftGlowTexture(), alphaMap: getSoftGlowTexture(),
      depthWrite: false, blending: THREE.AdditiveBlending, alphaTest: 0.01,
    });
    const band = new THREE.Points(geo, mat);
    band.frustumCulled = false;
    band.layers.enable(BLOOM_LAYER);
    this.scene.add(band);

    // Horizontal center band between scissors arms
    const hMidCount = 4000;
    const hMidPos = new Float32Array(hMidCount * 3);
    for (let i = 0; i < hMidCount; i++) {
      const t = (Math.random() - 0.5) * 2;
      const thick = (Math.random() - 0.5) * 16;
      const perp = (Math.random() - 0.5) * 30;
      hMidPos[i*3]   = t * 1100 + perp * 0.1;
      hMidPos[i*3+1] = thick + perp * 0.04;
      hMidPos[i*3+2] = -380 + t * 90 + perp * 0.3;
    }
    const hMidGeo = new THREE.BufferGeometry();
    hMidGeo.setAttribute('position', new THREE.BufferAttribute(hMidPos, 3));
    const hMidMat = new THREE.PointsMaterial({
      color: 0xdde8ff, size: 0.30, sizeAttenuation: true,
      transparent: true, opacity: 0.75,
      map: getSoftGlowTexture(), alphaMap: getSoftGlowTexture(),
      depthWrite: false, blending: THREE.AdditiveBlending, alphaTest: 0.01,
    });
    const hMidBand = new THREE.Points(hMidGeo, hMidMat);
    hMidBand.frustumCulled = false;
    hMidBand.layers.enable(BLOOM_LAYER);
    this.scene.add(hMidBand);

    // Original diagonal band
    const diagPos = new Float32Array(4000 * 3);
    for (let i = 0; i < 4000; i++) {
      const t = (Math.random() - 0.5) * 2;
      const perp = (Math.random() - 0.5) * 55;
      const thick = (Math.random() - 0.5) * 26;
      diagPos[i*3]   = t * 1000 + perp * 0.3;
      diagPos[i*3+1] = thick + t * 280;
      diagPos[i*3+2] = -300 + t * 140 + perp * 0.5;
    }
    const diagGeo = new THREE.BufferGeometry();
    diagGeo.setAttribute('position', new THREE.BufferAttribute(diagPos, 3));
    const diagBand = new THREE.Points(diagGeo, mat.clone());
    diagBand.frustumCulled = false;
    diagBand.layers.enable(BLOOM_LAYER);
    this.scene.add(diagBand);

    // Brighter core of the band
    const coreCount = 1200;
    const corePos = new Float32Array(coreCount * 3);
    for (let i = 0; i < coreCount; i++) {
      const t = (Math.random() - 0.5) * 2;
      const perp = (Math.random() - 0.5) * 20;
      corePos[i*3]   = t * 900 + perp * 0.15;
      corePos[i*3+1] = (Math.random() - 0.5) * 10 + perp * 0.05;
      corePos[i*3+2] = -500 + t * 60 + perp * 0.3;
    }
    const coreGeo = new THREE.BufferGeometry();
    coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
    const coreMat = new THREE.PointsMaterial({
      color: 0xdde8ff, size: 0.28, sizeAttenuation: true,
      transparent: true, opacity: 0.70,
      map: getSoftGlowTexture(), alphaMap: getSoftGlowTexture(),
      depthWrite: false, blending: THREE.AdditiveBlending, alphaTest: 0.01,
    });
    const core = new THREE.Points(coreGeo, coreMat);
    core.layers.enable(BLOOM_LAYER);
    this.scene.add(core);

    // Horizontal band through moon center
    const moonBandCount = 3500;
    const mbPos = new Float32Array(moonBandCount * 3);
    for (let i = 0; i < moonBandCount; i++) {
      const t = (Math.random() - 0.5) * 2;
      const thick = (Math.random() - 0.5) * 20;
      const perp = (Math.random() - 0.5) * 40;
      mbPos[i*3]   = t * 1100 + perp * 0.15;
      mbPos[i*3+1] = thick + perp * 0.05;
      mbPos[i*3+2] = -78 + t * 60 + perp * 0.3;
    }
    const mbGeo = new THREE.BufferGeometry();
    mbGeo.setAttribute('position', new THREE.BufferAttribute(mbPos, 3));
    const mbMat = new THREE.PointsMaterial({
      color: 0xdde8ff, size: 0.22, sizeAttenuation: true,
      transparent: true, opacity: 0.65,
      map: getSoftGlowTexture(), alphaMap: getSoftGlowTexture(),
      depthWrite: false, blending: THREE.AdditiveBlending, alphaTest: 0.01,
    });
    const moonBand = new THREE.Points(mbGeo, mbMat);
    moonBand.frustumCulled = false;
    moonBand.layers.enable(BLOOM_LAYER);
    this.scene.add(moonBand);
  }
  _addDistantPlanet(x, y, z, radius, colorTop, colorHorizon) {
    // Main body
    const geo = new THREE.SphereGeometry(radius, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: colorTop, emissive: colorTop,
      emissiveIntensity: 0.08, roughness: 0.9, metalness: 0.0,
    });
    const planet = new THREE.Mesh(geo, mat);
    planet.position.set(x, y, z);
    this.scene.add(planet);

    // Atmosphere glow
    const atmMat = new THREE.MeshBasicMaterial({
      color: colorTop, transparent: true, opacity: 0.18,
      side: THREE.BackSide, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const atm = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.18, 20, 20), atmMat);
    atm.position.set(x, y, z);
    atm.layers.enable(BLOOM_LAYER);
    this.scene.add(atm);
  }
  _addStarField(count,spread,size,color,opacity=1) {
    const pos=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      pos[i*3]=(Math.random()-0.5)*spread*2;
      pos[i*3+1]=(Math.random()-0.5)*spread;
      pos[i*3+2]=(Math.random()-0.5)*spread*2;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const stars = new THREE.Points(geo,new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation:true,
      transparent:true,
      opacity,
      map:getSoftGlowTexture(),
      alphaMap:getSoftGlowTexture(),
      depthWrite:false,
      blending:THREE.AdditiveBlending,
      alphaTest:0.01,
    }));
    stars.layers.enable(BLOOM_LAYER);
    this.scene.add(stars);
  }
  _addStarCluster(cx, cy, cz, count, radius, size, color, opacity=1) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r   = radius * Math.cbrt(Math.random());
      const th  = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = cx + r * Math.sin(phi) * Math.cos(th);
      pos[i*3+1] = cy + r * Math.sin(phi) * Math.sin(th);
      pos[i*3+2] = cz + r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size, sizeAttenuation: true,
      transparent: true, opacity,
      map: getSoftGlowTexture(), alphaMap: getSoftGlowTexture(),
      depthWrite: false, blending: THREE.AdditiveBlending, alphaTest: 0.01,
    }));
    pts.layers.enable(BLOOM_LAYER);
    this.scene.add(pts);
  }
  _addNebula(x,y,z,color,opacity,radius,side=THREE.FrontSide) {
    const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity,side,depthWrite:false});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,12,12),mat);
    mesh.layers.enable(BLOOM_LAYER);
    mesh.position.set(x,y,z); this.scene.add(mesh);
  }
  // Esfera sólida de fondo (skybox)
  _addNebulaSolid(x,y,z,color,radius) {
    const mat=new THREE.MeshBasicMaterial({color,side:THREE.BackSide,depthWrite:false});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,16,16),mat);
    mesh.position.set(x,y,z); this.scene.add(mesh);
  }
  // Esfera nebulosa con AdditiveBlending — acumula luz como nubes reales
  _addNebulaGlow(x,y,z,color,opacity,radius) {
    const mat=new THREE.MeshBasicMaterial({
      color, transparent:true, opacity,
      blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.FrontSide,
    });
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,12,12),mat);
    mesh.layers.enable(BLOOM_LAYER);
    mesh.position.set(x,y,z); this.scene.add(mesh);
  }
  _addDecorRing(x,y,z,radius,color) {
    const geo=new THREE.TorusGeometry(radius,0.08,6,48);
    const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.4});
    const mesh=new THREE.Mesh(geo,mat);
    mesh.layers.enable(BLOOM_LAYER);
    mesh.position.set(x,y,z); mesh.rotation.x=Math.PI/2;
    this.scene.add(mesh); this._decorRings.push(mesh);
  }
  _buildPlayer() { this._player=new Player(); this._player.addToScene(this.scene); }
  _startWave() {
    this.wave++;
    const count=Math.min(this.wave+1,MAX_ACTIVE_ENEMIES);
    const speed=ENEMY_BASE_SPEED+(this.wave-1)*ENEMY_SPEED_SCALE;
    EventBus.emit(EventTypes.WAVE_START,{waveNumber:this.wave});
    Bridge.setState({wave:this.wave});
    for(let i=0;i<count;i++) setTimeout(()=>this._spawnEnemy(speed),i*450);
  }
  _spawnEnemy(speed) {
    const activeWords=this.enemies.filter(e=>e.active).map(e=>e.word);
    const word=randomWord(activeWords), pos=randomSpawnPosition();
    const type=pickEnemyType(word,this.wave);
    const enemy=new Enemy(word,pos,speed,type), token=new WordToken(enemy);
    enemy.addToScene(this.scene); this.enemies.push(enemy); this.tokens.push(token);
    this.hudCanvas.setTokens(this.tokens.filter(t=>t.enemy.active));
    EventBus.emit(EventTypes.ENEMY_SPAWNED,{id:enemy.id,word,position:pos});
  }
  _fireAt(enemy) {
    if(!this._player||!enemy?.active) return;
    const type=_pickProjectileType(enemy.word, this.wave);
    const proj=new Projectile(this._player.muzzlePosition,enemy,()=>enemy.hitFlash?.(),type);
    proj.addToScene(this.scene); this.projectiles.push(proj); this._player.fireAnim();
  }
  _updateProjectiles(delta) {
    const alive = [];
    for (const pp of this.projectiles) {
      if (pp.active) { pp.update(delta); alive.push(pp); }
      else pp.removeFromScene(this.scene);
    }
    this.projectiles = alive;
  }
  _autoTarget() {
    if(this.lexicon.currentTargetId) return;
    const active=this.enemies.filter(e=>e.active);
    if(!active.length) return;
    active.sort((a,b)=>a.distanceToPlayer-b.distanceToPlayer);
    const target=active[0];
    target.setTargeted(true);
    this.lexicon.setTarget(target.id,target.word);
    this._player?.setTarget(target.position);
    this._cam?.trackX(target.position.x);
  }
  _onWordProgress({typed,correct}) {
    const targetId=this.lexicon.currentTargetId; if(!targetId) return;
    const token=this.tokens.find(t=>t.enemy.id===targetId);
    token?.update(typed!==undefined?typed:'');
    if(correct){
      const enemy=this.enemies.find(e=>e.id===targetId);
      if(enemy) this._fireAt(enemy);
    }
  }
  _onWordCompleted({enemyId}) {
    const enemy=this.enemies.find(e=>e.id===enemyId); if(!enemy) return;
    this._particles.burst(enemy.position.clone());
    enemy.active=false; enemy.setTargeted(false); enemy.removeFromScene(this.scene);
    this.hudCanvas.setTokens(this.tokens.filter(t=>t.enemy.active));
    this._player?.clearTarget();
    EventBus.emit(EventTypes.ENEMY_COLLAPSED,{id:enemyId,word:enemy.word});
  }
  _onEnemyReached({id}) {
    const enemy=this.enemies.find(e=>e.id===id); if(!enemy||!enemy.active) return;
    this._particles.burst(enemy.position.clone());
    enemy.active=false; enemy.removeFromScene(this.scene);
    this.hudCanvas.setTokens(this.tokens.filter(t=>t.enemy.active));
    if(id===this.lexicon.currentTargetId){
      this.lexicon.clearTarget(); this._player?.clearTarget();
    }
    this._player?.takeHit?.();
    this.hp=Math.max(0,this.hp-HIT_DAMAGE);
    Bridge.setState({hp:this.hp});
    EventBus.emit(EventTypes.PLAYER_HIT,{damage:HIT_DAMAGE});
    if(this.hp<=0){
      EventBus.emit(EventTypes.PLAYER_DIED);
      EventBus.emit(EventTypes.GAME_OVER,{score:this.wave,wpm:Bridge.getState().wpm,accuracy:Bridge.getState().accuracy});
    }
  }
  _pruneDeadEnemies() {
    if(this.enemies.length>200)     this.enemies=this.enemies.filter(e=>e.active);
    if(this.tokens.length>200)      this.tokens=this.tokens.filter(t=>t.enemy.active);
    if(this.projectiles.length>100) this.projectiles=this.projectiles.filter(pp=>pp.active);
  }
}

function _pickProjectileType(word='', wave=1) {
  const r = Math.random();
  if (r < 0.25) return PROJECTILE_TYPES.STANDARD;
  if (r < 0.50) return PROJECTILE_TYPES.RAPID;
  if (r < 0.75) return PROJECTILE_TYPES.HEAVY;
  return PROJECTILE_TYPES.BURST;
}
