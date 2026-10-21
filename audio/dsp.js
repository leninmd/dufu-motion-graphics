/**
 * dsp.js — deterministic synthesis helpers for Web Audio.
 *
 * Every buffer is generated from a seeded PRNG. Plucked strings use a
 * Karplus–Strong loop with a fractional delay; the room/hall impulse responses
 * are stereo decaying noise with a progressive high-frequency roll-off.
 *
 * The algorithm family is standard published DSP (Karplus–Strong, Schroeder
 * reverberation). The code here is original for this film.
 */
import { hash, mulberry32 } from '../src/kit/math.js';

export const SR = 48000;
export const mtof = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
export const db = (v) => Math.pow(10, v / 20);

const bufferCache = new Map();
function cache(ctx, key, make) {
  const k = `${ctx.sampleRate}:${key}`;
  if (bufferCache.has(k)) return bufferCache.get(k);
  const b = make();
  bufferCache.set(k, b);
  return b;
}

/** Mono white noise. */
export function noiseBuffer(ctx, seconds = 2, seed = 1) {
  return cache(ctx, `noise:${seconds}:${seed}`, () => {
    const n = Math.ceil(seconds * ctx.sampleRate);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    const r = mulberry32(hash('noise', seed));
    let last = 0;
    for (let i = 0; i < n; i++) {
      // slight low-pass on the noise, still broad
      const w = r() * 2 - 1;
      last = last * 0.2 + w * 0.8;
      d[i] = last;
    }
    return b;
  });
}

/**
 * Karplus–Strong plucked string.
 * opts: { dur, decay, bright, damp, buzz, seed }
 */
export function pluckBuffer(ctx, freq, opts = {}) {
  const sr = ctx.sampleRate;
  const dur = opts.dur ?? 3.4;
  const decay = opts.decay ?? 2.4;
  const bright = opts.bright ?? 0.62;
  const damp = opts.damp ?? 0.46;
  const buzz = opts.buzz ?? 0;
  const seed = opts.seed ?? 1;
  const key = `pluck:${freq.toFixed(3)}:${dur}:${decay}:${bright}:${damp}:${buzz}:${seed}`;
  return cache(ctx, key, () => {
    const n = Math.ceil(dur * sr);
    const b = ctx.createBuffer(1, n, sr);
    const out = b.getChannelData(0);
    const r = mulberry32(hash('ks', freq, seed));
    const P = sr / freq;
    const N = Math.max(2, Math.floor(P - 0.5));
    const frac = P - N - 0.5;
    const ap = (1 - frac) / (1 + frac);
    const line = new Float32Array(N + 2);
    let lp = 0;
    for (let i = 0; i < line.length; i++) {
      const w = r() * 2 - 1;
      lp += (w - lp) * (0.12 + 0.88 * bright);
      line[i] = lp;
    }
    // loop gain for a −60 dB decay time
    const g = Math.pow(10, -3 / (decay * freq));
    let idx = 0, prev = 0, apX = 0, apY = 0;
    for (let i = 0; i < n; i++) {
      const cur = line[idx];
      out[i] = cur;
      const lp2 = (1 - damp * 0.5) * cur + damp * 0.5 * prev;
      let y = g * lp2;
      const yy = ap * y + apX - ap * apY;
      apX = y; apY = yy;
      let v = yy;
      if (buzz > 0) {
        const a = Math.abs(v), thr = 0.13;
        if (a > thr) v = Math.sign(v) * (thr + (a - thr) * (1 - 0.6 * buzz));
      }
      prev = cur;
      line[idx] = v;
      idx = (idx + 1) % line.length;
    }
    let peak = 0;
    const head = Math.min(n, sr * 0.12);
    for (let i = 0; i < head; i++) peak = Math.max(peak, Math.abs(out[i]));
    if (peak > 0) {
      const norm = 0.9 / peak;
      for (let i = 0; i < n; i++) out[i] *= norm;
    }
    return b;
  });
}

