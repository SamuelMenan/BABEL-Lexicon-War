import * as THREE from 'three';

const CYAN_ARTIFACT_MAX_SIZE = 0.62;
const CYAN_ARTIFACT_MIN_Y    = 0.35;

export function tuneLoadedMesh(node) {
  if (!node.material) return;
  const materials = Array.isArray(node.material) ? node.material : [node.material];
  materials.forEach((material) => {
    if (!material) return;
    if ('color' in material && material.color) {
      material.color.lerp(new THREE.Color(0xffffff), 0.22);
    }
    if ('emissive' in material && material.emissive) {
      material.emissive = new THREE.Color(0.85, 0.52, 0.18);
      material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 3.5);
    }
    if ('metalness' in material)       material.metalness       = Math.max(0.82, (material.metalness ?? 0.5));
    if ('roughness' in material)       material.roughness       = Math.min(0.10, (material.roughness ?? 0.7) * 0.12);
    if ('envMapIntensity' in material) material.envMapIntensity = Math.max(material.envMapIntensity ?? 0, 4.2);
    material.needsUpdate = true;
  });
}

// setSocketPositions receives { centerX, centerY, frontZ } and is provided by the ship class.
export function afterLoadedModel(modelRoot, setSocketPositions) {
  const rootBox    = new THREE.Box3().setFromObject(modelRoot);
  const rootCenter = rootBox.getCenter(new THREE.Vector3());
  const rootSize   = rootBox.getSize(new THREE.Vector3());
  const rootMax    = Math.max(rootSize.x, rootSize.y, rootSize.z);

  // Some kitbashed GLBs include cyan helper planes floating around the ship.
  // Hide only small/detached cyan meshes to avoid touching the hull geometry.
  modelRoot.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    const cyanish = mats.some((m) => {
      const c = m?.emissive ?? m?.color;
      return !!c && c.g > 0.5 && c.b > 0.52 && c.r < 0.35;
    });
    // Also catch blue (non-cyan) helpers: high-b, low-g, low-r
    const blueish = mats.some((m) => {
      const c = m?.emissive ?? m?.color;
      return !!c && c.b > 0.45 && c.r < 0.25 && c.g < 0.38;
    });
    const box = new THREE.Box3().setFromObject(node);
    if (box.isEmpty()) return;
    const size   = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSide = Math.max(size.x, size.y, size.z);

    const dims      = [size.x, size.y, size.z].sort((a, b) => a - b);
    const thinPlane = dims[0] <= Math.max(0.018, rootMax * 0.008);
    const compact   = maxSide <= Math.max(CYAN_ARTIFACT_MAX_SIZE, rootMax * 0.18);
    const aboveHull = center.y >= (rootCenter.y + Math.max(CYAN_ARTIFACT_MIN_Y, rootSize.y * 0.14));
    const detached  = center.distanceTo(rootCenter) >= rootMax * 0.28;
    const byName    = /helper|debug|plane|quad|billboard|sprite|cube|fx|square|rect/i.test(node.name ?? '');

    if ((cyanish && (aboveHull || detached)) ||
        (blueish && (aboveHull || detached) && (thinPlane || byName)) ||
        (compact && (aboveHull || detached) && thinPlane) ||
        (compact && detached && byName)) {
      node.visible = false;
    }
  });

  const finalBox = new THREE.Box3().setFromObject(modelRoot);
  if (!finalBox.isEmpty()) {
    setSocketPositions({ centerX: 0, centerY: 0, frontZ: finalBox.min.z - 0.15 });
  }
}
