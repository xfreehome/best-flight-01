// AeroRidge — sound, synthesised live with WebAudio: an engine hum that
// follows the throttle, wind that follows the speed, a chime for a ring,
// a thud for a landing and a crunch for a crash. No audio files, no network.
// Everything no-ops until the player first interacts (the browser's rule).

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let windGain = null;
  let windSource = null;
  let muted = false;
  let started = false;

  /** Start the audio graph. Call from the first key press or click. */
  function resume() {
    if (started) {
      if (ctx && ctx.state === 'suspended') void ctx.resume();
      return;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      ctx = new AudioContext();
      started = true;
    } catch {
      return;
    }
    // Engine: two detuned saws through a lowpass, gain by throttle.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'sawtooth';
    engineOsc2.frequency.value = 82;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(filter);
    engineOsc2.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();
    engineOsc2.start();
    // Wind: looped noise through a bandpass, gain by airspeed.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    windSource = ctx.createBufferSource();
    windSource.buffer = buffer;
    windSource.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 700;
    band.Q.value = 0.6;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSource.connect(band);
    band.connect(windGain);
    windGain.connect(ctx.destination);
    windSource.start();
  }

  /** Follow the throttle and the airspeed, every frame. */
  function setEngine(throttle, speed) {
    if (!ctx || !started || muted) return;
    const t = ctx.currentTime;
    engineGain.gain.setTargetAtTime(throttle * 0.05, t, 0.1);
    engineOsc.frequency.setTargetAtTime(48 + throttle * 70, t, 0.1);
    engineOsc2.frequency.setTargetAtTime(72 + throttle * 105, t, 0.1);
    windGain.gain.setTargetAtTime(Math.min(0.06, (speed / 62) * 0.06), t, 0.2);
  }

  /** A short two-note chime, for flying a ring. */
  function ring() {
    if (!ctx || !started || muted) return;
    const t = ctx.currentTime;
    for (const [freq, when] of [[880, 0], [1318, 0.09]]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t + when);
      gain.gain.exponentialRampToValueAtTime(0.12, t + when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + when + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + when);
      osc.stop(t + when + 0.55);
    }
  }

  /** A soft thud, for a landing. */
  function land() {
    if (!ctx || !started || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  /** A noise crunch, for a crash. */
  function crash() {
    if (!ctx || !started || muted) return;
    const t = ctx.currentTime;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(t);
  }

  function toggleMute() {
    muted = !muted;
    if (ctx && started) {
      const t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(muted ? 0 : 0.02, t, 0.05);
      windGain.gain.setTargetAtTime(0, t, 0.05);
    }
    return muted;
  }

  return { resume, setEngine, ring, land, crash, toggleMute, get muted() { return muted; } };
}
