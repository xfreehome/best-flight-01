// AeroRidge — the mission: eight glowing rings around the valley, in order,
// then a landing back on the strip. Rings pay score and fuel; the landing
// pays a bonus for what is left in the tanks and how clean it was.

import * as THREE from 'three';
import { COLORS, PLANE, RINGS, RUNWAY } from './config.js';

/** Build the ring meshes and the mission state. */
export function createMissions(scene) {
  const ringGeo = new THREE.TorusGeometry(RINGS.radius, 0.9, 12, 40);
  const doneMat = new THREE.MeshBasicMaterial({ color: 0x556066 });
  const idleMat = new THREE.MeshBasicMaterial({ color: COLORS.ring });
  const nextMat = new THREE.MeshBasicMaterial({ color: COLORS.ringNext });
  const meshes = RINGS.centres.map((centre, i) => {
    const ring = new THREE.Mesh(ringGeo, idleMat);
    ring.position.set(centre.x, centre.y, centre.z);
    // Stand the ring upright, facing the approach: its axis points back
    // along the leg the pilot just flew, so the plane threads it cleanly.
    const prev =
      i === 0
        ? { x: RUNWAY.x, y: 40, z: RUNWAY.z + RUNWAY.length / 2 }
        : RINGS.centres[i - 1];
    const dx = centre.x - prev.x;
    const dz = centre.z - prev.z;
    ring.rotation.y = Math.atan2(dx, dz);
    scene.add(ring);
    // A small beacon above the ring so it reads from far away.
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 10, 8),
      new THREE.MeshBasicMaterial({ color: COLORS.ring }),
    );
    beacon.position.set(centre.x, centre.y + RINGS.radius + 6, centre.z);
    scene.add(beacon);
    return { ring, beacon };
  });

  const state = {
    index: 0,
    collected: 0,
    score: 0,
    startTime: 0,
    elapsed: 0,
    allRingsDone: false,
    sortieComplete: false,
    landingBonus: 0,
  };

  function paint() {
    meshes.forEach((mesh, i) => {
      const mat = i < state.index ? doneMat : i === state.index ? nextMat : idleMat;
      mesh.ring.material = mat;
      mesh.beacon.material = mat;
    });
  }
  paint();

  return {
    state,
    /** The centre of the ring the pilot is flying to now (or null). */
    nextCentre() {
      return state.index < RINGS.count ? RINGS.centres[state.index] : null;
    },
    /** How many rings are left, including the one ahead. */
    ringsLeft() {
      return RINGS.count - state.index;
    },
    /**
     * Call every frame with the plane's position: returns the ring just
     * flown through, or null. A ring counts when the plane passes within
     * its circle.
     */
    checkRing(pos, flight) {
      if (state.index >= RINGS.count) return null;
      const centre = RINGS.centres[state.index];
      const dx = pos.x - centre.x;
      const dy = pos.y - centre.y;
      const dz = pos.z - centre.z;
      if (Math.hypot(dx, dy, dz) > RINGS.radius) return null;
      state.index += 1;
      state.collected += 1;
      const timeBonus = Math.max(0, 300 - Math.floor(state.elapsed));
      state.score += 500 + timeBonus;
      flight.fuel = Math.min(PLANE.fuelCapacity, flight.fuel + PLANE.ringFuelBonus);
      if (state.index >= RINGS.count) state.allRingsDone = true;
      paint();
      return { number: state.index, timeBonus };
    },
    /**
     * The sortie is complete when every ring is flown and the plane is
     * back down on the runway. Returns the landing bonus, or 0.
     */
    completeLanding(flight) {
      if (!state.allRingsDone || state.sortieComplete) return 0;
      const fuelBonus = Math.floor(flight.fuel) * 5;
      const timeBonus = Math.max(0, 600 - Math.floor(state.elapsed));
      state.landingBonus = 1000 + fuelBonus + timeBonus;
      state.score += state.landingBonus;
      state.sortieComplete = true;
      return state.landingBonus;
    },
    /** Pulse the next ring so it catches the eye. */
    update(time) {
      if (state.index < RINGS.count) {
        const pulse = 1 + Math.sin(time * 3) * 0.05;
        meshes[state.index].ring.scale.setScalar(pulse);
        meshes[state.index].beacon.position.y =
          RINGS.centres[state.index].y + RINGS.radius + 6 + Math.sin(time * 2) * 1.5;
      }
    },
    /** Jump to a ring (for screenshot staging): repaints the rings. */
    setIndex(i) {
      state.index = Math.max(0, Math.min(RINGS.count, i));
      state.collected = state.index;
      state.allRingsDone = state.index >= RINGS.count;
      paint();
    },
    /** Back to the first ring, as if the sortie just began. */
    reset() {
      state.index = 0;
      state.collected = 0;
      state.score = 0;
      state.elapsed = 0;
      state.allRingsDone = false;
      state.sortieComplete = false;
      state.landingBonus = 0;
      paint();
    },
  };
}
