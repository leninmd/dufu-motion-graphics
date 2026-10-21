/**
 * instruments.js — synthesized voices for the score.
 * No samples, no external audio. Each call schedules Web Audio nodes at an
 * absolute film time (seconds). Instruments are deliberately idiomatic:
 * guqin/pipa use plucked strings, bianzhong and gongs use inharmonic partials,
 * dizi/xiao use filtered oscillator + breath noise, and modern synths are
 * built from simple oscillator graphs.
 */
import { noiseBuffer, pluckBuffer, adsr, panned, gain, filter, mtof, sweep } from './dsp.js';

const osc = (ctx, type, f, t, stop) => {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.start(t);
  o.stop(stop);
  return o;
};

function dest(ctx, out, pan) { return panned(ctx, out, pan); }

/* ------------------------------------------------------------- plucked strings */
/** Guqin / pipa / harp / piano-ish pluck. opts: {dur, vel, pan, bright, decay, slideFrom, vibrato, click} */
export function pluck(ctx, out, t, midi, dur = 2.5, vel = 0.8, opts = {}) {
  const f = mtof(midi + (opts.octave ?? 0) * 12);
  const bright = opts.bright ?? 0.55;
  const buf = pluckBuffer(ctx, f, {
    dur: Math.min(7, dur + (opts.ring ?? 1.8)),
    decay: opts.decay ?? 2.8,
    bright,
    damp: opts.damp ?? 0.48,
    buzz: opts.buzz ?? 0,
    seed: opts.seed ?? midi,
  });
  const src = ctx.createBufferSource();
  src.buffer = buf;
  if (opts.slideFrom != null) {
    src.playbackRate.setValueAtTime(Math.pow(2, (opts.slideFrom - midi) / 12), t);
    src.playbackRate.exponentialRampToValueAtTime(1, t + (opts.slideTime ?? 0.12));
  }
  if (opts.vibrato) {
    const lfo = osc(ctx, 'sine', opts.vibratoRate ?? 5.4, t, t + dur + 1);
    const lg = gain(ctx, opts.vibrato);
    lfo.connect(lg).connect(src.playbackRate);
  }
  const g = gain(ctx, 0);
  const end = t + Math.min(buf.duration, dur + 1.4);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * (opts.level ?? 0.2), t + 0.004);
  g.gain.setValueAtTime(vel * (opts.level ?? 0.2), Math.max(t + 0.005, end - 0.08));
  g.gain.linearRampToValueAtTime(0, end);
  let node = src;
  if (opts.body) {
    const b = filter(ctx, 'peaking', opts.body, 1.4);
    b.gain.value = opts.bodyGain ?? 4;
    node.connect(b); node = b;
  }
  if (opts.lowpass) {
    const l = filter(ctx, 'lowpass', opts.lowpass, 0.55);
    node.connect(l); node = l;
  }
  node.connect(g).connect(dest(ctx, out, opts.pan ?? 0));
  src.start(t);
  src.stop(end + 0.05);
  if (opts.click) {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer(ctx, 0.12, (opts.seed ?? midi) + 3);
    const bp = filter(ctx, 'bandpass', opts.clickFreq ?? 2600, 1.4);
    const cg = gain(ctx, 0);
    cg.gain.setValueAtTime(opts.click * vel, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.026);
    n.connect(bp).connect(cg).connect(dest(ctx, out, opts.pan ?? 0));
    n.start(t); n.stop(t + 0.04);
  }
  return end;
}

