// AeroRidge — the valley: a seeded heightfield with a flat runway strip,
// a lake basin, vertex-coloured slopes, and instanced trees and rocks.
// terrainHeight is pure maths, so the flight model and the mesh agree exactly.

import * as THREE from 'three';
import { COLORS, RUNWAY, SEED, WORLD } from './config.js';
import { makeNoise2D, mulberry32 } from './rng.js';

const noise = makeNoise2D(SEED);

/** Distance from (x, z) to the runway's clear box; 0 inside it. */
function clearBoxDistance(x, z) {
  const dx = Math.max(Math.abs(x - RUNWAY.x) - RUNWAY.clearHalfWidth, 0);
  const dz = Math.max(Math.abs(z - RUNWAY.z) - (RUNWAY.length / 2 + RUNWAY.clearHalfWidth), 0);
  return Math.hypot(dx, dz);
}

function smoothstep(t) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Ground height in metres at (x, z). The one true height function. */
export function terrainHeight(x, z) {
  // Rolling hills, rising toward the valley's rim.
  const r = Math.hypot(x, z) / (WORLD.size / 2);
  const rim = WORLD.valleyDepth * r * r;
  let h = noise(x * WORLD.hillFrequency, z * WORLD.hillFrequency) * WORLD.hillAmplitude + rim;
  // The lake basin, carved out of the valley floor.
  const lakeD = Math.hypot(x - WORLD.lakeCentre.x, z - WORLD.lakeCentre.z);
  h -= WORLD.lakeDepth * Math.exp(-(lakeD * lakeD) / (WORLD.lakeRadius * WORLD.lakeRadius));
  // Flatten to the runway's elevation inside its clear box, easing out over 80 m.
  const flat = 1 - smoothstep(clearBoxDistance(x, z) / 80);
  return h * (1 - flat) + RUNWAY.elevation * flat;
}

/** A slope colour: meadow low, dry grass mid, rock high, snow on the peaks. */
function groundColor(height, jitter) {
  const cLow = new THREE.Color(COLORS.grassLow);
  const cHigh = new THREE.Color(COLORS.grassHigh);
  const cRock = new THREE.Color(COLORS.rock);
  const cSnow = new THREE.Color(COLORS.snow);
  let c;
  if (height < 45) c = cLow.clone().lerp(cHigh, height / 45);
  else if (height < 95) c = cHigh.clone().lerp(cRock, (height - 45) / 50);
  else c = cRock.clone().lerp(cSnow, Math.min(1, (height - 95) / 45));
  const shade = 0.92 + jitter * 0.16;
  c.multiplyScalar(shade);
  return c;
}

