import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Bridge } from '../../shared/bridge.js';
import { EventTypes } from '../../shared/eventTypes.js';
import { SHIPS } from '../../shared/constants.js';


// ── Scene helpers ─────────────────────────────────────────────────────────────

function buildScene(mount) {
  const w = mount.clientWidth  || window.innerWidth;
  const h = mount.clientHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020208);

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 400);

  // ── Lighting ─────────────────────────────────────────────────────────────

  // Ambient: near-black deep blue — space shadow fill
  scene.add(new THREE.AmbientLight(0x060c1a, 1.0));

  // Star light — cold blue-white from upper-left, main illumination
  const starLight = new THREE.DirectionalLight(0xc8d8ff, 3.5);
  starLight.position.set(-10, 8, 12);
  scene.add(starLight);

  // Rim — cold teal behind ship, separates silhouette from station
  const rimLight = new THREE.DirectionalLight(0x00ccee, 2.2);
  rimLight.position.set(0, 4, -12);
  scene.add(rimLight);

  // Warm secondary from right — adds depth to ship detail
  const warmFill = new THREE.DirectionalLight(0x3a2810, 1.2);
  warmFill.position.set(8, -3, 6);
  scene.add(warmFill);

  // ── Star field ───────────────────────────────────────────────────────────
  const pCount = 1400;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 80 + Math.random() * 120;
    pPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pPos[i * 3 + 2] = r * Math.cos(phi);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0x99aabb, size: 0.22, sizeAttenuation: true });
  scene.add(new THREE.Points(pGeo, pMat));

  // ── Station group (model loaded async in useEffect) ───────────────────────
  const stationGroup = new THREE.Group();
  scene.add(stationGroup);

  // ── Ship group — selected ship lives here (at ring center: origin) ────────
  const shipGroup = new THREE.Group();
  scene.add(shipGroup);

  // ── Post-processing ───────────────────────────────────────────────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Bloom highlights station's metallic edges and any emissive elements
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.38, 0.55, 0.88);
  composer.addPass(bloom);

  return { renderer, scene, camera, shipGroup, stationGroup, composer, pGeo, pMat };
}

function centerModel(model) {
  const box    = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  const size   = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale  = 2.2 / maxDim;
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
}

function orientModelTowardsRingExit(model) {
  model.rotation.set(0, Math.PI, 0);
}

const SHIP_SPAWN_OFFSET = {
  x: -0.725,
  y: 2.5,
  z: -2.5,
};

function placeModelInRingCenter(model, offset = SHIP_SPAWN_OFFSET) {
  model.position.x += offset.x;
  model.position.y += offset.y;
  model.position.z += offset.z;
}

function disposeGroup(group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    child.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => m.dispose());
      }
    });
  }
}


// ── Component ─────────────────────────────────────────────────────────────────

