import * as THREE from 'three';

// Material aditivo estandar para FX de haz/bolt/laser: AdditiveBlending, sin
// escribir depth (no se ocluyen entre si) pero con depthTest (casco/enemigos
// los ocluyen), toneMapped:false para que el brillo no lo aplane el tonemapper.
export function additiveMat(color, opacity, doubleSide = false) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent:  true,
    opacity,
    blending:     THREE.AdditiveBlending,
    depthWrite:   false,
    depthTest:    true,
    toneMapped:   false,
    side:         doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
}
