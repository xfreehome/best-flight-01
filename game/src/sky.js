// AeroRidge — the sky: a gradient dome with a low sun, a warm directional
// light, and slow-drifting clouds. One late-afternoon style for the whole game.

import * as THREE from 'three';
import { COLORS, SEED } from './config.js';
import { mulberry32 } from './rng.js';

/** Build the dome, the sun, the light and the clouds. Returns an updater. */
export function buildSky(scene) {
  // A gradient dome: warm horizon, blue zenith, and a glow around the sun.
  const domeGeo = new THREE.SphereGeometry(2800, 32, 20);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(COLORS.skyZenith) },
      horizonColor: { value: new THREE.Color(COLORS.skyHorizon) },
      sunDirection: { value: new THREE.Vector3(-0.45, 0.28, -0.85).normalize() },
      sunColor: { value: new THREE.Color(COLORS.sun) },
    },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDirection;
      uniform vec3 sunColor;
      varying vec3 vDirection;
      void main() {
        float h = clamp(vDirection.y, 0.0, 1.0);
        vec3 sky = mix(horizonColor, topColor, pow(h, 0.62));
        float sunAmount = max(dot(normalize(vDirection), normalize(sunDirection)), 0.0);
        sky += sunColor * (pow(sunAmount, 220.0) * 1.4 + pow(sunAmount, 7.0) * 0.22);
        gl_FragColor = vec4(sky, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  scene.add(dome);

  // The sun itself: a bright disc low in the west, and the key light.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(60, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.sun, fog: false }),
  );
  sun.position.set(-1260, 780, -2380);
  sun.lookAt(0, 0, 0);
  scene.add(sun);
  const sunLight = new THREE.DirectionalLight(0xffe8c0, 2.4);
  sunLight.position.set(-450, 280, -850);
  scene.add(sunLight);
  const ambient = new THREE.HemisphereLight(0xbfd8ff, 0x6a7a4a, 0.85);
  scene.add(ambient);

  // Clouds: soft flattened blobs, drifting with the wind.
  const rng = mulberry32(SEED + 21);
  const cloudMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.82,
  });
  const clouds = [];
  for (let i = 0; i < 20; i += 1) {
    const puffs = 2 + Math.floor(rng() * 3);
    const cloud = new THREE.Group();
    for (let p = 0; p < puffs; p += 1) {
      const r = 26 + rng() * 42;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), cloudMat);
      puff.position.set((p - puffs / 2) * r * 1.1, (rng() - 0.5) * 8, (rng() - 0.5) * 18);
      puff.scale.y = 0.42;
      cloud.add(puff);
    }
    const angle = rng() * Math.PI * 2;
    const dist = 500 + rng() * 1400;
    cloud.position.set(Math.cos(angle) * dist, 240 + rng() * 160, Math.sin(angle) * dist);
    scene.add(cloud);
    clouds.push({ group: cloud, speed: 1.5 + rng() * 2.5 });
  }

  return {
    sunLight,
    /** Drift the clouds; the dome and the sun never move. */
    update(dt) {
      for (const cloud of clouds) {
        cloud.group.position.x += cloud.speed * dt;
        if (cloud.group.position.x > 1800) cloud.group.position.x = -1800;
      }
    },
  };
}
