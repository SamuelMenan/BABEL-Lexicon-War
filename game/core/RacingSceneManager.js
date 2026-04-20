import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ParticleEmitter } from "../rendering/ParticleEmitter.js";
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
    this._playerShip=null; this._playerMixer=null; this._opponentShip=null; this._opponentMixer=null;
    this._particles=null; this._t=0; this._opponentDist=0;
    this._playerWordBurst=0; this._playerWordLead=0;
    this._prevSceneBackground=null; this._prevSceneFog=null;
    this._playerBase   = new THREE.Vector3(-2.45,-1.35,2.2);
    this._opponentBase = new THREE.Vector3( 2.45,-0.15,0.55);
    this._smoothProgress=0;
    this._smoothLead=0;
    this._smoothBurst=0;
    this._voidAnim=null;
    this._unsubs=[];
  }
  init(){
    this._buildBackground(); this._loadTunnel();
    this._loadPlayerShip(); this._loadOpponentShip();
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
    this._tunnelMixer?.stopAllAction(); this._playerMixer?.stopAllAction();
    this._opponentMixer?.stopAllAction(); this._particles?.dispose();
    this.scene.background=this._prevSceneBackground?this._prevSceneBackground.clone():null;
    this.scene.fog=this._prevSceneFog?this._prevSceneFog.clone():null;
    this._prevSceneBackground=null; this._prevSceneFog=null;
    this._cam?.setRacingMode(false);
    for(const obj of this._sceneObjects) obj.removeFromParent();
    this._sceneObjects=[];
  }
  update(delta){
    this._t+=delta;
    this._tunnelMixer?.update(delta); this._playerMixer?.update(delta);
    this._opponentMixer?.update(delta); this._particles?.update(delta);
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
      this._tunnelWrapper.position.z=-25+this._smoothProgress*55;
    }
    const progressPush =this._smoothProgress*24;
    const typedAdvance =(this._playerWordLead+this._smoothBurst*0.8)*0.4;

    if(this._playerShip){
      this._playerShip.position.x=this._playerBase.x+Math.sin(this._t*1.45)*0.28+Math.cos(this._t*0.68)*0.14+this._smoothLead*0.06;
      this._playerShip.position.y=this._playerBase.y+Math.sin(this._t*2.1)*0.24+Math.cos(this._t*1.3)*0.11+this._smoothBurst*0.12;
      this._playerShip.position.z=this._playerBase.z-this._smoothLead-typedAdvance-progressPush;
      this._playerShip.rotation.x=-0.08+Math.sin(this._t*1.9)*0.06-this._smoothBurst*0.04;
      this._playerShip.rotation.y=Math.PI+Math.sin(this._t*0.92)*0.08;
      this._playerShip.rotation.z=this._smoothLead*0.09+Math.sin(this._t*1.45)*0.07;
    }
    if(this._opponentShip){
      this._opponentShip.position.x=this._opponentBase.x+Math.sin(this._t*1.2+0.8)*0.24+Math.cos(this._t*0.62+0.2)*0.11-this._smoothLead*0.05;
      this._opponentShip.position.y=this._opponentBase.y+Math.sin(this._t*1.6+1.1)*0.2+Math.cos(this._t*1.05+0.4)*0.08;
      this._opponentShip.position.z=this._opponentBase.z+progressPush*0.35+this._smoothLead*0.65;
      this._opponentShip.rotation.x=-0.05+Math.sin(this._t*1.4+0.3)*0.05;
      this._opponentShip.rotation.y=Math.sin(this._t*0.75+0.6)*0.07;
      this._opponentShip.rotation.z=-this._smoothLead*0.09+Math.sin(this._t*1.1+0.5)*0.06;
    }
    if(this._cam){
      const targetFOV=THREE.MathUtils.clamp(70+(wpm/40)*10,70,80);
      this._cam.setRacingFOV(targetFOV);
    }
  }
  _startVoidAnim(winner, gameOverPayload){
    if(this._voidAnim) return;
    this._voidAnim={ t:0, winner, gameOverPayload,
      playerStartZ: this._playerShip?.position.z ?? this._playerBase.z,
      playerStartX: this._playerShip?.position.x ?? this._playerBase.x,
      playerStartY: this._playerShip?.position.y ?? this._playerBase.y,
      oppStartZ:    this._opponentShip?.position.z ?? this._opponentBase.z,
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
      winnerShip.position.z = winnerStartZ - ease*55;
      winnerShip.position.x = va.winner==='player'
        ? THREE.MathUtils.lerp(va.playerStartX, 0, p*0.7)
        : THREE.MathUtils.lerp(va.oppStartZ,    0, p*0.7);
      winnerShip.position.y = va.winner==='player'
        ? THREE.MathUtils.lerp(va.playerStartY, 0, p*0.5)
        : winnerShip.position.y;
      winnerShip.rotation.x = -ease*0.4;
    }
    if(loserShip){
      loserShip.position.z = loserStartZ + ease*8; // drifts back
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
        this._tunnelMixer.timeScale=0.12;
        gltf.animations.forEach(clip=>this._tunnelMixer.clipAction(clip).play());
      }
    },(xhr)=>{},(err)=>console.warn("tunnel load err",err));
  }
  _loadPlayerShip(){
    this._loadShip("/models/spaceship.glb",this._playerBase,2.7,false,Math.PI,(ship,mixer)=>{
      this._playerShip=ship; this._playerMixer=mixer;
    });
  }
  _loadOpponentShip(){
    this._loadShip("/models/spaceship__low_poly.glb",this._opponentBase,2.45,true,0,(ship,mixer)=>{
      this._opponentShip=ship; this._opponentMixer=mixer;
    });
  }
  _loadShip(url,basePos,targetSize,tintRed,yaw,onLoaded){
    const loader=new GLTFLoader();
    loader.load(url,(gltf)=>{
      const root=gltf.scene;
      const box=new THREE.Box3().setFromObject(root);
      const sz=new THREE.Vector3(); box.getSize(sz);
      const maxDim=Math.max(sz.x,sz.y,sz.z)||1;
      root.scale.setScalar(targetSize/maxDim);
      root.position.copy(basePos);
      root.rotation.y=yaw;
      root.traverse(node=>{
        if(!node.isMesh) return;
        node.layers.enable(BLOOM_LAYER);
        if(node.material){
          const mats=Array.isArray(node.material)?node.material:[node.material];
          mats.forEach(m=>{
            if(!m) return;
            if('emissive' in m && m.emissive){
              if(tintRed){
                m.emissive=new THREE.Color(0.7,0.08,0.05);
                m.emissiveIntensity=Math.max(m.emissiveIntensity??0,1.8);
              } else {
                m.emissive=new THREE.Color(0.35,0.2,0.05);
                m.emissiveIntensity=Math.max(m.emissiveIntensity??0,0.85);
              }
            }
            if('metalness' in m) m.metalness=Math.min(1,(m.metalness??0.5)+0.08);
            if('roughness' in m) m.roughness=Math.max(0.12,(m.roughness??0.7)-0.15);
            m.needsUpdate=true;
          });
        }
      });

      this._attachShipLights(root,tintRed);

      this._addToScene(root);
      let mixer=null;
      if(gltf.animations&&gltf.animations.length){
        mixer=new THREE.AnimationMixer(root);
        gltf.animations.forEach(clip=>mixer.clipAction(clip).play());
      }
      onLoaded(root,mixer);
    },(xhr)=>{},(err)=>console.warn("ship load err",url,err));
  }
  _attachShipLights(ship,tintRed){
    // front light (ship's nose direction)
    const key=new THREE.PointLight(tintRed?0xff3344:0xffbb55,tintRed?5.5:2.1,tintRed?30:18);
    key.position.set(0,0.35,1.5);
    ship.add(key);

    // fill from below
    const fill=new THREE.PointLight(tintRed?0xff2211:0x446688,tintRed?3.2:0.9,tintRed?22:14);
    fill.position.set(0,0.25,-1.1);
    ship.add(fill);

    if(tintRed){
      // back light — illuminates what camera sees (ship faces away)
      const back=new THREE.PointLight(0xff4422,4.0,25);
      back.position.set(0,0.5,-2.0);
      ship.add(back);
      // top rim
      const rim=new THREE.PointLight(0xff6633,2.5,20);
      rim.position.set(0,2.0,0);
      ship.add(rim);
    }

    const glowMat=new THREE.MeshBasicMaterial({
      color:tintRed?0xff3311:0xffaa33,
      transparent:true,
      opacity:tintRed?0.92:0.78,
    });
    const glow=new THREE.Mesh(new THREE.SphereGeometry(tintRed?0.18:0.1,8,8),glowMat);
    glow.position.set(0,0,1.08);
    glow.layers.enable(BLOOM_LAYER);
    ship.add(glow);
  }
  _addToScene(obj){ this.scene.add(obj); this._sceneObjects.push(obj); }
  _onWordCompleted(){
    this._playerWordBurst=Math.min(this._playerWordBurst+1.15,3.2);
    this._playerWordLead=Math.min(this._playerWordLead+0.42,3.8);
    if(this._playerShip) this._particles?.burst(this._playerShip.position,14);
  }
}
