// AeroRidge — input: keyboard and mouse. Arrows or WASD fly the plane,
// Shift/Ctrl (or the mouse wheel) work the throttle, drag orbits the chase
// camera, and C / R / P / M are one-shot keys the game loop polls.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const orbit = { x: 0, y: 0 };
  let wheel = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const GAME_KEYS = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight',
    'ControlLeft', 'ControlRight', 'KeyC', 'KeyR', 'KeyP', 'KeyM',
  ]);

  function onKeyDown(event) {
    if (!GAME_KEYS.has(event.code)) return;
    event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseDown(event) {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
  }

  function onMouseMove(event) {
    if (!dragging) return;
    orbit.x += event.clientX - lastX;
    orbit.y += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  }

  function onMouseUp() {
    dragging = false;
  }

  function onWheel(event) {
    event.preventDefault();
    wheel += event.deltaY < 0 ? 1 : -1;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  const down = (code) => keys.has(code);

  return {
    /** Elevator: +1 climbs (W / Up), -1 descends (S / Down). */
    pitch() {
      return (down('KeyW') || down('ArrowUp') ? 1 : 0) - (down('KeyS') || down('ArrowDown') ? 1 : 0);
    },
    /** Aileron: +1 banks right (D / Right), -1 banks left (A / Left). */
    roll() {
      return (down('KeyD') || down('ArrowRight') ? 1 : 0) - (down('KeyA') || down('ArrowLeft') ? 1 : 0);
    },
    throttleUp() {
      return down('ShiftLeft') || down('ShiftRight');
    },
    throttleDown() {
      return down('ControlLeft') || down('ControlRight');
    },
    /** One-shot keys pressed since the last poll (C, R, P, M). */
    takePressed() {
      const out = new Set(pressed);
      pressed.clear();
      return out;
    },
    /** Mouse drag since the last poll, in pixels; resets to zero. */
    takeOrbit() {
      const out = { x: orbit.x, y: orbit.y };
      orbit.x = 0;
      orbit.y = 0;
      return out;
    },
    /** Mouse wheel steps since the last poll (+1 = throttle up). */
    takeWheel() {
      const out = wheel;
      wheel = 0;
      return out;
    },
  };
}