/* --------------------------------------------------------------- struck metals */
/** Inharmonic bronze bell / bianzhong / gong. */
export function bell(ctx, out, t, midi, dur = 4, vel = 0.7, opts = {}) {
  const f = mtof(midi + (opts.octave ?? 0) * 12);
  const destNode = dest(ctx, out, opts.pan ?? 0);
  const parts = opts.partials || [
    [0.5, 0.2, 1.8], [1, 1, 2.6], [1.19, 0.4, 2.1], [1.57, 0.3, 1.4],
    [2.03, 0.25, 1.1], [2.74, 0.16, 0.8], [3.81, 0.09, 0.55],
  ];
  let end = t;
  for (let k = 0; k < parts.length; k++) {
    const [ratio, amp, dec] = parts[k];
    const D = dec * (opts.decayScale ?? 1) * Math.max(0.4, dur / 3);
    const o = osc(ctx, 'sine', f * ratio, t, t + D + 0.1);
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp * vel * (opts.level ?? 0.16), t + 0.003 + k * 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + D);
    o.connect(g).connect(destNode);
    end = Math.max(end, t + D);
    if (opts.beat) {
      const o2 = osc(ctx, 'sine', f * ratio + opts.beat, t, t + D + 0.1);
      const g2 = gain(ctx, amp * vel * 0.08);
      o2.connect(g2).connect(destNode);
    }
  }
  if (opts.strike) {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer(ctx, 0.2, (opts.seed ?? midi) + 9);
    const bp = filter(ctx, 'bandpass', f * (opts.strikeRatio ?? 3), 2);
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(opts.strike * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    n.connect(bp).connect(g).connect(destNode);
    n.start(t); n.stop(t + 0.06);
  }
  return end;
}

/** Bright bowl / crystal chime. */
export function crystal(ctx, out, t, midi, dur = 3, vel = 0.5, opts = {}) {
  return bell(ctx, out, t, midi, dur, vel, {
    partials: [[1, 1, 2.2], [2.76, 0.38, 1.4], [5.4, 0.2, 0.7], [8.93, 0.08, 0.4]],
    level: opts.level ?? 0.12, strike: 0.1, pan: opts.pan ?? 0,
  });
}

/* ------------------------------------------------------------------ wood / skin */
/** Taiko / genggu / heartbeat thump. */
export function taiko(ctx, out, t, vel = 0.8, opts = {}) {
  const dur = opts.dur ?? 1.6;
  const f0 = opts.f0 ?? 72;
  const stop = t + dur + 0.2;
  const o = osc(ctx, 'sine', f0, t, stop);
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(28, f0 * 0.5), t + dur * 0.5);
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * (opts.level ?? 0.6), t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const d = dest(ctx, out, opts.pan ?? 0);
  o.connect(g).connect(d);
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(ctx, 0.35, (opts.seed ?? 7) + 2);
  const lp = filter(ctx, 'lowpass', opts.noiseLP ?? 2200, 0.8);
  const ng = gain(ctx, 0);
  ng.gain.setValueAtTime(vel * 0.5, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  n.connect(lp).connect(ng).connect(d);
  n.start(t); n.stop(t + 0.16);
  return t + dur;
}

