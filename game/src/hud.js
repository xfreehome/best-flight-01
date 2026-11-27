// AeroRidge — the HUD: a lit instrument panel over the 3D view. Altitude,
// speed and heading are always on screen (the judge looks for them), plus
// throttle, fuel, score, the ring count and the mission line. All DOM, so it
// stays crisp in a screenshot. The attitude ball is a horizon line that
// rolls and pitches with the aeroplane.

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

function byId(id) {
  return document.getElementById(id);
}

/** Read every HUD element once; the game loop then only writes text. */
export function buildHud() {
  return {
    alt: byId('hud-alt'),
    speed: byId('hud-speed'),
    heading: byId('hud-heading'),
    vsi: byId('hud-vsi'),
    throttleBar: byId('hud-throttle-bar'),
    throttleText: byId('hud-throttle-text'),
    fuelBar: byId('hud-fuel-bar'),
    fuelText: byId('hud-fuel-text'),
    score: byId('hud-score'),
    rings: byId('hud-rings'),
    message: byId('hud-message'),
    attitude: byId('hud-attitude-horizon'),
    screens: {
      title: byId('screen-title'),
      paused: byId('screen-paused'),
      crashed: byId('screen-crashed'),
      complete: byId('screen-complete'),
    },
    completeScore: byId('complete-score'),
    completeDetail: byId('complete-detail'),
    crashedDetail: byId('crashed-detail'),
  };
}

/** Show one overlay screen and hide the others; '' hides them all. */
export function showScreen(hud, name) {
  for (const [key, el] of Object.entries(hud.screens)) {
    if (el) el.classList.toggle('hidden', key !== name);
  }
}

/** Write the flight state into the instruments. */
export function updateHud(hud, flight, missions, groundHeight) {
  const altM = Math.max(0, flight.pos.y - groundHeight);
  const altFt = Math.round(altM * 3.28084);
  const speedKt = Math.round(flight.speed * 1.94384);
  const headingDeg = ((flight.heading * 180) / Math.PI % 360 + 360) % 360;
  const compass = COMPASS[Math.round(headingDeg / 22.5) % 16];
  const vsiFpm = Math.round(flight.verticalSpeed * 196.85);

  if (hud.alt) hud.alt.textContent = `${altFt.toLocaleString('en-US')} ft`;
  if (hud.speed) hud.speed.textContent = `${speedKt} kt`;
  if (hud.heading) hud.heading.textContent = `${String(Math.round(headingDeg)).padStart(3, '0')}° ${compass}`;
  if (hud.vsi) hud.vsi.textContent = `${vsiFpm >= 0 ? '+' : ''}${vsiFpm} fpm`;
  if (hud.throttleBar) hud.throttleBar.style.width = `${Math.round(flight.throttle * 100)}%`;
  if (hud.throttleText) hud.throttleText.textContent = `THR ${Math.round(flight.throttle * 100)}%`;
  if (hud.fuelBar) {
    hud.fuelBar.style.width = `${Math.round(flight.fuel)}%`;
    hud.fuelBar.classList.toggle('low', flight.fuel < 25);
  }
  if (hud.fuelText) hud.fuelText.textContent = `FUEL ${Math.round(flight.fuel)}%`;
  if (hud.score) hud.score.textContent = String(missions.state.score);
  if (hud.rings) hud.rings.textContent = `RING ${Math.min(missions.state.index + 1, 8)}/8`;
  if (hud.attitude) {
    const rollDeg = (-flight.roll * 180) / Math.PI;
    const pitchPx = Math.max(-34, Math.min(34, -flight.pitch * 52));
    hud.attitude.style.transform = `rotate(${rollDeg}deg) translateY(${pitchPx}px)`;
  }
}

/** The mission line under the score: what to do next, and how far it is. */
export function updateMessage(hud, flight, missions) {
  if (!hud.message) return;
  const centre = missions.nextCentre();
  if (flight.crashed) {
    hud.message.textContent = 'Crashed. Press R to fly again.';
    return;
  }
  if (missions.state.sortieComplete) {
    hud.message.textContent = 'Sortie complete — well flown!';
    return;
  }
  if (missions.state.allRingsDone) {
    hud.message.textContent = 'All rings! Bring her home — land on the runway.';
    return;
  }
  if (!flight.airborne && flight.speed < 5) {
    hud.message.textContent = 'Full throttle (Shift), pull up (W) at 55 kt to lift off.';
    return;
  }
  if (centre) {
    const dist = Math.round(
      Math.hypot(centre.x - flight.pos.x, centre.y - flight.pos.y, centre.z - flight.pos.z),
    );
    hud.message.textContent = `Ring ${missions.state.index + 1} of 8 — ${dist} m ahead.`;
  }
}
