// AeroRidge — the aeroplane: a low-poly propeller trainer built from
// primitives, cream and teal with red accents. Forward is -Z, up is +Y.
// The group uses YXZ rotation order: heading, then pitch, then roll.

import * as THREE from 'three';
import { COLORS } from './config.js';

/** Build the plane. Returns the group and the spinning propeller. */
export function buildAircraft() {
  const cream = new THREE.MeshLambertMaterial({ color: COLORS.planeCream });
  const teal = new THREE.MeshLambertMaterial({ color: COLORS.planeTeal });
  const red = new THREE.MeshLambertMaterial({ color: COLORS.planeRed });
  const dark = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const glass = new THREE.MeshLambertMaterial({
    color: 0x1a2f3f,
    transparent: true,
    opacity: 0.92,
  });

  const plane = new THREE.Group();
  plane.rotation.order = 'YXZ';

  // Fuselage: a tapered tube with a pointed nose and tail cone.
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 5.4, 12), cream);
  fuselage.rotation.x = Math.PI / 2;
  plane.add(fuselage);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 12), red);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -3.35;
  plane.add(nose);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.4, 12), teal);
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.z = 3.4;
  plane.add(tailCone);

  // Canopy: a tinted bubble over the cockpit.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 12), glass);
  canopy.scale.set(0.9, 0.62, 1.7);
  canopy.position.set(0, 0.52, -1.1);
  plane.add(canopy);

  // Main wing and tailplane, with a red stripe along the wing.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.18, 1.7), teal);
  wing.position.set(0, -0.05, -0.4);
  plane.add(wing);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(9.62, 0.06, 0.28), red);
  stripe.position.set(0, 0.06, -0.9);
  plane.add(stripe);
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 1.1), teal);
  tailplane.position.set(0, 0.12, 3.1);
  plane.add(tailplane);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.7, 1.3), red);
  fin.position.set(0, 0.75, 3.2);
  plane.add(fin);

  // Wingtip navigation lights: red port, green starboard.
  const navRed = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2222 }),
  );
  navRed.position.set(-4.8, -0.05, -0.4);
  plane.add(navRed);
  const navGreen = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x22ff66 }),
  );
  navGreen.position.set(4.8, -0.05, -0.4);
  plane.add(navGreen);

  // Propeller: two blades and a spinner, spinning around the nose axis.
  const propeller = new THREE.Group();
  propeller.position.z = -4.05;
  const bladeGeo = new THREE.BoxGeometry(0.22, 2.9, 0.09);
  const blade1 = new THREE.Mesh(bladeGeo, dark);
  const blade2 = new THREE.Mesh(bladeGeo, dark);
  blade2.rotation.z = Math.PI / 2;
  propeller.add(blade1, blade2);
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 10), red);
  spinner.rotation.x = -Math.PI / 2;
  spinner.position.z = -0.25;
  propeller.add(spinner);
  plane.add(propeller);

  // Fixed landing gear: two mains and a tail wheel.
  const gearMat = dark;
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6), gearMat);
    strut.position.set(side * 1.1, -0.75, -0.6);
    plane.add(strut);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), gearMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 1.1, -1.15, -0.6);
    plane.add(wheel);
  }
  const tailWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 8), gearMat);
  tailWheel.rotation.z = Math.PI / 2;
  tailWheel.position.set(0, -0.72, 3.4);
  plane.add(tailWheel);

  return { group: plane, propeller };
}
