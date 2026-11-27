# AeroRidge — Make the best flight game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-01)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/xfreehome/best-flight-01/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-01)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/xfreehome/best-flight-01/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-01)

Entry for the [make.fun](https://make.fun/bounty/best-flight-game-20261126-0057) competition "Make the best flight game" ($500). A complete 3D flight game that plays offline in a desktop browser from static files — no network, no build step.

Fly a low-poly propeller plane over a procedurally built valley: take off from the runway, thread 8 glowing rings in order, mind your fuel and airframe, and bring her home for a landing. Chase and cockpit cameras, a lit HUD (altitude, speed, heading, throttle, fuel), synthesised engine sound, and a deterministic screenshot mode for the judges.

Play it: `node serve.ts`, then open http://localhost:8080. Controls: Arrow keys / WASD to pitch and roll, Shift / Ctrl for throttle, C for camera, R to reset, P to pause. Mouse drag orbits the chase camera.

Built with Three.js (vendored under `game/vendor/`), plain HTML/CSS/JS, and Node 22 for the hand-in program (`main.ts`).
