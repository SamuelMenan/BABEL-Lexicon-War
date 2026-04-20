import * as THREE from 'three';

let softGlowTexture = null;
let saberGlowTexture = null;

export function getSoftGlowTexture() {
  if (softGlowTexture) return softGlowTexture;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.08, 'rgba(255,255,255,0.92)');
  gradient.addColorStop(0.22, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.48, 'rgba(255,255,255,0.16)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  softGlowTexture = new THREE.CanvasTexture(canvas);
  softGlowTexture.generateMipmaps = false;
  softGlowTexture.minFilter = THREE.LinearFilter;
  softGlowTexture.magFilter = THREE.LinearFilter;
  softGlowTexture.needsUpdate = true;

  return softGlowTexture;
}

export function getSaberGlowTexture() {
  if (saberGlowTexture) return saberGlowTexture;

  const width = 512;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.14, 'rgba(255,255,255,0.20)');
  gradient.addColorStop(0.28, 'rgba(255,255,255,0.78)');
  gradient.addColorStop(0.50, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.72, 'rgba(255,255,255,0.78)');
  gradient.addColorStop(0.86, 'rgba(255,255,255,0.20)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const vertical = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    0,
    width * 0.5,
    height * 0.5,
    height * 0.5,
  );
  vertical.addColorStop(0, 'rgba(255,255,255,0.95)');
  vertical.addColorStop(0.6, 'rgba(255,255,255,0.42)');
  vertical.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, width, height);

  saberGlowTexture = new THREE.CanvasTexture(canvas);
  saberGlowTexture.generateMipmaps = false;
  saberGlowTexture.minFilter = THREE.LinearFilter;
  saberGlowTexture.magFilter = THREE.LinearFilter;
  saberGlowTexture.needsUpdate = true;

  return saberGlowTexture;
}