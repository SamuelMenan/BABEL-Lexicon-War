import * as THREE from 'three';

let _flameTex = null;
let _innerTex = null;
let _starTex  = null;

function buildFlameTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g   = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0,    'rgba(255,255,255,1)');
  g.addColorStop(0.10, 'rgba(255,255,255,0.96)');
  g.addColorStop(0.30, 'rgba(255,255,255,0.58)');
  g.addColorStop(0.60, 'rgba(255,255,255,0.18)');
  g.addColorStop(0.85, 'rgba(255,255,255,0.04)');
  g.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  return tex;
}

function buildInnerTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g   = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0,    'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.98)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.70)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.22)');
  g.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  return tex;
}

function buildStarTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2;

  const drawStreak = (angle, halfLen, halfW) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const g = ctx.createLinearGradient(-halfLen, 0, halfLen, 0);
    g.addColorStop(0,    'rgba(255,255,255,0)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.08)');
    g.addColorStop(0.50, 'rgba(255,255,255,1)');
    g.addColorStop(0.72, 'rgba(255,255,255,0.08)');
    g.addColorStop(1,    'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfLen, halfW, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawStreak(0,            size * 0.49, size * 0.024);
  drawStreak(Math.PI / 2,  size * 0.49, size * 0.024);
  drawStreak(Math.PI / 4,  size * 0.37, size * 0.015);
  drawStreak(-Math.PI / 4, size * 0.37, size * 0.015);

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.11);
  g.addColorStop(0,   'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.85)');
  g.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function getFlameTexture() { return (_flameTex ??= buildFlameTexture()); }
export function getInnerTexture() { return (_innerTex  ??= buildInnerTexture()); }
export function getStarTexture()  { return (_starTex   ??= buildStarTexture());  }
