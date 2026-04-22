import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ParticleEmitter } from "../rendering/ParticleEmitter.js";
import { RacingPlayerShip } from "../entities/RacingPlayerShip.js";
import { RacingOpponentShip } from "../entities/RacingOpponentShip.js";
import { EventBus } from "../../shared/events.js";
import { EventTypes } from "../../shared/eventTypes.js";
import { Bridge } from "../../shared/bridge.js";
import { BLOOM_LAYER, WORDS_PER_MINUTE_SCALE, RACE_OPPONENT_WPM } from "../../shared/constants.js";

const SHIP_HINTS = ["ship","craft","vehicle","spacecraft","rocket","fuselage"];

const VOID_ANIM_DURATION = 3.2;

export class RacingSceneManager {
  constructor(scene, hudCanvas, cam) {
    this.scene=scene; this.hudCanvas=hudCanvas; this._cam=cam||null;
    this._sceneObjects=[]; this._tunnelWrapper=null; this._tunnelMixer=null; this._tunnelOffset=0;
    this._playerShip=null; this._opponentShip=null;
    this._particles=null; this._t=0; this._opponentDist=0;
    this._playerWordBurst=0; this._playerWordLead=0;
    this._prevSceneBackground=null; this._prevSceneFog=null;
    this._playerBase   = new THREE.Vector3(-5.2,-1.35,2.2);
    this._opponentBase = new THREE.Vector3( 5.0,-0.15,0.8);
    this._smoothProgress=0;
    this._smoothLead=0;
    this._smoothBurst=0;
    this._voidAnim=null;
    this._unsubs=[];
  }
  init(){
    this._buildBackground(); this._loadTunnel();
    this._loadShips();
    this._particles=new ParticleEmitter(this.scene);
    this._cam?.setRacingMode(true);
    this._unsubs.push(
      EventBus.on(EventTypes.WORD_COMPLETED,()=>this._onWordCompleted()),
      EventBus.on(EventTypes.RACE_COMPLETED,(e)=>this._startVoidAnim(e.winner,e.gameOverPayload)),
      EventBus.on(EventTypes.RACE_FAILED,   (e)=>this._startVoidAnim(e.winner,e.gameOverPayload)),
    );
  }
  destroy(){
    this._unsubs.forEach(fn=>fn()); this._unsubs=[];
    this._tunnelMixer?.stopAllAction(); this._particles?.dispose();
    this._playerShip?.removeFromScene(this.scene); this._playerShip?.dispose?.();
    this._opponentShip?.removeFromScene(this.scene); this._opponentShip?.dispose?.();
    this.scene.background=this._prevSceneBackground?this._prevSceneBackground.clone():null;
    this.scene.fog=this._prevSceneFog?this._prevSceneFog.clone():null;
    this._prevSceneBackground=null; this._prevSceneFog=null;
    this._cam?.setRacingMode(false);
    for(const obj of this._sceneObjects) obj.removeFromParent();
    this._sceneObjects=[];
  }
  update(delta){
    this._t+=delta;
    this._tunnelMixer?.update(delta); this._particles?.update(delta);
    this.hudCanvas?.update(delta);

    // void animation overrides everything
    if(this._voidAnim){ this._updateVoidAnim(delta); return; }

    const state=Bridge.getState(); const wpm=state.wpm||0;
    this._playerWordBurst=Math.max(0,this._playerWordBurst-delta*1.8);
    this._playerWordLead=Math.max(0,this._playerWordLead-delta*0.5);

    this._opponentDist+=(RACE_OPPONENT_WPM/WORDS_PER_MINUTE_SCALE)*delta;
    const playerDist=state.distanceTraveled||0;
    const targetDist=state.targetDistance||500;
    const progressRatio=THREE.MathUtils.clamp(playerDist/targetDist,0,1);
    const rawLead=THREE.MathUtils.clamp((playerDist-this._opponentDist)*0.012,-1.2,1.2);

    // lerp all driving values — nothing jumps
    const lf=delta*0.9;
    this._smoothProgress+=(progressRatio-this._smoothProgress)*Math.min(lf*0.6,1);
    this._smoothLead    +=(rawLead-this._smoothLead)*Math.min(lf*0.8,1);
    this._smoothBurst   +=(this._playerWordBurst-this._smoothBurst)*Math.min(lf*1.2,1);

    if(this._tunnelWrapper){
      this._tunnelWrapper.position.z=-22+this._smoothProgress*55;
    }
    const progressPush =this._smoothProgress*24;
    const typedAdvance =(this._playerWordLead+this._smoothBurst*0.8)*0.4;

    const raceState={
      t:this._t,
      smoothProgress:this._smoothProgress,
      smoothLead:this._smoothLead,
      smoothBurst:this._smoothBurst,
      progressPush,
      typedAdvance,
      wpm,
    };
    this._playerShip?.setRaceState(raceState);
    this._opponentShip?.setRaceState(raceState);
    this._playerShip?.update(delta);
    this._opponentShip?.update(delta);

    if(this._cam){
      const targetFOV=THREE.MathUtils.clamp(70+(wpm/40)*10,70,80);
      this._cam.setRacingFOV(targetFOV);
    }
  }
  _startVoidAnim(winner, gameOverPayload){
    if(this._voidAnim) return;
    this._voidAnim={ t:0, winner, gameOverPayload,
      playerStartZ: this._playerShip?.mesh?.position.z ?? this._playerBase.z,
      playerStartX: this._playerShip?.mesh?.position.x ?? this._playerBase.x,
      playerStartY: this._playerShip?.mesh?.position.y ?? this._playerBase.y,
      oppStartZ:    this._opponentShip?.mesh?.position.z ?? this._opponentBase.z,
    };
  }
  _updateVoidAnim(delta){
    const va=this._voidAnim;
    va.t+=delta;
    const p=Math.min(1, va.t/VOID_ANIM_DURATION);
    const ease=p*p*p; // cubic ease-in — starts slow, accelerates into void

    const winnerShip   = va.winner==='player' ? this._playerShip   : this._opponentShip;
    const loserShip    = va.winner==='player' ? this._opponentShip  : this._playerShip;
    const winnerStartZ = va.winner==='player' ? va.playerStartZ     : va.oppStartZ;
    const loserStartZ  = va.winner==='player' ? va.oppStartZ        : va.playerStartZ;

    if(winnerShip){
      winnerShip.mesh.position.z = winnerStartZ - ease*55;
      winnerShip.mesh.position.x = va.winner==='player'
        ? THREE.MathUtils.lerp(va.playerStartX, 0, p*0.7)
        : THREE.MathUtils.lerp(va.oppStartZ,    0, p*0.7);
      winnerShip.mesh.position.y = va.winner==='player'
        ? THREE.MathUtils.lerp(va.playerStartY, 0, p*0.5)
        : winnerShip.mesh.position.y;
      winnerShip.mesh.rotation.x = -ease*0.4;
    }
    if(loserShip){
      loserShip.mesh.position.z = loserStartZ + ease*8; // drifts back
    }
    if(this._tunnelWrapper){
      this._tunnelWrapper.position.z = (-25 + this._smoothProgress*55) - ease*55;
    }
    if(this._cam){
      this._cam.setRacingFOV(THREE.MathUtils.lerp(75, 95, ease));
    }

    if(p>=1){
      this._voidAnim=null;
      EventBus.emit(EventTypes.GAME_OVER, va.gameOverPayload);
    }
  }
  _buildBackground(){
    this._prevSceneBackground=this.scene.background?this.scene.background.clone():null;
    this._prevSceneFog=this.scene.fog?this.scene.fog.clone():null;

    this.scene.background=new THREE.Color(0x000000);
    this.scene.fog=new THREE.FogExp2(0x000000,0.004);

    const bg=new THREE.MeshBasicMaterial({color:0x000000,side:THREE.BackSide,depthWrite:false});
    this._addToScene(new THREE.Mesh(new THREE.SphereGeometry(200,16,16),bg));
    this._addStarField(1800,350,0.14,0x8f8f8f);
    this._addStarField(500, 200,0.25,0xd6d6d6);
    this._addStarField(60,  100,0.8, 0xffffff);

    const ambient=new THREE.AmbientLight(0x1a1e2e,2.5);
    this._addToScene(ambient);
    const camFill=new THREE.PointLight(0xc8deff,2.2,28);
    camFill.position.set(0,3,14);
    this._addToScene(camFill);
    const sideFill=new THREE.PointLight(0x2a3a6a,1.2,22);
    sideFill.position.set(-8,1,8);
    this._addToScene(sideFill);
  }
  _addNebulaGlow(x,y,z,color,opacity,radius){
    const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,12,12),mat);
    mesh.layers.enable(BLOOM_LAYER); mesh.position.set(x,y,z); this._addToScene(mesh);
  }
  _addStarField(count,spread,size,color){
    const pos=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      pos[i*3]=(Math.random()-0.5)*spread*2;
      pos[i*3+1]=(Math.random()-0.5)*spread;
      pos[i*3+2]=(Math.random()-0.5)*spread*2;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const stars=new THREE.Points(geo,new THREE.PointsMaterial({color,size,sizeAttenuation:true}));
    stars.layers.enable(BLOOM_LAYER); this._addToScene(stars);
  }
  _loadTunnel(){
    const loader=new GLTFLoader();
    loader.load("/models/24_dizzying_space_travel_-_inktober2019.glb",(gltf)=>{
      const root=gltf.scene;
      root.traverse(node=>{
        if(!node.isMesh) return;
        const lc=node.name.toLowerCase();
        if(SHIP_HINTS.some(h=>lc.includes(h))){ node.visible=false; return; }
        node.layers.enable(BLOOM_LAYER);
      });
      const box=new THREE.Box3().setFromObject(root);
      const sz=new THREE.Vector3(); box.getSize(sz);
      const maxDim=Math.max(sz.x,sz.y,sz.z);
      if(maxDim>0) root.scale.setScalar(32/maxDim);
      root.position.set(0,0,-25);
      const wrapper=new THREE.Group();
      wrapper.add(root);
      this._tunnelWrapper=wrapper;
      this._addToScene(wrapper);
      if(gltf.animations&&gltf.animations.length){
        this._tunnelMixer=new THREE.AnimationMixer(root);
        this._tunnelMixer.timeScale=0.12;
        gltf.animations.forEach(clip=>this._tunnelMixer.clipAction(clip).play());
      }
    },(xhr)=>{},(err)=>console.warn("tunnel load err",err));
  }
  _loadShips(){
    this._playerShip = new RacingPlayerShip(this._playerBase);
    this._opponentShip = new RacingOpponentShip(this._opponentBase);
    this._addToScene(this._playerShip.mesh);
    this._addToScene(this._opponentShip.mesh);
  }
  _addToScene(obj){ this.scene.add(obj); this._sceneObjects.push(obj); }
  _onWordCompleted(){
    this._playerWordBurst=Math.min(this._playerWordBurst+1.15,3.2);
    this._playerWordLead=Math.min(this._playerWordLead+0.42,3.8);
    if(this._playerShip?.mesh?.position) this._particles?.burst(this._playerShip.mesh.position,14);
  }
}
