// AeroRidge — screenshot staging: deterministic posed scenes for ?shot=.
// Each scene sets the aeroplane, the mission and the camera, and the game
// loop then renders it frozen, so the same URL always gives the same frame.
// The scenes are the ones shots.json names: takeoff, rings, landing, cockpit.

import { RINGS, RUNWAY } from './config.js';

/** Pose the game for a named shot. Returns which camera to use. */
export function stageShot(name, ctx) {
  const { flight, missions } = ctx;
  const gearY = RUNWAY.elevation + 1.6;

  if (name === 'rings') {
    // On the leg into ring 3, the ring dead ahead.
    const target = RINGS.centres[2];
    const prev = RINGS.centres[1];
    const dx = target.x - prev.x;
    const dy = target.y - prev.y;
    const dz = target.z - prev.z;
    const len = Math.hypot(dx, dy, dz);
    const ux = dx / len;
    const uy = dy / len;
    const uz = dz / len;
    flight.pos.set(target.x - ux * 130, target.y - uy * 130, target.z - uz * 130);
    flight.heading = Math.atan2(ux, -uz);
    flight.pitch = Math.asin(Math.max(-0.5, Math.min(0.5, uy)));
    flight.roll = 0.12;
    flight.speed = 46;
    flight.throttle = 0.8;
    flight.fuel = 78;
    flight.airborne = true;
    flight.onGround = false;
    missions.setIndex(2);
    return { camera: 'chase' };
  }

  if (name === 'landing') {
    // On final, the strip ahead, gear down, settling.
    flight.pos.set(6, gearY + 42, RUNWAY.z + RUNWAY.length / 2 + 260);
    flight.heading = 0;
    flight.pitch = -0.05;
    flight.roll = 0;
    flight.speed = 30;
    flight.throttle = 0.35;
    flight.fuel = 38;
    flight.airborne = true;
    flight.onGround = false;
    missions.setIndex(RINGS.count);
    return { camera: 'chase' };
  }

  if (name === 'cockpit') {
    // From the cockpit, the valley and the strip ahead.
    flight.pos.set(30, 130, RUNWAY.z + RUNWAY.length / 2 + 320);
    flight.heading = 0;
    flight.pitch = 0.02;
    flight.roll = 0.06;
    flight.speed = 42;
    flight.throttle = 0.7;
    flight.fuel = 64;
    flight.airborne = true;
    flight.onGround = false;
    missions.setIndex(5);
    return { camera: 'cockpit' };
  }

  // 'takeoff' (and anything else): rotating off the strip, runway ahead.
  flight.pos.set(0, gearY + 9, RUNWAY.z + RUNWAY.length / 2 - 60);
  flight.heading = 0;
  flight.pitch = 0.14;
  flight.roll = 0;
  flight.speed = 34;
  flight.throttle = 1.0;
  flight.fuel = 92;
  flight.airborne = true;
  flight.onGround = false;
  missions.setIndex(0);
  return { camera: 'chase' };
}
