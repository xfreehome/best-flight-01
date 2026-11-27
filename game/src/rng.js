// AeroRidge — deterministic randomness: a seeded generator and the
// value-noise field the terrain is carved from. Same seed, same valley.

/** A small fast seeded PRNG (mulberry32). Returns floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer-lattice hash: a stable pseudo-random value in [-1, 1] per cell. */
function hashCell(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 974634781) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 2147483648 - 1;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

/** One octave of 2D value noise, in [-1, 1]. */
function valueNoise(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const a = hashCell(ix, iz, seed);
  const b = hashCell(ix + 1, iz, seed);
  const c = hashCell(ix, iz + 1, seed);
  const d = hashCell(ix + 1, iz + 1, seed);
  const ux = smooth(fx);
  const uz = smooth(fz);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

/**
 * Fractal Brownian motion over value noise: 4 octaves, in roughly [-1, 1].
 * The field the terrain height reads.
 */
export function makeNoise2D(seed) {
  return function noise2(x, z) {
    let sum = 0;
    let amp = 0.55;
    let freq = 1;
    for (let octave = 0; octave < 4; octave += 1) {
      sum += amp * valueNoise(x * freq, z * freq, seed + octave * 101);
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum;
  };
}
