import { clamp } from './math.js';

/**
 * Tiny WebAudio synth — no asset files. The context is created lazily on the
 * first user gesture, which is also what browser autoplay policy requires.
 */
export function createAudio() {
  let ctx = null;
  let master = null;
  let windGain = null;
  let windFilter = null;
  let muted = false;

  function noiseBuffer(seconds = 2) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(ctx.destination);

    // Continuous filtered-noise wind bed.
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    src.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 420;
    windFilter.Q.value = 0.7;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    src.connect(windFilter).connect(windGain).connect(master);
    src.start();
    return true;
  }

  function envTone({ freq, endFreq = freq, dur = 0.16, gain = 0.2, type = 'sine' }) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function burst({ dur = 0.35, gain = 0.3, freq = 300, type = 'lowpass' }) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur + 0.05);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.25), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  return {
    unlock: ensure,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.85;
      return muted;
    },
    /** Rising chime as a beam is eaten; `ratio` is how far up the beam we are. */
    absorb(ratio) {
      const scale = [0, 2, 4, 7, 9, 11, 14, 16];
      const step = scale[Math.min(scale.length - 1, Math.floor(ratio * scale.length))];
      envTone({ freq: 392 * Math.pow(2, step / 12), endFreq: 392 * Math.pow(2, (step + 3) / 12), dur: 0.11, gain: 0.055, type: 'triangle' });
    },
    detach() { burst({ dur: 0.5, gain: 0.16, freq: 900 }); },
    enterBeam() { envTone({ freq: 220, endFreq: 660, dur: 0.3, gain: 0.09, type: 'sine' }); },
    crash() {
      burst({ dur: 0.7, gain: 0.34, freq: 260 });
      envTone({ freq: 150, endFreq: 48, dur: 0.6, gain: 0.16, type: 'sawtooth' });
    },
    /** Called every frame — maps airspeed onto the wind bed. */
    updateWind(speed) {
      if (!ctx || !windGain) return;
      const target = muted ? 0 : clamp(speed / 900, 0, 1) * 0.16;
      windGain.gain.setTargetAtTime(target, ctx.currentTime, 0.2);
      windFilter.frequency.setTargetAtTime(320 + clamp(speed, 0, 1200) * 0.55, ctx.currentTime, 0.25);
    },
    silenceWind() {
      if (ctx && windGain) windGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    },
  };
}