/** Wooden clapper / ledger tick. */
export function woodblock(ctx, out, t, vel = 0.4, opts = {}) {
  const d = dest(ctx, out, opts.pan ?? 0);
  for (const [freq, amp, dec] of [[1180, 0.7, 0.035], [1710, 0.18, 0.025], [2400, 0.1, 0.018]]) {
    const o = osc(ctx, 'sine', freq, t, t + dec + 0.06);
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(vel * amp * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(g).connect(d);
  }
  return t + 0.08;
}

/* ----------------------------------------------------------------------- winds */
/** Dizi / xiao / shakuhachi-like tone. opts: {type, breath, vibrato, membrane, level, pan} */
export function wind(ctx, out, t, midi, dur = 1.3, vel = 0.7, opts = {}) {
  const f = mtof(midi + (opts.octave ?? 0) * 12);
  const d = dest(ctx, out, opts.pan ?? 0);
  const stop = t + dur + (opts.release ?? 0.22) * 4 + 0.15;
  const tone = osc(ctx, opts.type ?? 'sine', f, t, stop);
  if (opts.slideFrom != null) {
    tone.frequency.setValueAtTime(mtof(opts.slideFrom + (opts.octave ?? 0) * 12), t);
    tone.frequency.exponentialRampToValueAtTime(f, t + (opts.slideTime ?? 0.18));
  }
  const vib = osc(ctx, 'sine', opts.vibratoRate ?? 5.1, t, stop);
  const vg = gain(ctx, 0);
  vg.gain.setValueAtTime(0, t);
  vg.gain.linearRampToValueAtTime(f * (opts.vibrato ?? 0.0055), t + Math.min(0.5, dur * 0.7));
  vib.connect(vg).connect(tone.frequency);
  const g = gain(ctx, 0);
  const end = adsr(g.gain, t, dur, {
    a: opts.attack ?? 0.04, d: 0.12, s: 0.82, r: opts.release ?? 0.22, peak: vel * (opts.level ?? 0.18),
  });
  tone.connect(g).connect(d);
  if (opts.octaveDouble) {
    const o2 = osc(ctx, 'sine', f * 2, t, stop);
    const g2 = gain(ctx, vel * 0.035);
    o2.connect(g2).connect(g);
  }
  // breath
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(ctx, 4, (opts.seed ?? midi) + 11);
  n.loop = true;
  const bp = filter(ctx, 'bandpass', f * 2.1, opts.breathQ ?? 1.6);
  const ng = gain(ctx, 0);
  adsr(ng.gain, t, dur, { a: opts.attack ?? 0.03, d: 0.1, s: 0.55, r: 0.16, peak: vel * (opts.breath ?? 0.05) });
  n.connect(bp).connect(ng).connect(d);
  n.start(t, (midi * 0.137) % 3); n.stop(stop);
  // dizi membrane buzz
  if (opts.membrane) {
    const m = ctx.createBufferSource();
    m.buffer = noiseBuffer(ctx, 3, (opts.seed ?? midi) + 12);
    m.loop = true;
    const mb = filter(ctx, 'bandpass', f * 4.2, 5);
    const mg = gain(ctx, 0);
    adsr(mg.gain, t, dur, { a: 0.04, d: 0.1, s: 0.45, r: 0.1, peak: vel * opts.membrane });
    m.connect(mb).connect(mg).connect(d);
    m.start(t); m.stop(stop);
  }
  return end;
}

/* --------------------------------------------------------------------- strings */
/** Cello / string drone. opts: {attack, release, level, pan, lowpass, detune, vibrato} */
export function strings(ctx, out, t, midi, dur = 3, vel = 0.6, opts = {}) {
  const f = mtof(midi + (opts.octave ?? 0) * 12);
  const d = dest(ctx, out, opts.pan ?? 0);
  const lp = filter(ctx, 'lowpass', opts.lowpass ?? 1800, 0.55);
  const g = gain(ctx, 0);
  adsr(g.gain, t, dur, {
    a: opts.attack ?? 0.25, d: 0.18, s: 0.82, r: opts.release ?? 0.4, peak: vel * (opts.level ?? 0.055),
  });
  const stop = t + dur + (opts.release ?? 0.4) * 2.5 + 0.1;
  for (const det of opts.detune ?? [-7, 0, 7]) {
    const o = osc(ctx, opts.type ?? 'sawtooth', f, t, stop);
    o.detune.value = det;
    o.connect(lp);
  }
  lp.connect(g).connect(d);
  if (opts.vibrato) {
    const lfo = osc(ctx, 'sine', 4.4, t, stop);
    const lg = gain(ctx, f * 0.0035);
    lfo.connect(lg).connect(lp.frequency);
  }
  return t + dur + 0.4;
}

/* ------------------------------------------------------------------ low / noise */
export function subDrop(ctx, out, t, vel = 0.7, opts = {}) {
  const f0 = opts.f0 ?? 60;
  const dur = opts.dur ?? 1.4;
  const o = osc(ctx, 'sine', f0, t, t + dur + 0.1);
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(22, f0 * 0.28), t + dur * 0.8);
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * (opts.level ?? 0.4), t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest(ctx, out, opts.pan ?? 0));
  return t + dur;
}