/** Hide an unused instanced slot far underground at zero scale. */
function hideSlot(mesh, index, dummy) {
  dummy.position.set(0, -50, 0);
  dummy.scale.setScalar(0.001);
  dummy.rotation.set(0, 0, 0);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

/** Build the whole valley and add it to the scene. Returns the height query. */
export function buildTerrain(scene) {
  // The heightfield, coloured by altitude.
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, WORLD.segments, WORLD.segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const rng = mulberry32(SEED + 7);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    const c = groundColor(h, rng());
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  scene.add(ground);

  // The lake: a still blue disc in its basin.
  const lake = new THREE.Mesh(
    new THREE.CircleGeometry(WORLD.lakeRadius * 0.92, 48),
    new THREE.MeshLambertMaterial({
      color: COLORS.water,
      transparent: true,
      opacity: 0.88,
    }),
  );
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(WORLD.lakeCentre.x, WORLD.waterLevel, WORLD.lakeCentre.z);
  scene.add(lake);

  // Trees: instanced trunks and canopies, kept off the runway and the lake.
  const treeCount = 340;
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 4, 6);
  const leafGeo = new THREE.ConeGeometry(3.2, 11, 7);
  const trunkMat = new THREE.MeshLambertMaterial({ color: COLORS.treeTrunk });
  const leafMat = new THREE.MeshLambertMaterial({ color: COLORS.treeLeaf });
  const leafMat2 = new THREE.MeshLambertMaterial({ color: COLORS.treeLeaf2 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, treeCount);
  const leaves2 = new THREE.InstancedMesh(leafGeo, leafMat2, treeCount);
  const dummy = new THREE.Object3D();
  let placed = 0;
  let guard = 0;
  while (placed < treeCount && guard < treeCount * 40) {
    guard += 1;
    const x = (rng() * 2 - 1) * (WORLD.size / 2 - 40);
    const z = (rng() * 2 - 1) * (WORLD.size / 2 - 40);
    const h = terrainHeight(x, z);
    if (h < WORLD.waterLevel + 1.5 || h > 90) continue;
    if (Math.abs(terrainHeight(x + 4, z) - h) > 3) continue;
    const s = 0.8 + rng() * 0.9;
    dummy.position.set(x, h + 2 * s, z);
    dummy.scale.setScalar(s);
    dummy.rotation.y = rng() * Math.PI * 2;
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    // The canopy sits on the trunk; the other leaf mesh gets a hidden slot.
    dummy.position.y = h + 9 * s;
    dummy.updateMatrix();
    if (placed % 2 === 0) {
      leaves.setMatrixAt(placed, dummy.matrix);
      hideSlot(leaves2, placed, dummy);
    } else {
      leaves2.setMatrixAt(placed, dummy.matrix);
      hideSlot(leaves, placed, dummy);
    }
    placed += 1;
  }
  for (let i = placed; i < treeCount; i += 1) {
    hideSlot(trunks, i, dummy);
    hideSlot(leaves, i, dummy);
    hideSlot(leaves2, i, dummy);
  }
  scene.add(trunks, leaves, leaves2);

  // Rocks on the high ground.
  const rockCount = 130;
  const rockGeo = new THREE.DodecahedronGeometry(2.2, 0);
  const rockMat = new THREE.MeshLambertMaterial({ color: COLORS.rock });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  placed = 0;
  guard = 0;
  while (placed < rockCount && guard < rockCount * 40) {
    guard += 1;
    const x = (rng() * 2 - 1) * (WORLD.size / 2 - 40);
    const z = (rng() * 2 - 1) * (WORLD.size / 2 - 40);
    const h = terrainHeight(x, z);
    if (h < 55) continue;
    const s = 0.7 + rng() * 1.6;
    dummy.position.set(x, h + 0.6 * s, z);
    dummy.scale.set(s, s * 0.7, s);
    dummy.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    dummy.updateMatrix();
    rocks.setMatrixAt(placed, dummy.matrix);
    placed += 1;
  }
  for (let i = placed; i < rockCount; i += 1) hideSlot(rocks, i, dummy);
  scene.add(rocks);

  // The runway: asphalt, centreline dashes and threshold bars.
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY.width, 0.4, RUNWAY.length),
    new THREE.MeshLambertMaterial({ color: COLORS.runway }),
  );
  strip.position.set(RUNWAY.x, RUNWAY.elevation + 0.1, RUNWAY.z);
  scene.add(strip);
  const dashGeo = new THREE.BoxGeometry(0.8, 0.06, 9);
  const dashMat = new THREE.MeshLambertMaterial({ color: COLORS.runwayMark });
  const dashes = Math.floor(RUNWAY.length / 24);
  const dashMesh = new THREE.InstancedMesh(dashGeo, dashMat, dashes);
  for (let i = 0; i < dashes; i += 1) {
    const z = RUNWAY.z - RUNWAY.length / 2 + 12 + i * 24;
    dummy.position.set(RUNWAY.x, RUNWAY.elevation + 0.32, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    dashMesh.setMatrixAt(i, dummy.matrix);
  }
  scene.add(dashMesh);
  const barGeo = new THREE.BoxGeometry(RUNWAY.width * 0.7, 0.06, 2.4);
  const barMesh = new THREE.InstancedMesh(barGeo, dashMat, 2);
  for (let i = 0; i < 2; i += 1) {
    const z = RUNWAY.z + (i === 0 ? -1 : 1) * (RUNWAY.length / 2 - 14);
    dummy.position.set(RUNWAY.x, RUNWAY.elevation + 0.32, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    barMesh.setMatrixAt(i, dummy.matrix);
  }
  scene.add(barMesh);

  // A windsock by the threshold, so the strip reads as an airfield.
  const sock = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 9, 6),
    new THREE.MeshLambertMaterial({ color: 0xdddddd }),
  );
  pole.position.y = 4.5;
  sock.add(pole);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 3.4, 8),
    new THREE.MeshLambertMaterial({ color: 0xff7a1a }),
  );
  cone.rotation.z = Math.PI / 2;
  cone.position.set(1.8, 8.6, 0);
  sock.add(cone);
  sock.position.set(RUNWAY.x + RUNWAY.width / 2 + 8, RUNWAY.elevation, RUNWAY.z - RUNWAY.length / 2 + 20);
  scene.add(sock);

  return { heightAt: terrainHeight, runwayTop: RUNWAY.elevation + 0.3 };
}
