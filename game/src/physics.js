// AeroRidge — the flight model: an arcade trainer. Throttle sets the speed,
// elevator sets the pitch, ailerons bank the wings and the bank turns the
// nose. It stalls when slow, it needs the runway (or a gentle field) to land,
// and it only flies while it has fuel. All angles are radians; forward is -Z
// at heading 0, and heading grows to the right (east).

import * as THREE from 'three';
import { PLANE, RUNWAY } from './config.js';

/** A fresh aeroplane, sitting on the runway threshold, facing north. */
export function createFlight() {
  return {
    pos: new THREE.Vector3(RUNWAY.x, RUNWAY.elevation + PLANE.gearHeight, RUNWAY.z + RUNWAY.length / 2 - 30),
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    verticalSpeed: 0,
    fuel: PLANE.fuelCapacity,
    integrity: 100,
    airborne: false,
    onGround: true,
    crashed: false,
    landed: false,
    distanceFlown: 0,
  };
}

/** Put the aeroplane back on the threshold, as if the sortie just began. */
export function resetFlight(state) {
  const fresh = createFlight();
  Object.assign(state, fresh);
  state.pos.copy(fresh.pos);
}

/** Forward vector for a heading: north (-Z) at 0, east (+X) at +90 degrees. */
export function forwardOf(heading) {
  return new THREE.Vector3(Math.sin(heading), 0, -Math.cos(heading));
}

/** True on the runway strip (plus a small margin), false anywhere else. */
function onRunway(x, z) {
  return (
    Math.abs(x - RUNWAY.x) < RUNWAY.width / 2 + 4 &&
    Math.abs(z - RUNWAY.z) < RUNWAY.length / 2 + 4
  );
}

/**
 * Step the aeroplane one frame. `input` is { pitch, roll, throttleUp,
 * throttleDown } with pitch/roll in [-1, 1]. Returns what happened this step:
 * { tookOff, touchedDown, crashed }.
 */
export function stepFlight(state, input, dt, heightAt) {
  const events = { tookOff: false, touchedDown: false, crashed: false };
  if (state.crashed) return events;

  // Throttle: a lever that moves at a human pace.
  if (state.fuel <= 0) state.throttle = 0;
  else {
    if (input.throttleUp) state.throttle = Math.min(1, state.throttle + 0.55 * dt);
    if (input.throttleDown) state.throttle = Math.max(0, state.throttle - 0.7 * dt);
  }

  // Speed chases the throttle, faster to spool up than to slow down.
  const target = state.throttle * PLANE.maxSpeed;
  if (target > state.speed) state.speed += Math.min(target - state.speed, PLANE.acceleration * dt);
  else state.speed += (target - state.speed) * Math.min(1, PLANE.drag * dt);

  // Elevator and ailerons. On the ground the controls are mushy until rotation speed.
  const authority = state.airborne ? 1 : state.speed >= PLANE.takeoffSpeed ? 0.6 : 0.15;
  state.pitch += input.pitch * PLANE.pitchRate * authority * dt;
  state.pitch = Math.max(-0.5, Math.min(0.6, state.pitch));
  state.roll += input.roll * PLANE.rollRate * authority * dt;
  state.roll = Math.max(-1.1, Math.min(1.1, state.roll));
  if (input.roll === 0) {
    // No aileron input: the wings gently level themselves.
    const level = 0.8 * dt;
    state.roll = Math.abs(state.roll) <= level ? 0 : state.roll - Math.sign(state.roll) * level;
  }
  if (input.pitch === 0 && state.airborne) {
    // No elevator input: the nose settles back toward level flight.
    const level = 0.25 * dt;
    state.pitch = Math.abs(state.pitch) <= level ? 0 : state.pitch - Math.sign(state.pitch) * level;
  }

  // A banked turn: the nose follows the bank, more so the faster you fly.
  const turnRate = state.roll * PLANE.turnFactor * (state.speed / PLANE.maxSpeed);
  state.heading += (state.airborne ? turnRate : turnRate * 0.3) * dt;

  // Lift: the wings only work above stall speed.
  const lift = Math.min(1, Math.max(0, state.speed / PLANE.stallSpeed));
  const climb = state.speed * Math.sin(state.pitch) * lift;
  state.verticalSpeed = climb - (1 - lift) * PLANE.sinkRate;

  // Liftoff: pull up at rotation speed and the ground lets go.
  if (state.onGround && state.speed >= PLANE.takeoffSpeed && input.pitch > 0.05) {
    state.airborne = true;
    state.onGround = false;
    events.tookOff = true;
  }

  // Move: forward along the heading, up by the climb.
  const forward = forwardOf(state.heading);
  const horizontal = state.speed * Math.cos(state.pitch);
  state.pos.addScaledVector(forward, horizontal * dt);
  state.pos.y += state.verticalSpeed * dt;
  state.distanceFlown += state.speed * dt;

  // Fuel burns with the throttle.
  state.fuel = Math.max(0, state.fuel - PLANE.fuelBurn * state.throttle * dt);

  // The ground: land it, roll it, or wreck it.
  const groundY = heightAt(state.pos.x, state.pos.z) + PLANE.gearHeight;
  if (state.pos.y <= groundY) {
    const hard = Math.abs(state.verticalSpeed) > PLANE.crashVerticalSpeed;
    const fastOffRunway = !onRunway(state.pos.x, state.pos.z) && state.speed > 50;
    if (state.airborne && (hard || fastOffRunway)) {
      state.crashed = true;
      state.integrity = 0;
      state.pos.y = groundY;
      state.verticalSpeed = 0;
      events.crashed = true;
      return events;
    }
    const wasAirborne = state.airborne;
    state.pos.y = groundY;
    state.verticalSpeed = 0;
    state.airborne = false;
    state.onGround = true;
    state.pitch = 0;
    if (wasAirborne) {
      events.touchedDown = true;
      if (onRunway(state.pos.x, state.pos.z) && Math.abs(state.verticalSpeed) <= PLANE.hardLandingVerticalSpeed) {
        state.landed = true;
      }
    }
    // Rolling on the ground scrubs speed.
    state.speed = Math.max(0, state.speed - 6 * dt);
  }

  return events;
}

/** Copy the flight state onto the plane's group (YXZ: heading, pitch, roll). */
export function applyFlightToGroup(state, group) {
  group.position.copy(state.pos);
  group.rotation.y = -state.heading;
  group.rotation.x = state.pitch;
  group.rotation.z = -state.roll;
}