export function impact(ctx, out, t, vel = 1, opts = {}) {
  const d = dest(ctx, out, opts.pan ?? 0);
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(ctx, 0.8, (opts.seed ?? 1) + 4);
  const bp = filter(ctx, 'bandpass', opts.freq ?? 180, opts.q ?? 0.5);
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(vel * 0.6, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (opts.decay ?? 0.35));
  n.connect(bp).connect(g).connect(d);
  n.start(t); n.stop(t + 0.5);
  subDrop(ctx, out, t, vel, { f0: opts.subF0 ?? 58, dur: opts.subDur ?? 1.2, level: 0.35, pan: opts.pan ?? 0 });
  return t + 1;
}

export function noiseSwell(ctx, out, t, dur, vel = 0.2, opts = {}) {
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(ctx, Math.max(2, dur + 1), (opts.seed ?? 3) + 5);
  n.loop = true;
  const bp = filter(ctx, 'bandpass', opts.mid ?? 900, opts.q ?? 0.6);
  const g = gain(ctx, 0);
  const a = opts.attack ?? Math.min(dur * 0.5, 1.2);
  const r = opts.release ?? Math.min(dur * 0.5, 1.4);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel, t + a);
  g.gain.setValueAtTime(vel, t + Math.max(a, dur - r));
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  n.connect(bp).connect(g).connect(dest(ctx, out, opts.pan ?? 0));
  n.start(t); n.stop(t + dur + 0.1);
  return t + dur;
}

/* ------------------------------------------------------------------ synths / UI */
export function chiptune(ctx, out, t, midi, dur = 0.2, vel = 0.4, opts = {}) {
  const f = mtof(midi);
  const d = dest(ctx, out, opts.pan ?? 0);
  const o = osc(ctx, opts.type ?? 'square', f, t, t + dur + 0.08);
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * (opts.level ?? 0.18), t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.025, dur));
  o.connect(g).connect(d);
  if (opts.vibrato) {
    const lfo = osc(ctx, 'sine', 7, t, t + dur + 0.1);
    const lg = gain(ctx, f * 0.006);
    lfo.connect(lg).connect(o.frequency);
  }
  return t + dur;
}

export function noiseTick(ctx, out, t, vel = 0.25, opts = {}) {
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(ctx, 0.08, (opts.seed ?? 1) + 8);
  const bp = filter(ctx, 'bandpass', opts.freq ?? 2800, opts.q ?? 2.2);
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(vel, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (opts.decay ?? 0.018));
  n.connect(bp).connect(g).connect(dest(ctx, out, opts.pan ?? 0));
  n.start(t); n.stop(t + 0.03);
}

/** FM-ish popup / MIDI notification ding. */
export function popup(ctx, out, t, midi = 84, vel = 0.35, opts = {}) {
  crystal(ctx, out, t, midi, 1.4, vel * 0.6, { pan: opts.pan ?? 0 });
  pluck(ctx, out, t + 0.02, midi + 7, 1.2, vel * 0.4, { bright: 0.8, pan: (opts.pan ?? 0) + 0.15, decay: 2 });
}

export function piano(ctx, out, t, midi, dur = 2.2, vel = 0.4, opts = {}) {
  const f = mtof(midi + (opts.octave ?? 0) * 12);
  const d = dest(ctx, out, opts.pan ?? 0);
  const stop = t + dur + 1.2;
  const parts = [[1, 1], [2, 0.5], [3, 0.25], [4, 0.13], [5, 0.07], [6, 0.035]];
  for (const [k, a] of parts) {
    const fr = f * k * Math.sqrt(1 + 0.0004 * k * k);
    if (fr > 12000) continue;
    const o = osc(ctx, 'sine', fr, t, stop);
    const g = gain(ctx, 0);
    const dec = (opts.decay ?? 2.8) / Math.sqrt(k);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a * vel * (opts.level ?? 0.1), t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dec * 2.6);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.1);
    o.connect(g).connect(d);
  }
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(ctx, 0.1, (opts.seed ?? midi) + 10);
  const ng = gain(ctx, 0);
  ng.gain.setValueAtTime(vel * 0.035, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  n.connect(ng).connect(d);
  n.start(t); n.stop(t + 0.05);
  return t + dur;
}

