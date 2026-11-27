// AeroRidge — one place for every number the game tunes by.
// Nothing here is read from the network; the world is fully deterministic
// from SEED, so the same seed always builds the same valley, runway and rings.

export const SEED = 20261127;

// The valley the game flies in: a square of terrain, 2.4 km across.
export const WORLD = {
  size: 2400,
  segments: 128,
  // Rolling hills from value noise, plus a carved valley floor and a lake basin.
  hillAmplitude: 95,
  hillFrequency: 1 / 520,
  valleyDepth: 55,
  lakeCentre: { x: 520, z: 430 },
  lakeRadius: 210,
  lakeDepth: 26,
  waterLevel: 4,
};

// The runway: a flat strip along the valley floor, heading north (-Z).
export const RUNWAY = {
  x: 0,
  z: 0,
  length: 420,
  width: 26,
  elevation: 0,
  // Keep trees and rocks out of this box around the strip.
  clearHalfWidth: 70,
};

// The aeroplane and how it flies. Arcade numbers, tuned by feel:
// a trainer that lifts off near 55 kt, cruises near 120 kt and stalls near 42 kt.
export const PLANE = {
  maxSpeed: 62, // m/s, about 120 kt at full throttle
  cruiseSpeed: 46,
  takeoffSpeed: 28,
  stallSpeed: 21,
  acceleration: 9,
  drag: 0.55,
  pitchRate: 0.85, // rad/s at full elevator
  rollRate: 1.5, // rad/s at full aileron
  turnFactor: 0.55, // how much bank turns the nose
  gravity: 9.8,
  sinkRate: 6, // m/s lost when stalled
  climbRate: 7,
  fuelCapacity: 100,
  fuelBurn: 1.6, // units/s at full throttle
  ringFuelBonus: 12,
  gearHeight: 1.6,
  crashVerticalSpeed: 9,
  hardLandingVerticalSpeed: 5,
};

// The ring course: eight glowing rings around the valley, in order.
export const RINGS = {
  count: 8,
  radius: 14,
  // Ring centres, hand-placed over the terrain so every leg is a real
  // piece of flying: over the lake, through the pass, along the ridge.
  centres: [
    { x: 0, z: -420, y: 90 },
    { x: -320, z: -620, y: 130 },
    { x: -620, z: -180, y: 170 },
    { x: -480, z: 380, y: 150 },
    { x: 60, z: 640, y: 110 },
    { x: 520, z: 430, y: 80 },
    { x: 760, z: -120, y: 160 },
    { x: 420, z: -560, y: 120 },
  ],
};

// The look: one warm late-afternoon style for terrain, sky and aircraft.
export const COLORS = {
  skyZenith: 0x2f6fb4,
  skyHorizon: 0xf6c98a,
  sun: 0xffe3a3,
  grassLow: 0x5d8a3c,
  grassHigh: 0x8a7a3a,
  rock: 0x7a6a58,
  snow: 0xe8e8e8,
  water: 0x2e6f8e,
  runway: 0x2b2b2e,
  runwayMark: 0xf2f2f2,
  treeTrunk: 0x5a3d24,
  treeLeaf: 0x3f6d2e,
  treeLeaf2: 0x557f33,
  planeCream: 0xf2e6c8,
  planeTeal: 0x1f6f6b,
  planeRed: 0xc23b2e,
  ring: 0xffb020,
  ringNext: 0x37e0a0,
};

// Chase and cockpit cameras.
export const CAMERA = {
  chaseDistance: 13,
  chaseHeight: 4.2,
  chaseLookAhead: 14,
  smooth: 4.5,
  cockpitOffset: { x: 0, y: 1.15, z: 0.4 },
};
