import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { Projectile } from '../entities/Projectile.js';
import { WordToken } from '../entities/WordToken.js';
import { ParticleEmitter } from '../rendering/ParticleEmitter.js';
import { EventBus } from '../../shared/events.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { Bridge } from '../../shared/bridge.js';
import { WORD_POOL_ES,ENEMY_BASE_SPEED,ENEMY_SPEED_SCALE,MAX_ACTIVE_ENEMIES,WAVE_INTERVAL_MS,PLAYER_MAX_HP,HIT_DAMAGE } from '../../shared/constants.js';

function randomSpawnPosition() {
  const x=(Math.random()-0.5)*36, y=(Math.random()-0.5)*18, z=-(30+Math.random()*22);
  return new THREE.Vector3(x,y,z);
}
function randomWord(exclude=[]) {
  const pool=WORD_POOL_ES.filter(w=>!exclude.includes(w));
  return pool[Math.floor(Math.random()*pool.length)];
}
export class SceneManager {
  constructor(scene,lexicon,physics,hudCanvas) {
    this.scene=scene; this.lexicon=lexicon; this.physics=physics; this.hudCanvas=hudCanvas;
    this.enemies=[]; this.tokens=[]; this.projectiles=[];
    this.wave=0; this.hp=PLAYER_MAX_HP; this._waveTimer=0;
    this._unsubs=[]; this._player=null; this._particles=null; this._decorRings=[];
  }
  init() {
    this._buildArena(); this._buildPlayer();
    this._particles=new ParticleEmitter(this.scene);
    this._unsubs.push(
      EventBus.on(EventTypes.GAME_START,()=>this._startWave()),
      EventBus.on(EventTypes.WORD_COMPLETED,(pp)=>this._onWordCompleted(pp)),
      EventBus.on(EventTypes.ENEMY_REACHED,(pp)=>this._onEnemyReached(pp)),
      EventBus.on(EventTypes.WORD_PROGRESS,(pp)=>this._onWordProgress(pp)),
    );
  }
  destroy() { this._unsubs.forEach(fn=>fn()); this._particles?.dispose(); }
  update(delta) {
    this.physics.update(delta); this.hudCanvas.update(delta);
    this._particles.update(delta); this._player?.update(delta);
    this._updateProjectiles(delta); this._autoTarget(); this._pruneDeadEnemies();
    for(const r of this._decorRings) r.rotation.z+=delta*0.05;
    this._waveTimer+=delta*1000;
    if(this._waveTimer>=WAVE_INTERVAL_MS&&this.enemies.filter(e=>e.active).length===0){
      this._waveTimer=0; this._startWave();
    }
  }
  _buildArena() {
    this._addStarField(1800,400,0.15,0x223344);
    this._addStarField(600,150,0.3,0x334466);
    this._addStarField(120,60,0.55,0x88aacc);
    const grid=new THREE.GridHelper(120,24,0x0a1520,0x0a1520);
    grid.position.y=-10; this.scene.add(grid);
    this._addNebula(-40,10,-80,0x220033,0.06,20);
    this._addNebula(50,-5,-100,0x001133,0.05,28);
    this._addNebula(-20,15,-60,0x110022,0.04,15);
    this._addDecorRing(0,0,-60,22,0x0a2030);
    this._addDecorRing(0,0,-90,35,0x0a1525);
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
    this.scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color,size,sizeAttenuation:true})));
  }
  _addNebula(x,y,z,color,opacity,radius) {
    const mat=new THREE.MeshStandardMaterial({color,transparent:true,opacity,side:THREE.BackSide,depthWrite:false});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,8,8),mat);
    mesh.position.set(x,y,z); this.scene.add(mesh);
  }
  _addDecorRing(x,y,z,radius,color) {
    const geo=new THREE.TorusGeometry(radius,0.08,6,48);
    const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.4});
    const mesh=new THREE.Mesh(geo,mat);
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
