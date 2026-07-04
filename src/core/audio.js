/**
 * initAudio() must be called from a user gesture (start button tap) to satisfy
 * browser autoplay policy. updateAudio() is called every frame.
 */

import * as THREE from 'three';
import { CAR_MAX_SPEED } from '../physics/vehicle-physics.js';

let audioCtx, osc, osc2, gainNode;

export function initAudio() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    osc  = audioCtx.createOscillator();
    osc2 = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    gainNode = audioCtx.createGain();

    osc.type           = 'sine';
    osc.frequency.value = 96;
    osc2.type           = 'triangle';
    osc2.frequency.value = 192;
    osc2.detune.value    = -8;

    filter.type          = 'lowpass';
    filter.frequency.value = 1180;
    filter.Q.value         = 0.55;
    gainNode.gain.value    = 0.0;

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode).connect(audioCtx.destination);

    osc.start();
    osc2.start();
  } catch (e) {
    // Audio unavailable — degrade silently
  }
}

export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

export function updateAudio(player, raceStarted, raceOver, input) {
  if (!osc) return;

  const speedFrac  = THREE.MathUtils.clamp(Math.abs(player.speed) / CAR_MAX_SPEED, 0, 1);
  const movingNow  = raceStarted && !raceOver && speedFrac > 0.01;
  const drivingNow = movingNow || input.gas || input.brake || input.boost;

  const targetFreq = 88 + speedFrac * 78 + (player.boosting ? 14 : 0);
  const targetGain = movingNow ? (0.045 + speedFrac * 0.060) : 0.0;
  const boostAccent = player.boosting ? 0.016 : 0.0;

  osc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.03);
  osc2.frequency.setTargetAtTime(targetFreq * 2, audioCtx.currentTime, 0.03);
  gainNode.gain.setTargetAtTime(
    drivingNow ? targetGain + boostAccent : 0.0,
    audioCtx.currentTime,
    0.05
  );
}