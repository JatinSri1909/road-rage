/**
 * Uses a fixed-size pool to avoid GC pressure during gameplay.
 * Call spawnParticle() from physics or gameplay code; updateParticles()
 * is called once per frame from the main loop.
 */

import * as THREE from 'three';
import { makeGlowTexture } from './textures.js';

const MAX_PARTICLES = 70;
const pool = [];
let cursor = 0;
let glowTex = null;

export function initParticles(scene) {
  glowTex = makeGlowTexture();
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const mat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.visible = false;
    scene.add(sprite);
    pool.push({ sprite, life: 0, maxLife: 1, vel: new THREE.Vector3(), grow: 0 });
  }
}

/**
 * @param {THREE.Vector3} pos    World position
 * @param {number}        color  Hex colour
 * @param {number}        size   Initial sprite scale
 * @param {number}        life   Lifetime in seconds
 * @param {THREE.Vector3} vel    Initial velocity (world units/s)
 * @param {number}        grow   Scale growth per second (can be negative)
 */
export function spawnParticle(pos, color, size, life, vel, grow = 0) {
  const p = pool[cursor];
  cursor = (cursor + 1) % MAX_PARTICLES;

  p.sprite.position.copy(pos);
  p.sprite.material.color.setHex(color);
  p.sprite.material.opacity = 0.85;
  p.sprite.scale.set(size, size, 1);
  p.sprite.visible = true;
  p.life = life;
  p.maxLife = life;
  p.vel.copy(vel);
  p.grow = grow;
}

export function updateParticles(dt) {
  for (const p of pool) {
    if (p.life <= 0) {
      if (p.sprite.visible) p.sprite.visible = false;
      continue;
    }
    p.life -= dt;
    p.sprite.position.addScaledVector(p.vel, dt);
    const s = p.sprite.scale.x + p.grow * dt;
    p.sprite.scale.set(s, s, 1);
    p.sprite.material.opacity = Math.max(0, (p.life / p.maxLife) * 0.85);
    if (p.life <= 0) p.sprite.visible = false;
  }
}