export default function EleccionNave() {
  const mountRef    = useRef(null);
  const orbitRef    = useRef({
    theta: 0.4, phi: 0.28, radius: 4.5,
    isDragging: false, lastX: 0, lastY: 0,
    phiMin: -1.0, phiMax: 1.0, radiusMin: 1.8, radiusMax: 9,
  });
  const autoRotateRef = useRef(true);
  const stationRotateRef = useRef(true);
  const modelsOriginalsRef = useRef(new Map());
  const mixersRef = useRef([]);
  const shipGroupRef = useRef(null);
  const stationGroupRef = useRef(null);
  const focalRef = useRef(new THREE.Vector3(0, 0, 0));
  const keysRef     = useRef(new Set());
  const loadShipRef = useRef(null);
  const shipIdxRef  = useRef(0);
  const mountedRef  = useRef(true);

  const [shipIdx,      setShipIdx]      = useState(0);
  const [modelLoading, setModelLoading] = useState(true);
  const [canvasAlpha,  setCanvasAlpha]  = useState(1);
  const [autoRotate,   setAutoRotate]   = useState(true);
  const [modelsFrozen, setModelsFrozen] = useState(false);

  // helpers to save/restore and freeze models
  function saveModelOriginals(model) {
    const originals = [];
    model.traverse((obj) => {
      if (obj.isMesh || obj.isGroup) {
        originals.push({ uuid: obj.uuid, position: obj.position.clone(), rotation: obj.rotation.clone(), scale: obj.scale.clone() });
      }
    });
    modelsOriginalsRef.current.set(model.uuid, originals);
  }

  function restoreModelOriginals(model) {
    const originals = modelsOriginalsRef.current.get(model.uuid);
    if (!originals) return;
    model.traverse((obj) => {
      const o = originals.find(x => x.uuid === obj.uuid);
      if (o) {
        obj.position.copy(o.position);
        obj.rotation.copy(o.rotation);
        obj.scale.copy(o.scale);
      }
    });
  }

  function freezeAllModels() {
    stationRotateRef.current = false;
    setModelsFrozen(true);
    // stop mixers
    mixersRef.current.forEach(m => { if (m) m.timeScale = 0; });
    // disable matrix auto update to prevent external changes
    const sg = shipGroupRef.current;
    const stg = stationGroupRef.current;
    [sg, stg].forEach(group => {
      if (!group) return;
      group.traverse(obj => { if (obj.isMesh || obj.isGroup) { obj.matrixAutoUpdate = false; } });
    });
  }

  function unfreezeAllModels() {
    stationRotateRef.current = autoRotateRef.current;
    setModelsFrozen(false);
    mixersRef.current.forEach(m => { if (m) m.timeScale = 1; });
    const sg = shipGroupRef.current;
    const stg = stationGroupRef.current;
    [sg, stg].forEach(group => {
      if (!group) return;
      group.traverse(obj => { if (obj.isMesh || obj.isGroup) { obj.matrixAutoUpdate = true; } });
    });
    // restore poses for ship models
    if (sg) sg.children.forEach(ch => restoreModelOriginals(ch));
  }

  // ── Three.js init ────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    const mount = mountRef.current;
    const three = buildScene(mount);
    const { renderer, scene, camera, shipGroup, stationGroup, composer } = three;
    // expose groups to outer scope for freeze/unfreeze control
    shipGroupRef.current = shipGroup;
    stationGroupRef.current = stationGroup;
    const loader = new GLTFLoader();

    // Load space station as static background — ship stays in ring center
    loader.load(
      '/models/spacestation_7_-_procedural.glb',
      (gltf) => {
        if (!mountedRef.current) return;
        const model = gltf.scene;
        const box    = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        const size   = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        // Scale so station ring diameter fills the scene nicely
        const targetSize = 28;
        const scale = targetSize / maxDim;
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        stationGroup.add(model);
      },
      undefined,
      (err) => console.warn('[EleccionNave] station load failed:', err)
    );

    function loadShip(index) {
      if (!mountedRef.current) return;
      setModelLoading(true);
      disposeGroup(shipGroup);
      const ship = SHIPS[index];
      loader.load(
        ship.url,
        (gltf) => {
          if (!mountedRef.current) return;
          centerModel(gltf.scene);
          // apply per-ship rotation override if present, otherwise default
          if (typeof ship.rotationY === 'number') {
            gltf.scene.rotation.set(0, ship.rotationY, 0);
          } else {
            orientModelTowardsRingExit(gltf.scene);
          }
          // merge default spawn offset with any per-ship tweak
          const combinedOffset = { x: SHIP_SPAWN_OFFSET.x, y: SHIP_SPAWN_OFFSET.y, z: SHIP_SPAWN_OFFSET.z };
          if (ship.spawnOffset) {
            combinedOffset.x += (ship.spawnOffset.x || 0);
            combinedOffset.y += (ship.spawnOffset.y || 0);
            combinedOffset.z += (ship.spawnOffset.z || 0);
          }
          placeModelInRingCenter(gltf.scene, combinedOffset);
          // add to group first so bounding box is in world coordinates
          shipGroup.add(gltf.scene);
          // save original transforms for freeze/unfreeze
          saveModelOriginals(gltf.scene);
          // compute focal point (center of shipGroup) so camera orbits the ship
          const box = new THREE.Box3().setFromObject(shipGroup);
          const center = new THREE.Vector3();
          box.getCenter(center);
          focalRef.current.copy(center);
          if (mountedRef.current) setModelLoading(false);
        },
        undefined,
        (err) => {
          console.warn('[EleccionNave] ship load failed:', ship.url, err);
          if (mountedRef.current) setModelLoading(false);
        }
      );
    }
    loadShipRef.current = loadShip;

    let rafId;
    const clock = new THREE.Clock();

    function animate() {
      rafId = requestAnimationFrame(animate);
      const o = orbitRef.current;
      const k = keysRef.current;

      if (k.has('a') || k.has('A')) o.theta -= 0.022;
      if (k.has('d') || k.has('D')) o.theta += 0.022;
      if (k.has('w') || k.has('W')) o.radius = Math.max(o.radiusMin, o.radius - 0.05);
      if (k.has('s') || k.has('S')) o.radius = Math.min(o.radiusMax, o.radius + 0.05);

      const rotating = k.has('a') || k.has('A') || k.has('d') || k.has('D');
      if (autoRotateRef.current && !o.isDragging && !rotating) o.theta += 0.004;

      const { theta, phi, radius } = o;
      const f = focalRef.current;
      camera.position.set(
        f.x + radius * Math.cos(phi) * Math.sin(theta),
        f.y + radius * Math.sin(phi),
        f.z + radius * Math.cos(phi) * Math.cos(theta),
      );
      camera.lookAt(f);

      // Station drifts very slowly — gives scene life without distraction
      if (stationRotateRef.current) stationGroup.rotation.y += 0.00018;

      composer.render();
    }
    animate();

    function onResize() {
      if (!mountedRef.current) return;
      const w = mount.clientWidth  || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);

    loadShip(0);
    Bridge.emit(EventTypes.SHIP_SELECTION_OPENED, {});

    return () => {
      mountedRef.current  = false;
      loadShipRef.current = null;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      disposeGroup(shipGroup);
      disposeGroup(stationGroup);
      three.pGeo.dispose();
      three.pMat.dispose();
      three.composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── Ship navigation ───────────────────────────────────────────────────────
  const navigateTo = useCallback((newIdx) => {
    const clamped = ((newIdx % SHIPS.length) + SHIPS.length) % SHIPS.length;
    setCanvasAlpha(0);
    setTimeout(() => {
      if (!mountedRef.current) return;
      shipIdxRef.current = clamped;
      setShipIdx(clamped);
      loadShipRef.current?.(clamped);
      Bridge.emit(EventTypes.SHIP_FOCUS_CHANGED, { shipId: SHIPS[clamped].id });
      setCanvasAlpha(1);
    }, 180);
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      keysRef.current.add(e.key);
      if (e.key === 'ArrowLeft')  navigateTo(shipIdxRef.current - 1);
      if (e.key === 'ArrowRight') navigateTo(shipIdxRef.current + 1);
      if (e.key === 'r' || e.key === 'R') {
        Object.assign(orbitRef.current, { theta: 0.4, phi: 0.28, radius: 4.5 });
      }
      if (e.key === 'Enter')  handleConfirm();
      if (e.key === 'Escape') handleCancel();
    }
    function onKeyUp(e) { keysRef.current.delete(e.key); }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, [navigateTo]);

  // ── Mouse drag & scroll ───────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    function onMouseDown(e) {
      const o = orbitRef.current;
      o.isDragging = true;
      o.lastX = e.clientX;
      o.lastY = e.clientY;
    }
    function onMouseMove(e) {
      const o = orbitRef.current;
      if (!o.isDragging) return;
      o.theta -= (e.clientX - o.lastX) * 0.008;
      o.phi    = Math.max(o.phiMin, Math.min(o.phiMax, o.phi + (e.clientY - o.lastY) * 0.005));
      o.lastX  = e.clientX;
      o.lastY  = e.clientY;
    }
    function onMouseUp()  { orbitRef.current.isDragging = false; }
    function onWheel(e) {
      e.preventDefault();
      const o = orbitRef.current;
      o.radius = Math.max(o.radiusMin, Math.min(o.radiusMax, o.radius + e.deltaY * 0.006));
    }

    mount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    mount.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      mount.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      mount.removeEventListener('wheel', onWheel);
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleConfirm() { Bridge.commands.confirmShip(SHIPS[shipIdxRef.current].id); }
  function handleCancel()  { Bridge.commands.cancelShipSelection(); }
  function toggleAutoRotate() {
    autoRotateRef.current = !autoRotateRef.current;
    setAutoRotate(autoRotateRef.current);
    if (autoRotateRef.current) {
      // resuming auto-rotate -> allow station rotation and animations
      unfreezeAllModels();
    } else {
      // pausing auto-rotate -> stop station rotation and freeze models
      freezeAllModels();
    }
  }

  const ship = SHIPS[shipIdx];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ship-select">
      <div ref={mountRef} className="ship-select__canvas" style={{ opacity: canvasAlpha }} />

      {modelLoading && (
        <div className="ship-select__loading-overlay">
          <span className="ship-select__loading-text">CARGANDO MODELO...</span>
          <div className="ship-select__loading-track">
            <div className="ship-select__loading-bar" />
          </div>
        </div>
      )}

      <div className="ship-select__info">
        <p className="ship-select__code">{ship.code}</p>
        <h2 className="ship-select__name">{ship.name}</h2>
        <p className="ship-select__class">Programa TYPO · Unidad no clasificada</p>
      </div>

      <button className="ship-select__nav-btn ship-select__nav-btn--left" onClick={() => navigateTo(shipIdx - 1)}>&#60;</button>
      <button className="ship-select__nav-btn ship-select__nav-btn--right" onClick={() => navigateTo(shipIdx + 1)}>&#62;</button>

      <div className="ship-select__bottom-hud">
        <p className="ship-select__pos-indicator">{shipIdx + 1} / {SHIPS.length}</p>
        <div className="ship-select__btn-row">
          <button className="ship-select__toggle-btn" onClick={toggleAutoRotate}>
            {autoRotate ? 'DETENER GIRO' : 'INICIAR GIRO'}
          </button>
          <button className="ship-select__cancel-btn" onClick={handleCancel}>VOLVER</button>
          <button className="ship-select__confirm-btn" onClick={handleConfirm}>DESPLEGAR NAVE</button>
        </div>
        <p className="ship-select__key-hints">&#8592; &#8594; CAMBIAR &middot; A/D ROTAR &middot; W/S ZOOM &middot; R REINICIAR &middot; ENTER CONFIRMAR</p>
      </div>
    </div>
  );
}
