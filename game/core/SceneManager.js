import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { Projectile } from '../entities/Projectile.js';
import { WordToken } from '../entities/WordToken.js';
import { ParticleEmitter } from '../rendering/ParticleEmitter.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import { WORD_POOL_ES,ENEMY_BASE_SPEED,ENEMY_SPEED_SCALE,MAX_ACTIVE_ENEMIES,WAVE_INTERVAL_MS,PLAYER_MAX_HP,HIT_DAMAGE,BLOOM_LAYER } from '../../shared/constants.js';

const ARENA_SCENARIO_1='scenario-1-legacy';
const ARENA_SCENARIO_2='scenario-2-combat-clean';
const ACTIVE_ARENA_SCENARIO=ARENA_SCENARIO_2;

function randomSpawnPosition() {
  const x=(Math.random()-0.5)*36, y=(Math.random()-0.5)*18, z=-(30+Math.random()*22);
  return new THREE.Vector3(x,y,z);
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
  }
  update(delta) {
    this.physics.update(delta); this.hudCanvas.update(delta);
    this._particles.update(delta); this._player?.update(delta);
    this._backdropMixer?.update(delta);
    this._updateProjectiles(delta); this._autoTarget(); this._pruneDeadEnemies();
    for(const r of this._decorRings) r.rotation.z+=delta*0.05;
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
    // Fondo base — negro profundo
    this._addNebulaSolid(0,0,0,0x00000a,200);

    // Capas nebulosas con AdditiveBlending — se acumulan como luz real
    this._addNebulaGlow(  0,   0, -80, 0x1a0066, 0.35, 90);  // púrpura central
    this._addNebulaGlow(-30,  10, -90, 0x003399, 0.28, 70);  // azul izq
    this._addNebulaGlow( 35, -10, -85, 0x660033, 0.25, 65);  // rojo-rosa der
    this._addNebulaGlow(  0,  20, -70, 0x004466, 0.22, 55);  // cyan arriba
    this._addNebulaGlow(-20, -15, -75, 0x330066, 0.20, 48);  // violeta bajo
    this._addNebulaGlow( 15,  25, -95, 0x002255, 0.18, 60);  // azul oscuro
    this._addNebulaGlow(  0,   0, -60, 0x220044, 0.30, 40);  // núcleo central más brillante
    this._addNebulaGlow(  5,   5, -55, 0x441166, 0.25, 28);  // núcleo interior

    // Estrellas
    this._addStarField(2000, 400, 0.12, 0x8899bb);
    this._addStarField(600,  200, 0.28, 0xaabbdd);
    this._addStarField(80,   120, 0.7,  0xffffff);
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
        wrapper.position.set(0,0,-30);
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
  _addStarField(count,spread,size,color) {
    const pos=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      pos[i*3]=(Math.random()-0.5)*spread*2;
      pos[i*3+1]=(Math.random()-0.5)*spread;
      pos[i*3+2]=(Math.random()-0.5)*spread*2;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const stars = new THREE.Points(geo,new THREE.PointsMaterial({color,size,sizeAttenuation:true}));
    stars.layers.enable(BLOOM_LAYER);
    this.scene.add(stars);
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
    const enemy=new Enemy(word,pos,speed), token=new WordToken(enemy);
    enemy.addToScene(this.scene); this.enemies.push(enemy); this.tokens.push(token);
    this.hudCanvas.setTokens(this.tokens.filter(t=>t.enemy.active));
    EventBus.emit(EventTypes.ENEMY_SPAWNED,{id:enemy.id,word,position:pos});
  }
  _fireAt(enemy) {
    if(!this._player||!enemy?.active) return;
    const proj=new Projectile(this._player.muzzlePosition,enemy,()=>enemy.hitFlash?.());
    proj.addToScene(this.scene); this.projectiles.push(proj); this._player.fireAnim();
  }
  _updateProjectiles(delta) {
    for(const pp of this.projectiles){
      if(pp.active) pp.update(delta); else pp.removeFromScene(this.scene);
    }
    if(this.projectiles.length>60) this.projectiles=this.projectiles.filter(pp=>pp.active);
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
