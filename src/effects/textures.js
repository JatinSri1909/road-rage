/**
 * All textures are generated at runtime from canvas 2D — no image files needed.
 * Track-specific textures (asphalt, curb, etc.) live in content/tracks/<name>/
 * and import helpers from here as needed.
 */

import * as THREE from 'three';

// ─── Shared ───────────────────────────────────────────────────────────────────

export function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

// ─── Scene / Sky ──────────────────────────────────────────────────────────────

export function makeSkyTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.00, '#090022');
  g.addColorStop(0.20, '#15003c');
  g.addColorStop(0.42, '#3a0066');
  g.addColorStop(0.60, '#660077');
  g.addColorStop(0.75, '#b30066');
  g.addColorStop(0.88, '#ff3300');
  g.addColorStop(0.95, '#ffaa00');
  g.addColorStop(1.00, '#ffe600');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  // Subtle horizontal scan-line bands near the horizon
  for (let i = 0; i < 24; i++) {
    const y = 280 + Math.random() * 220;
    const alpha = 0.04 + Math.random() * 0.08;
    ctx.fillStyle = `rgba(255,0,128,${alpha})`;
    ctx.fillRect(0, y, 512, 2 + Math.random() * 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function makeEnvEquirect() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0.0, '#15003c');
  g.addColorStop(0.5, '#b30066');
  g.addColorStop(1.0, '#ffaa00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 64);
  return new THREE.CanvasTexture(c);
}

// ─── Retro sun ────────────────────────────────────────────────────────────────

export function makeRetroSunTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const cx = 256, cy = 256, r = 240;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0.0, '#ff007f');
  g.addColorStop(0.4, '#ff00aa');
  g.addColorStop(0.7, '#ff5e00');
  g.addColorStop(1.0, '#ffff00');
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // Stripe cut-outs
  ctx.globalCompositeOperation = 'destination-out';
  const numStripes = 12;
  for (let i = 0; i < numStripes; i++) {
    const progress = i / numStripes;
    const stripeY = cy - 20 + progress * (r + 20);
    ctx.fillRect(0, stripeY, 512, 3 + progress * 15);
  }
  ctx.restore();
  return new THREE.CanvasTexture(c);
}

export function makeLensFlareTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const hg = ctx.createLinearGradient(0, 128, 256, 128);
  hg.addColorStop(0,   'rgba(255,0,128,0)');
  hg.addColorStop(0.4, 'rgba(255,50,180,0.25)');
  hg.addColorStop(0.5, 'rgba(255,200,240,0.6)');
  hg.addColorStop(0.6, 'rgba(255,50,180,0.25)');
  hg.addColorStop(1,   'rgba(255,0,128,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 122, 256, 12);
  return new THREE.CanvasTexture(c);
}