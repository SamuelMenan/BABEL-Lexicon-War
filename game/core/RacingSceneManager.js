import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AssetLoader } from "../core/AssetLoader.js";
import { ParticleEmitter } from "../rendering/ParticleEmitter.js";
import { RacingPlayerShip } from "../entities/RacingPlayerShip.js";
import { RacingOpponentShip } from "../entities/RacingOpponentShip.js";
import { EventBus } from "../../shared/events.js";
import { EventTypes } from "../../shared/eventTypes.js";
import { Bridge } from "../../shared/bridge.js";
import { BLOOM_LAYER, WORDS_PER_MINUTE_SCALE, RACE_OPPONENT_WPM } from "../../shared/constants.js";
import { RacingLightingRig } from "../rendering/RacingLightingRig.js";
import { getSoftGlowTexture } from "../../shared/softVisuals.js";

const SHIP_HINTS = ["ship","craft","vehicle","spacecraft","rocket","fuselage","nave","propulsor"];
const HOLE_NODE_NAME  = "Vortex_1";   // ancla del agujero negro dentro del GLB
const TUNNEL_TARGET_SIZE = 280;        // tamaño aproximado mundo (era 32)
const HOLE_WORLD_Z = -180;             // dónde queremos el vórtice en mundo (profundo, hacia -Z)
const SHIP_SPAWN_Z  = -55;             // spawn lejano dentro del túnel (visible pero pequeño)
const SHIP_TARGET_Z = -160;            // posición final cerca del vórtice (deja 20u para void anim)

const VOID_ANIM_DURATION = 3.2;

