// AeroRidge — the game loop: builds the world, runs the screens, flies the
// plane, chases it with the camera, and renders. In ?shot= mode it stages
// one frozen scene for the screenshot instead of playing.

import * as THREE from 'three';
import { CAMERA } from './config.js';
import { buildTerrain, terrainHeight } from './terrain.js';
import { buildSky } from './sky.js';
import { buildAircraft } from './aircraft.js';
import {
  applyFlightToGroup,
  createFlight,
  forwardOf,
  resetFlight,
  stepFlight,
} from './physics.js';
import { createMissions } from './missions.js';
import { buildHud, showScreen, updateHud, updateMessage } from './hud.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

// Renderer, scene and camera.
const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 6000);

// The world: valley, sky, aeroplane and the ring course.
buildTerrain(scene);
const sky = buildSky(scene);
const { group: planeGroup, propeller } = buildAircraft();
scene.add(planeGroup);
const missions = createMissions(scene);

// Flight state, instruments, sound and input.
const flight = createFlight();
const hud = buildHud();
const audio = createAudio();
const input = createInput(renderer.domElement);

let screen = 'title';
let cameraMode = 'chase';
let orbitYaw = 0;
let orbitPitch = 0;
let time = 0;

// In shot mode the scene is posed once and rendered frozen: the same URL
// always gives the same frame, whatever the screenshot budget.
if (shotName) {
  const staged = stageShot(shotName, { flight, missions });
  cameraMode = staged.camera;
  screen = 'playing';
  showScreen(hud, '');
  applyFlightToGroup(flight, planeGroup);
  propeller.rotation.z = 0.6;
  updateCamera(10);
  updateHud(hud, flight, missions, terrainHeight(flight.pos.x, flight.pos.z));
  updateMessage(hud, flight, missions);
  renderer.render(scene, camera);
  document.title = 'SHOT_READY';
}

/** Chase the plane from behind, or sit in the cockpit. */
function updateCamera(dt) {
  if (cameraMode === 'cockpit') {
    const eye = planeGroup.localToWorld(new THREE.Vector3(0, 1.15, 0.4));
    const ahead = planeGroup.localToWorld(new THREE.Vector3(0, 0.9, -60));
    camera.position.copy(eye);
    camera.lookAt(ahead);
    return;
  }
  const forward = forwardOf(flight.heading);
  const desired = new THREE.Vector3()
    .copy(flight.pos)
    .addScaledVector(forward, -CAMERA.chaseDistance)
    .add(new THREE.Vector3(0, CAMERA.chaseHeight, 0));
  if (orbitYaw !== 0 || orbitPitch !== 0) {
    const offset = new THREE.Vector3().copy(desired).sub(flight.pos);
    const cosY = Math.cos(orbitYaw);
    const sinY = Math.sin(orbitYaw);
    const ox = offset.x * cosY - offset.z * sinY;
    const oz = offset.x * sinY + offset.z * cosY;
    offset.set(ox, offset.y + orbitPitch * 6, oz);
    desired.copy(flight.pos).add(offset);
  }
  const k = 1 - Math.exp(-CAMERA.smooth * dt);
  camera.position.lerp(desired, k);
  const look = new THREE.Vector3().copy(flight.pos).addScaledVector(forward, CAMERA.chaseLookAhead);
  camera.lookAt(look);
}

function start() {
  screen = 'playing';
  showScreen(hud, '');
  audio.resume();
  missions.state.startTime = time;
  missions.state.elapsed = 0;
}

function restart() {
  resetFlight(flight);
  missions.reset();
  cameraMode = 'chase';
  orbitYaw = 0;
  orbitPitch = 0;
  screen = 'playing';
  showScreen(hud, '');
  audio.resume();
}

window.addEventListener('pointerdown', () => {
  if (screen === 'title') start();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;

  // Shot mode: the frame is frozen; only render it.
  if (shotName) {
    renderer.render(scene, camera);
    return;
  }

  // One-shot keys.
  const pressed = input.takePressed();
  if (pressed.has('KeyM')) audio.toggleMute();
  if (pressed.has('KeyC') && screen === 'playing') {
    cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
  }
  if (pressed.has('KeyR') && (screen === 'crashed' || screen === 'complete' || screen === 'paused')) restart();
  if (pressed.has('KeyP')) {
    if (screen === 'playing') {
      screen = 'paused';
      showScreen(hud, 'paused');
    } else if (screen === 'paused') {
      screen = 'playing';
      showScreen(hud, '');
    }
  }
  if (pressed.has('Enter') && screen === 'title') start();

  // Mouse: drag orbits the chase camera, wheel works the throttle.
  const orbit = input.takeOrbit();
  orbitYaw += orbit.x * 0.005;
  orbitPitch += orbit.y * 0.003;
  orbitPitch = Math.max(-0.5, Math.min(0.6, orbitPitch));
  orbitYaw *= Math.exp(-0.6 * dt);
  orbitPitch *= Math.exp(-0.6 * dt);
  const wheel = input.takeWheel();
  if (wheel !== 0) flight.throttle = Math.max(0, Math.min(1, flight.throttle + wheel * 0.06));

  if (screen === 'playing') {
    const events = stepFlight(
      flight,
      {
        pitch: input.pitch(),
        roll: input.roll(),
        throttleUp: input.throttleUp(),
        throttleDown: input.throttleDown(),
      },
      dt,
      terrainHeight,
    );
    missions.state.elapsed += dt;
    const hit = missions.checkRing(flight.pos, flight);
    if (hit) audio.ring();
    if (events.touchedDown) {
      audio.land();
      if (flight.landed && missions.state.allRingsDone) {
        const bonus = missions.completeLanding(flight);
        hud.completeScore.textContent = String(missions.state.score);
        hud.completeDetail.textContent =
          `Landing bonus ${bonus} — fuel and time well spent. ` +
          `Rings ${missions.state.collected} of 8, ` +
          `${Math.round(missions.state.elapsed)} seconds in the air.`;
        screen = 'complete';
        showScreen(hud, 'complete');
      }
    }
    if (events.crashed) {
      audio.crash();
      hud.crashedDetail.textContent =
        `The valley wins this time. Score ${missions.state.score} — ` +
        `${missions.state.collected} of 8 rings flown.`;
      screen = 'crashed';
      showScreen(hud, 'crashed');
    }
    audio.setEngine(flight.throttle, flight.speed);
  }

  // The propeller follows the throttle; the world keeps its own time.
  const propSpeed = flight.crashed ? 0 : 2 + flight.throttle * 38;
  propeller.rotation.z -= propSpeed * dt;
  missions.update(time);
  sky.update(dt);
  applyFlightToGroup(flight, planeGroup);
  updateCamera(dt);
  updateHud(hud, flight, missions, terrainHeight(flight.pos.x, flight.pos.z));
  updateMessage(hud, flight, missions);
  renderer.render(scene, camera);
}

animate();
