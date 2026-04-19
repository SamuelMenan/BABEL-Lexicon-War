import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ParticleEmitter } from "../rendering/ParticleEmitter.js";
import { EventBus } from "../../shared/events.js";
import { EventTypes } from "../../shared/eventTypes.js";
import { Bridge } from "../../shared/bridge.js";
import { BLOOM_LAYER, WORDS_PER_MINUTE_SCALE, RACE_OPPONENT_WPM } from "../../shared/constants.js";

const SHIP_HINTS = ["ship","craft","vehicle","spacecraft","rocket","fuselage"];

export class RacingSceneManager {
  constructor(scene, hudCanvas, cam) {
    this.scene=scene; this.hudCanvas=hudCanvas; this._cam=cam||null;
    this._sceneObjects=[]; this._tunnelWrapper=null; this._tunnelMixer=null; this._tunnelOffset=0;
    this._playerShip=null; this._playerMixer=null; this._opponentShip=null; this._opponentMixer=null;
    this._particles=null; this._t=0; this._opponentDist=0;
    this._playerBase   = new THREE.Vector3(-2.8,-0.4,1.5);
    this._opponentBase = new THREE.Vector3( 2.8,-0.4,1.5);
    this._unsubs=[];
  }
  init(){
    this._buildBackground(); this._loadTunnel();
    this._loadPlayerShip(); this._loadOpponentShip();
    this._particles=new ParticleEmitter(this.scene);
    this._cam?.setRacingMode(true);
    this._unsubs.push(EventBus.on(EventTypes.WORD_COMPLETED,()=>this._onWordCompleted()));
  }
  destroy(){
    this._unsubs.forEach(fn=>fn()); this._unsubs=[];
    this._tunnelMixer?.stopAllAction(); this._playerMixer?.stopAllAction();
    this._opponentMixer?.stopAllAction(); this._particles?.dispose();
    this._cam?.setRacingMode(false);
    for(const obj of this._sceneObjects) obj.removeFromParent();
    this._sceneObjects=[];
  }
  update(delta){
    this._t+=delta;
    this._tunnelMixer?.update(delta); this._playerMixer?.update(delta);
    this._opponentMixer?.update(delta); this._particles?.update(delta);
    this.hudCanvas?.update(delta);
    const state=Bridge.getState(); const wpm=state.wpm||0;
    if(this._tunnelWrapper){
      const scrollSpeed=(wpm/WORDS_PER_MINUTE_SCALE)*1.2+0.3;
      this._tunnelOffset+=scrollSpeed*delta;
      if(this._tunnelOffset>55) this._tunnelOffset=0;
      this._tunnelWrapper.position.z=-25+this._tunnelOffset;
    }
    this._opponentDist+=(RACE_OPPONENT_WPM/WORDS_PER_MINUTE_SCALE)*delta;
    const playerDist=state.distanceTraveled||0;
    const leadOffset=THREE.MathUtils.clamp((playerDist-this._opponentDist)*0.012,-1.2,1.2);
    if(this._playerShip){
      this._playerShip.position.y=this._playerBase.y+Math.sin(this._t*1.1)*0.10;
      this._playerShip.position.z=this._playerBase.z+leadOffset;
      this._playerShip.rotation.z=leadOffset*0.08+Math.sin(this._t*0.7)*0.03;
    }
    if(this._opponentShip){
      this._opponentShip.position.y=this._opponentBase.y+Math.sin(this._t*0.9+1)*0.09;
      this._opponentShip.position.z=this._opponentBase.z-leadOffset;
      this._opponentShip.rotation.z=-leadOffset*0.08+Math.sin(this._t*0.6+0.5)*0.03;
    }
    if(this._cam){
      const targetFOV=THREE.MathUtils.clamp(70+(wpm/40)*10,70,80);
      this._cam.setRacingFOV(targetFOV);
    }
  }
  _buildBackground(){
    const bg=new THREE.MeshBasicMaterial({color:0x000006,side:THREE.BackSide,depthWrite:false});
    this._addToScene(new THREE.Mesh(new THREE.SphereGeometry(200,16,16),bg));
    this._addNebulaGlow(  0,  0,-70,0x001166,0.30,80);
    this._addNebulaGlow(-25, 10,-80,0x003388,0.22,60);
    this._addNebulaGlow( 25,-10,-75,0x002244,0.20,55);
    this._addNebulaGlow(  0, 15,-60,0x004455,0.18,45);
    this._addNebulaGlow(  0,  0,-50,0x110033,0.28,35);
    this._addStarField(1800,350,0.14,0x7788aa);
    this._addStarField(500, 200,0.25,0xaabbcc);
    this._addStarField(60,  100,0.8, 0xffffff);
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
      if(maxDim>0) root.scale.setScalar(30/maxDim);
      root.position.set(0,0,-25);
      const wrapper=new THREE.Group();
      wrapper.add(root);
      this._tunnelWrapper=wrapper;
      this._addToScene(wrapper);
      if(gltf.animations&&gltf.animations.length){
        this._tunnelMixer=new THREE.AnimationMixer(root);
        gltf.animations.forEach(clip=>this._tunnelMixer.clipAction(clip).play());
      }
    },(xhr)=>{},(err)=>console.warn("tunnel load err",err));
  }
  _loadPlayerShip(){
    this._loadShip("/models/spaceship.glb",this._playerBase,1.2,false,(ship,mixer)=>{
      this._playerShip=ship; this._playerMixer=mixer;
    });
  }
  _loadOpponentShip(){
    this._loadShip("/models/spaceship__low_poly.glb",this._opponentBase,1.1,true,(ship,mixer)=>{
      this._opponentShip=ship; this._opponentMixer=mixer;
    });
  }
  _loadShip(url,basePos,targetSize,tintRed,onLoaded){
    const loader=new GLTFLoader();
    loader.load(url,(gltf)=>{
      const root=gltf.scene;
      const box=new THREE.Box3().setFromObject(root);
      const sz=new THREE.Vector3(); box.getSize(sz);
      const maxDim=Math.max(sz.x,sz.y,sz.z)||1;
      root.scale.setScalar(targetSize/maxDim);
      root.position.copy(basePos);
      root.rotation.y=Math.PI;
      root.traverse(node=>{
        if(!node.isMesh) return;
        node.layers.enable(BLOOM_LAYER);
        if(tintRed&&node.material){
          const mats=Array.isArray(node.material)?node.material:[node.material];
          mats.forEach(m=>{ m.emissive=new THREE.Color(0.4,0,0); m.emissiveIntensity=0.6; });
        }
      });
      this._addToScene(root);
      let mixer=null;
      if(gltf.animations&&gltf.animations.length){
        mixer=new THREE.AnimationMixer(root);
        gltf.animations.forEach(clip=>mixer.clipAction(clip).play());
      }
      onLoaded(root,mixer);
    },(xhr)=>{},(err)=>console.warn("ship load err",url,err));
  }
  _addToScene(obj){ this.scene.add(obj); this._sceneObjects.push(obj); }
  _onWordCompleted(){
    if(this._playerShip) this._particles?.burst(this._playerShip.position,12);
  }
}