export function pad(ctx, out, t, midi, dur = 4, vel = 0.3, opts = {}) {
  const f = mtof(midi + (opts.octave ?? 0) * 12);
  const d = dest(ctx, out, opts.pan ?? 0);
  const lp = filter(ctx, 'lowpass', opts.lowpass ?? 1200, 0.7);
  const g = gain(ctx, 0);
  const stop = t + dur + 1.4;
  for (const det of [-5, 4, 11]) {
    const o = osc(ctx, 'sawtooth', f, t, stop);
    o.detune.value = det;
    o.connect(lp);
  }
  lp.connect(g).connect(d);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * 0.05, t + (opts.attack ?? 0.7));
  g.gain.setValueAtTime(vel * 0.05, t + Math.max(0.8, dur - 0.6));
  g.gain.linearRampToValueAtTime(0, t + dur + 0.5);
  return t + dur;
}

/* ---------------------------------------------------------------------- water */
export function water(ctx, out, t, dur = 3, vel = 0.18, opts = {}) {
  const d = dest(ctx, out, opts.pan ?? 0);
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(ctx, Math.max(2, dur + 1), (opts.seed ?? 4) + 13);
  n.loop = true;
  const lp = filter(ctx, 'lowpass', 900, 0.5);
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel, t + 0.6);
  g.gain.setValueAtTime(vel, t + Math.max(0.8, dur - 0.5));
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  const lfo = osc(ctx, 'sine', 0.23, t, t + dur + 0.2);
  const lg = gain(ctx, 0.45);
  lfo.connect(lg).connect(lp.frequency);
  n.connect(lp).connect(g).connect(d);
  n.start(t); n.stop(t + dur + 0.1);
  // a low, slow "river" body
  subDrop(ctx, out, t, 0.14, { f0: 44, dur: dur * 0.9, level: 0.15, pan: (opts.pan ?? 0) * 0.4 });
  return t + dur;
}

export function oar(ctx, out, t, vel = 0.3, opts = {}) {
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(ctx, 1.2, (opts.seed ?? 3) + 14);
  const bp = filter(ctx, 'bandpass', 420, 0.6);
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  n.connect(bp).connect(g).connect(dest(ctx, out, opts.pan ?? 0));
  n.start(t); n.stop(t + 1.0);
  return t + 1;
}

/* ------------------------------------------------------------------- electrical */
export function beep(ctx, out, t, freq = 720, dur = 0.18, vel = 0.15, opts = {}) {
  const d = dest(ctx, out, opts.pan ?? 0);
  const o = osc(ctx, opts.type ?? 'sine', freq, t, t + dur + 0.05);
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(vel, t);
  g.gain.setValueAtTime(vel, t + dur * 0.8);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(d);
  return t + dur;
}

export function hum(ctx, out, t, dur = 3, vel = 0.035, opts = {}) {
  const d = dest(ctx, out, opts.pan ?? 0);
  for (const [freq, amp] of [[60, 1], [120, 0.35], [180, 0.12]]) {
    const o = osc(ctx, 'sine', freq, t, t + dur + 0.1);
    const g = gain(ctx, vel * amp);
    o.connect(g).connect(d);
  }
  return t + dur;
}

export function heartbeat(ctx, out, t, vel = 0.5, opts = {}) {
  taiko(ctx, out, t, vel, { f0: 64, dur: 0.5, level: 0.35, pan: opts.pan ?? 0, seed: 91 });
  taiko(ctx, out, t + 0.17, vel * 0.65, { f0: 52, dur: 0.55, level: 0.28, pan: opts.pan ?? 0, seed: 92 });
  return t + 0.8;
}