export class RacingSceneManager {
  constructor(scene, hudCanvas, cam) {
    this.scene=scene; this.hudCanvas=hudCanvas; this._cam=cam||null;
    this._sceneObjects=[]; this._tunnelWrapper=null; this._tunnelMixer=null; this._tunnelOffset=0;
    this._playerShip=null; this._opponentShip=null;
    this._particles=null; this._t=0; this._opponentDist=0;
    this._playerWordBurst=0; this._playerWordLead=0;
    this._prevSceneBackground=null; this._prevSceneFog=null;
    // Bases XY/Y; Z se computa cada frame vía progressZ (lerp spawn→target).
    // X balanceado: simétrico, espaciado moderado para no tapar HUD.
    this._playerBase   = new THREE.Vector3(-2.6,-0.9, SHIP_SPAWN_Z);
    this._opponentBase = new THREE.Vector3( 2.6,-0.1, SHIP_SPAWN_Z);
    this._smoothProgress=0;
    this._smoothLead=0;
    this._smoothBurst=0;
    this._voidAnim=null;
    this._unsubs=[];
    this._rig=null;
    // Pre-allocated to avoid a new object literal every frame.
    this._raceState={ t:0, smoothProgress:0, smoothLead:0, smoothBurst:0, progressPush:0, typedAdvance:0, wpm:0, progressZ: SHIP_SPAWN_Z };
  }
  init(){
    this._buildBackground(); this._loadTunnel();
    this._rig=new RacingLightingRig(this.scene); this._rig.init();
    this._loadShips();
    this._particles=new ParticleEmitter(this.scene);
    this._buildTunnelMotes();
    this._buildHoleRimLight();
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
    this._tunnelMotes = null; this._holeRimLight = null;
    this._playerShip?.removeFromScene(this.scene); this._playerShip?.dispose?.();
    this._opponentShip?.removeFromScene(this.scene); this._opponentShip?.dispose?.();
    this.scene.background=this._prevSceneBackground?this._prevSceneBackground.clone():null;
    this.scene.fog=this._prevSceneFog?this._prevSceneFog.clone():null;
    this._prevSceneBackground=null; this._prevSceneFog=null;
    this._rig?.dispose(); this._rig=null;
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

    const state=Bridge.peekState(); const wpm=state.wpm||0;
    const flowActive = !!state.flowActive;

    // Sync ritmo del vórtice con Flow — pulsa más rápido bajo Flow.
    if (this._tunnelMixer) this._tunnelMixer.timeScale = flowActive ? 0.32 : 0.12;
    // Pulsación leve de la rim light al ritmo del player.
    if (this._holeRimLight) {
      this._holeRimLight.intensity = 2.0 + Math.sin(this._t * (flowActive ? 6 : 2.4)) * 0.4;
    }
    this._updateTunnelMotes(delta, flowActive);
    // Decay moderado → el empuje persiste como aceleración continua sin desaparecer rápido.
    this._playerWordBurst=Math.max(0,this._playerWordBurst-delta*1.0);
    this._playerWordLead =Math.max(0,this._playerWordLead -delta*0.35);

    this._opponentDist+=(RACE_OPPONENT_WPM/WORDS_PER_MINUTE_SCALE)*delta;
    const playerDist=state.distanceTraveled||0;
    const targetDist=state.targetDistance||500;
    const progressRatio=THREE.MathUtils.clamp(playerDist/targetDist,0,1);
    const rawLead=THREE.MathUtils.clamp((playerDist-this._opponentDist)*0.012,-1.2,1.2);

    // Lerp equilibrado: rápido suficiente para sentir avance, lento suficiente para no saltar.
    const lf=delta*0.9;
    this._smoothProgress+=(progressRatio-this._smoothProgress)*Math.min(lf*0.55,1);
    this._smoothLead    +=(rawLead-this._smoothLead)*Math.min(lf*0.6,1);
    this._smoothBurst   +=(this._playerWordBurst-this._smoothBurst)*Math.min(lf*0.85,1);

    // Túnel se desplaza hacia cámara según progreso → da sensación clara de avance,
    // como en racing games clásicos. Range 90u (tunnel completo "pasa" durante carrera).
    if (this._tunnelWrapper) {
      const tunnelBaseZ = (this._tunnelBaseZ ?? this._tunnelWrapper.position.z);
      if (this._tunnelBaseZ === undefined) this._tunnelBaseZ = this._tunnelWrapper.position.z;
      this._tunnelWrapper.position.z = this._tunnelBaseZ + this._smoothProgress * 40;
    }
    const progressPush =this._smoothProgress*24;
    // Magnitud alta (0.5) — empuje claro y visible por palabra.
    const typedAdvance =(this._playerWordLead+this._smoothBurst*0.6)*0.5;
    // Z absoluto: spawn (lejano) → target (cerca vórtice).
    const progressZ = THREE.MathUtils.lerp(SHIP_SPAWN_Z, SHIP_TARGET_Z, this._smoothProgress);

    this._raceState.t             = this._t;
    this._raceState.smoothProgress = this._smoothProgress;
    this._raceState.smoothLead     = this._smoothLead;
    this._raceState.smoothBurst    = this._smoothBurst;
    this._raceState.progressPush   = progressPush;
    this._raceState.typedAdvance   = typedAdvance;
    this._raceState.progressZ      = progressZ;
    this._raceState.wpm            = wpm;
    this._playerShip?.setRaceState(this._raceState);
    this._opponentShip?.setRaceState(this._raceState);
    this._playerShip?.update(delta);
    this._opponentShip?.update(delta);

    if(this._cam){
      const targetFOV=THREE.MathUtils.clamp(70+(wpm/40)*10,70,80);
      this._cam.setRacingFOV(targetFOV);
      // Chase target = posición actual player (después de update). LookAt = vórtice.
      if (this._playerShip?.mesh) this._cam.setRacingChaseTarget(this._playerShip.mesh.position);
      if (this._holeWorldPos)     this._cam.setRacingLookAt(this._holeWorldPos);
      this._cam.setRacingVoidPhase(0);
    }
  }
  _startVoidAnim(winner, gameOverPayload){
    if(this._voidAnim) return;
    this._voidAnim={ t:0, winner, gameOverPayload,
      playerStartZ: this._playerShip?.mesh?.position.z ?? this._playerBase.z,
      playerStartX: this._playerShip?.mesh?.position.x ?? this._playerBase.x,
      playerStartY: this._playerShip?.mesh?.position.y ?? this._playerBase.y,
      oppStartZ:    this._opponentShip?.mesh?.position.z ?? this._opponentBase.z,
      oppStartX:    this._opponentShip?.mesh?.position.x ?? this._opponentBase.x,
      oppStartY:    this._opponentShip?.mesh?.position.y ?? this._opponentBase.y,
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

    const winnerStartX = va.winner==='player' ? va.playerStartX     : va.oppStartX;
    const winnerStartY = va.winner==='player' ? va.playerStartY     : va.oppStartY;

    if(winnerShip){
      // Ganador entra al agujero negro (HOLE_WORLD_Z = -180, dejamos -178 para "entrar").
      const targetZ = HOLE_WORLD_Z + 2; // -178
      const totalDistZ = Math.abs(winnerStartZ - targetZ);

      winnerShip.mesh.position.z = THREE.MathUtils.lerp(winnerStartZ, targetZ, ease);
      winnerShip.mesh.position.x = THREE.MathUtils.lerp(winnerStartX, 0, ease);
      winnerShip.mesh.position.y = THREE.MathUtils.lerp(winnerStartY, 0, ease);

      // Escala hacia 0 en el último 40% — efecto de ser tragado.
      const shrink = ease > 0.6 ? 1 - ((ease - 0.6) / 0.4) : 1;
      winnerShip.mesh.scale.setScalar(Math.max(0.02, shrink));

      // Group queda en identidad (combat formula maneja nariz vía modelRoot).
      // No sumar π. Solo yaw correctivo pequeño para apuntar al hole, pitch/roll.
      const yawCorrection = Math.atan2(-winnerStartX, totalDistZ) * 1.6;
      winnerShip.mesh.rotation.x = -ease*0.4;
      winnerShip.mesh.rotation.y = ease * yawCorrection;
      winnerShip.mesh.rotation.z = ease * (winnerStartX > 0 ? 0.8 : -0.8);
    }
    if(loserShip){
      loserShip.mesh.position.z = loserStartZ + ease*8; // drifts back
    }
    // Burst de motas + rim light durante void anim.
    this._updateTunnelMotes(delta, true);
    if (this._holeRimLight) {
      this._holeRimLight.intensity = 3.5 + ease * 4.0;
      this._holeRimLight.distance = 220 + ease * 80;
    }

    if(this._cam){
      // Durante void anim: cámara sigue al ganador, FOV se cierra (zoom in al hole).
      if (winnerShip?.mesh) this._cam.setRacingChaseTarget(winnerShip.mesh.position);
      if (this._holeWorldPos) this._cam.setRacingLookAt(this._holeWorldPos);
      // FOV target: cerrar de 75 → 45 (zoom dramático), voidPhase negativo no funciona,
      // se usa setRacingFOV directo y voidPhase = 0 para no sumar boost.
      const targetFOV = THREE.MathUtils.lerp(75, 45, ease);
      this._cam.setRacingFOV(targetFOV);
      this._cam.setRacingVoidPhase(0);
    }
    if(this._cam){
      this._cam.setRacingFOV(THREE.MathUtils.lerp(75, 125, ease)); // Aleja drásticamente la cámara para ver la escala
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
    this.scene.fog=null; // no fog — keeps scene crisp like the hangar

    // Background void sphere — material cached for mode re-entry.
    const bgMatKey='racing-bg-void';
    let bg=AssetLoader.getMat(bgMatKey);
    if(!bg){ bg=new THREE.MeshBasicMaterial({color:0x000000,side:THREE.BackSide,depthWrite:false}); AssetLoader.setMat(bgMatKey,bg); }
    const bgGeoKey='sphere-bg-200';
    let bgGeo=AssetLoader.getGeo(bgGeoKey);
    if(!bgGeo){ bgGeo=new THREE.SphereGeometry(200,16,16); AssetLoader.setGeo(bgGeoKey,bgGeo); }
    this._addToScene(new THREE.Mesh(bgGeo,bg));
    // Starfields matching hangar's Starfield class (soft glow, additive blending)
    this._addStarField(4000,500,0.28,0x8899bb,0.72);
    this._addStarField(1500,350,0.20,0xaabbdd,0.82);
    this._addStarField(500, 200,0.35,0xddeeff,0.95);
    this._addStarField(80,  150,0.80,0xffffff,1.0);

    // Dark ambient like hangar scenario 2
    const ambient=new THREE.AmbientLight(0x1a2538,2.2);
    this._addToScene(ambient);
    // Point lights moved to RacingLightingRig
  }
  _buildTunnelMotes(){
    // Motas internas del túnel — pequeños puntos volando hacia la cámara
    // para reforzar sensación de movimiento. Cilindro entre SHIP_TARGET_Z y +20.
    const COUNT = 280;
    const RADIUS = 26;          // radio del cilindro
    const Z_NEAR = 12;          // detrás de cámara (z=8 → motas a z=12 ya invisibles)
    const Z_FAR  = SHIP_TARGET_Z - 10;  // -170, pasado el vórtice
    const pos = new Float32Array(COUNT*3);
    for (let i=0;i<COUNT;i++){
      const a = Math.random()*Math.PI*2;
      const r = Math.sqrt(Math.random())*RADIUS;
      pos[i*3]   = Math.cos(a)*r;
      pos[i*3+1] = Math.sin(a)*r*0.6;            // achatado vertical
      pos[i*3+2] = THREE.MathUtils.lerp(Z_FAR, Z_NEAR, Math.random());
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    const mat=new THREE.PointsMaterial({
      color: 0xaaccff, size: 0.22, sizeAttenuation: true,
      transparent: true, opacity: 0.6,
      map: getSoftGlowTexture(), alphaMap: getSoftGlowTexture(),
      depthWrite: false, blending: THREE.AdditiveBlending, alphaTest: 0.01,
    });
    const motes = new THREE.Points(geo, mat);
    motes.layers.enable(BLOOM_LAYER);
    motes.userData = { Z_NEAR, Z_FAR };
    this._tunnelMotes = motes;
    this._addToScene(motes);
  }
  _updateTunnelMotes(delta, flowActive){
    const motes = this._tunnelMotes;
    if (!motes) return;
    const speed = flowActive ? 80 : 38;   // m/s aprox; Flow lo dobla
    const arr = motes.geometry.attributes.position.array;
    const { Z_NEAR, Z_FAR } = motes.userData;
    const advance = speed * delta;
    for (let i=2; i<arr.length; i+=3) {
      arr[i] += advance;
      if (arr[i] > Z_NEAR) arr[i] = Z_FAR + (arr[i] - Z_NEAR);  // wrap atrás
    }
    motes.geometry.attributes.position.needsUpdate = true;
  }
  _buildHoleRimLight(){
    // Luz puntual en el vórtice — ilumina las naves desde el frente con tinte cyan/violet.
    const light = new THREE.PointLight(0x9a66ff, 2.2, 220, 1.4);
    light.position.set(0, 0, HOLE_WORLD_Z);
    this._holeRimLight = light;
    this._addToScene(light);
  }
  _addNebulaGlow(x,y,z,color,opacity,radius){
    const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});
    // Shared unit sphere scaled to radius — one GPU buffer for all nebula glows.
    const geo=AssetLoader.getGeo('sphere-12')??new THREE.SphereGeometry(1,12,12);
    const mesh=new THREE.Mesh(geo,mat);
    mesh.scale.setScalar(radius);
    mesh.layers.enable(BLOOM_LAYER); mesh.position.set(x,y,z); this._addToScene(mesh);
  }
  _addStarField(count,spread,size,color,opacity=1){
    const pos=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      pos[i*3]=(Math.random()-0.5)*spread*2;
      pos[i*3+1]=(Math.random()-0.5)*spread;
      pos[i*3+2]=(Math.random()-0.5)*spread*2;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    // Soft glow material — matches hangar Starfield (round stars, additive blending)
    const matKey=`stars-soft-${color}-${size}-${opacity}`;
    let mat=AssetLoader.getMat(matKey);
    if(!mat){
      mat=new THREE.PointsMaterial({
        color,size,sizeAttenuation:true,transparent:true,opacity,
        map:getSoftGlowTexture(),alphaMap:getSoftGlowTexture(),
        depthWrite:false,blending:THREE.AdditiveBlending,alphaTest:0.01,
      });
      AssetLoader.setMat(matKey,mat);
    }
    const stars=new THREE.Points(geo,mat);
    stars.layers.enable(BLOOM_LAYER); this._addToScene(stars);
  }
  _loadTunnel(){
    const url="/models/24_dizzying_space_travel_-_inktober2019.glb";
    const cached=AssetLoader.getGLTF(url);
    if(cached){ this._applyTunnel(cached); return; }
    new GLTFLoader().load(url,(gltf)=>{ AssetLoader.setGLTF(url,gltf); this._applyTunnel(gltf); },
      (xhr)=>{},(err)=>console.warn('tunnel load err',err));
  }

  _applyTunnel(gltf){
    const root=gltf.scene;

    // Ocultar nodos por nombre exacto: nave decorativa del GLB y su propulsor.
    // Filtrado por hint (SHIP_HINTS) también captura cualquier "nave/propulsor/ship".
    const HIDE_NAMES = new Set(['Nave_2','Propulsor_3']);
    root.traverse(node=>{
      if(HIDE_NAMES.has(node.name)){ node.visible=false; return; }
      if(!node.isMesh) return;
      const lc=node.name.toLowerCase();
      if(SHIP_HINTS.some(h=>lc.includes(h))){ node.visible=false; return; }
      // Fondo lejano: solo ajustamos renderOrder. Materiales del GLB intactos
      // (emissive/transparent/opacity) para no romper su apariencia.
      node.renderOrder = -100;
      node.layers.enable(BLOOM_LAYER);
    });

    // Reset transforms del root antes de medir — el GLB está cacheado y puede
    // venir ya escalado/posicionado de un deploy previo. Sin reset, maxDim se
    // calcularía sobre el modelo ya transformado → re-scale incorrecto.
    root.position.set(0,0,0);
    root.rotation.set(0,0,0);
    root.scale.setScalar(1);

    const box=new THREE.Box3().setFromObject(root);
    const sz=new THREE.Vector3(); box.getSize(sz);
    const maxDim=Math.max(sz.x,sz.y,sz.z);
    if(maxDim>0) root.scale.setScalar(TUNNEL_TARGET_SIZE/maxDim);

    const wrapper=new THREE.Group();
    wrapper.add(root);
    this._tunnelWrapper=wrapper;
    this._addToScene(wrapper);

    // Recentrar para que Vortex_1 quede en world (0, 0, HOLE_WORLD_Z).
    // Sin esto el vórtice queda offset según el bbox del GLB.
    const hole = root.getObjectByName(HOLE_NODE_NAME);
    this._holeAnchor = hole || null;
    if (hole) {
      hole.updateWorldMatrix(true, false);
      const holeWorld = new THREE.Vector3();
      hole.getWorldPosition(holeWorld);
      // Compensar para que el vórtice acabe exactamente en HOLE_WORLD_Z.
      wrapper.position.set(-holeWorld.x, -holeWorld.y, HOLE_WORLD_Z - holeWorld.z);
    } else {
      wrapper.position.set(0,0,HOLE_WORLD_Z);
    }
    this._holeWorldPos = new THREE.Vector3(0, 0, HOLE_WORLD_Z);

    if(gltf.animations&&gltf.animations.length){
      this._tunnelMixer=new THREE.AnimationMixer(root);
      this._tunnelMixer.timeScale=0.12;
      gltf.animations.forEach(clip=>this._tunnelMixer.clipAction(clip).play());
    }
  }
  _loadShips(){
    this._playerShip = new RacingPlayerShip(this._playerBase);
    this._opponentShip = new RacingOpponentShip(this._opponentBase);
    this._addToScene(this._playerShip.mesh);
    this._addToScene(this._opponentShip.mesh);
  }
  _addToScene(obj){ this.scene.add(obj); this._sceneObjects.push(obj); }
  _onWordCompleted(){
    this._playerWordBurst=Math.min(this._playerWordBurst+1.0,3.4);
    this._playerWordLead =Math.min(this._playerWordLead +0.5,3.6);
  }

  // Anima entrada de la nave en racing: arranca lejos -Z, vuela hasta pose final.
  playEntryAnimation(durationSec = 4.0) {
    return new Promise((resolve) => {
      const mesh = this._playerShip?.mesh;
      if (!mesh) { resolve(); return; }
      const finalPos = mesh.position.clone();
      const startOffsetZ = -65;
      const startOffsetY = 5;
      mesh.position.z = finalPos.z + startOffsetZ;
      mesh.position.y = finalPos.y + startOffsetY;
      let elapsed = 0;
      let lastTs = performance.now();
      function tick(ts) {
        const dt = (ts - lastTs) / 1000;
        lastTs = ts;
        elapsed += dt;
        const k = Math.min(1, elapsed / durationSec);
        const eased = 1 - Math.pow(1 - k, 3);
        mesh.position.z = (finalPos.z + startOffsetZ) + (-startOffsetZ) * eased;
        mesh.position.y = (finalPos.y + startOffsetY) + (-startOffsetY) * eased;
        if (k < 1) requestAnimationFrame(tick);
        else { mesh.position.copy(finalPos); resolve(); }
      }
      requestAnimationFrame(tick);
    });
  }
}