/** Stereo reverb impulse. */
export function reverbIR(ctx, seconds = 3.2, opts = {}) {
  return cache(ctx, `ir:${seconds}:${opts.damp}:${opts.pre}:${opts.seed}`, () => {
    const sr = ctx.sampleRate;
    const n = Math.ceil(seconds * sr);
    const pre = Math.floor((opts.pre ?? 0.012) * sr);
    const b = ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      const r = mulberry32(hash('ir', seconds, ch, opts.seed ?? 0));
      let lp = 0;
      for (let i = pre; i < n; i++) {
        const k = (i - pre) / Math.max(1, n - pre);
        const env = Math.pow(1 - k, 2.15) * Math.exp(-k * 3.1);
        const a = 0.62 - 0.48 * k * (opts.damp ?? 0.62);
        lp += ((r() * 2 - 1) - lp) * a;
        d[i] = lp * env;
      }
      // fade in / out to avoid clicks
      for (let i = 0; i < Math.min(pre + 80, n); i++) d[i] *= i / Math.min(pre + 80, n);
    }
    return b;
  });
}

/** Schedule an ADSR envelope. Returns the voice end time. */
export function adsr(param, t, dur, { a = 0.01, d = 0.12, s = 0.65, r = 0.3, peak = 1 } = {}) {
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(peak, t + Math.max(0.002, a));
  param.setTargetAtTime(peak * s, t + a, Math.max(0.02, d) / 3);
  const off = t + Math.max(dur, a + 0.02);
  param.setTargetAtTime(0.0001, off, Math.max(0.02, r) / 3);
  return off + r * 2.2;
}

/** Equal-power stereo placement. */
export function panned(ctx, out, pan = 0) {
  if (!pan) return out;
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(out);
  return p;
}

export function gain(ctx, v = 0) {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}

export function filter(ctx, type, freq, q = 0.7) {
  const b = ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = freq;
  b.Q.value = q;
  return b;
}

/**
 * Master bus: input → dry + room/hall sends → bus compressor → limiter → out.
 * Returns the send inputs plus a weather filter bus for the bullet-time scene.
 */
export function makeBus(ctx) {
  const input = gain(ctx, 1);
  const dry = gain(ctx, 1);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -17;
  comp.knee.value = 10;
  comp.ratio.value = 3;
  comp.attack.value = 0.01;
  comp.release.value = 0.22;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -2.2;
  lim.knee.value = 0;
  lim.ratio.value = 20;
  lim.attack.value = 0.0015;
  lim.release.value = 0.07;
  const out = gain(ctx, 0.9);
  input.connect(dry).connect(comp);
  const mkVerb = (seconds, damp, seed, retLevel) => {
    const send = gain(ctx, 1);
    const cv = ctx.createConvolver();
    cv.normalize = true;
    cv.buffer = reverbIR(ctx, seconds, { damp, seed });
    const ret = gain(ctx, retLevel);
    send.connect(cv).connect(ret).connect(comp);
    return send;
  };
  const room = mkVerb(1.25, 0.48, 1, 0.28);
  const hall = mkVerb(3.4, 0.68, 2, 0.34);
  input.connect(room);
  input.connect(hall);
  comp.connect(lim).connect(out).connect(ctx.destination);
  // A separate weather path lets the film cut wind/rain highs at the 0.012×
  // bullet-time beat without touching the music.
  const weather = gain(ctx, 1);
  const weatherLP = filter(ctx, 'lowpass', 9000, 0.45);
  weather.connect(weatherLP).connect(comp);
  return { input, room, hall, comp, out, weather, weatherLP };
}

/** Schedule a filter sweep, robust across implementations. */
export function sweep(param, t, from, to, seconds = 0.2) {
  param.setValueAtTime(from, t);
  param.exponentialRampToValueAtTime(Math.max(20, to), t + Math.max(0.01, seconds));
}

/** Deterministic 16-bit PCM WAV. */
export function wavBytes(buffer) {
  const ch = buffer.numberOfChannels;
  const n = buffer.length;
  const sr = buffer.sampleRate;
  const bytes = 44 + n * ch * 2;
  const v = new DataView(new ArrayBuffer(bytes));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, bytes - 8, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * ch * 2, true);
  const data = [];
  for (let c = 0; c < ch; c++) data.push(buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      let s = data[c][i];
      s = Math.max(-1, Math.min(1, s));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return new Uint8Array(v.buffer);
}

/** Analyze a rendered buffer: peak / RMS in dBFS (deterministic). */
export function analyse(buffer) {
  let peak = 0, sum = 0, n = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i += 3) {
      const a = Math.abs(d[i]);
      if (a > peak) peak = a;
      sum += d[i] * d[i];
      n++;
    }
  }
  return {
    peak: +peak.toFixed(4),
    peakDb: +(20 * Math.log10(Math.max(1e-9, peak))).toFixed(2),
    rmsDb: +(10 * Math.log10(Math.max(1e-9, sum / Math.max(1, n)))).toFixed(2),
  };
}
