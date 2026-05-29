import * as THREE from 'three';

const CYAN_ARTIFACT_MAX_SIZE = 0.62;
const CYAN_ARTIFACT_MIN_Y    = 0.35;

export function tuneLoadedMesh(node) {
  // Clamp PBR materials so background does not bleed through reflections.
  if (!node?.isMesh || !node.material) return;
  const mats = Array.isArray(node.material) ? node.material : [node.material];
  for (const m of mats) {
    if (!m) continue;
    if ('envMapIntensity' in m) m.envMapIntensity = 0;
    if ('metalness' in m) m.metalness = Math.min(m.metalness ?? 0, 0.10);
    if ('roughness' in m) m.roughness = Math.max(m.roughness ?? 1, 0.85);
    m.needsUpdate = true;
  }
}

// Limpia helpers/planos sueltos del GLB. Sockets de muzzle/flash legacy
// eliminados: los cañones ahora salen de SHIP_MUZZLE_CONFIGS (hangar).
export function afterLoadedModel(modelRoot) {
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
    const size    = box.getSize(new THREE.Vector3());
    const center  = box.getCenter(new THREE.Vector3());
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

}
