/**
 * score.js — the 138-second original score, synthesized entirely with Web Audio.
 *
 * One pentatonic leitmotif (A4 C5 D5 E5 G5 E5 D5 C5 A4) is re-orchestrated for
 * each era. The soundtrack is scheduled from the same 120 BPM grid as the
 * picture: every scene crossing is a bar line, every spectacle is a downbeat.
 *
 * No samples, no TTS, no external recordings.
 */
import { SR, mtof, makeBus, gain, filter, sweep, panned, wavBytes, analyse } from './dsp.js';
import {
  pluck, bell, crystal, taiko, woodblock, wind, strings, subDrop, impact, noiseSwell,
  chiptune, noiseTick, popup, piano, pad, water, oar, beep, hum, heartbeat,
} from './instruments.js';

export const DURATION = 138;
export const BPM = 120;
export const BAR = 2;
export const SCENE_DUR = 6;
export const INTRO = 6;
export const OUTRO_START = 114;

const MOTIF_A = [69, 72, 74, 76, 79, 76, 74, 72, 69];
const MOTIF_BRIGHT = [72, 74, 76, 79, 81, 79, 76, 74, 72];
const MOTIF_LOW = [57, 60, 62, 64, 67, 64, 62, 60, 57];
const PENTA = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
const A2 = 45, F2 = 41, C3 = 48, G2 = 43, D3 = 50, E3 = 52;
const sceneStart = (i) => INTRO + i * SCENE_DUR;

function chord(ctx, out, midis, t, dur, vel = 0.22, pan = 0, opts = {}) {
  midis.forEach((m, i) => pad(ctx, out, t, m, dur, vel, { pan: pan + (i - 1) * 0.12, lowpass: 1100, attack: 0.6, ...opts }));
}

function bass(ctx, out, midi, t, dur, vel = 0.32, pan = 0) {
  strings(ctx, out, t, midi, dur, vel, { attack: 0.15, release: 0.5, lowpass: 500, level: 0.065, pan });
}

function motif(ctx, out, t, voice, notes, opts = {}) {
  const step = opts.step ?? 0.25;
  const dur = opts.dur ?? 0.38;
  const vel = opts.vel ?? 0.32;
  for (let i = 0; i < notes.length; i++) {
    voice(ctx, out, t + i * step, notes[i] + (opts.transpose ?? 0), dur, vel * (opts.decay ?? 1 + i * 0.015), {
      pan: opts.pan ?? 0,
      bright: opts.bright,
      decay: opts.decayPluck,
      level: opts.level,
      body: opts.body,
      seed: 700 + i,
    });
  }
}

function arpeggio(ctx, out, t, voice, notes, step = 0.125, opts = {}) {
  for (let i = 0; i < notes.length; i++) {
    voice(ctx, out, t + i * step, notes[i], opts.dur ?? 0.15, opts.vel ?? 0.18, {
      pan: opts.pan ?? ((i % 2 ? 0.25 : -0.25)),
      bright: opts.bright ?? 0.7,
      seed: 500 + i,
    });
  }
}

function stamp(ctx, out, t, strength = 1, opts = {}) {
  taiko(ctx, out, t, 0.55 * strength, { f0: 58, dur: 1.6, level: 0.3, pan: 0, seed: 91 });
  subDrop(ctx, out, t, 0.45 * strength, { f0: 52, dur: 1.2, level: 0.22, pan: 0 });
  bell(ctx, out, t + 0.02, 45, 5, 0.28 * strength, { pan: -0.1, level: 0.14, strike: 0.2, seed: 44 });
  if (opts.crystal) crystal(ctx, out, t + 0.12, opts.crystal, 2.6, 0.18, { pan: 0.22 });
}

function riser(ctx, out, t, level = 0.12) {
  noiseSwell(ctx, out, t, 0.5, level, { mid: 1800, q: 0.9, attack: 0.36, release: 0.14, pan: -0.15, seed: 121 });
  noiseSwell(ctx, out, t, 0.5, level * 0.55, { mid: 4200, q: 1.2, attack: 0.4, release: 0.1, pan: 0.2, seed: 122 });
}

/** Pre-render the bright "Tang tape" at 151.2 BPM, four semitones high. */
async function renderTangTape() {
  const sr = SR;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * 8.2), sr);
  const out = gain(ctx, 0.8);
  out.connect(ctx.destination);
  const beat = 60 / 151.2;
  const eighth = beat / 2;
  const bright = [76, 78, 80, 83, 85, 83, 80, 78, 76];
  // bright gong-mode melody in pipa + bianzhong
  for (let rep = 0; rep < 3; rep++) {
    const t0 = 0.15 + rep * eighth * 9;
    for (let i = 0; i < bright.length; i++) {
      pluck(ctx, out, t0 + i * eighth, bright[i], 1.1, 0.38, {
        bright: 0.9, decay: 2.2, pan: -0.15 + (i % 2) * 0.12, click: 0.1, seed: 300 + i,
      });
      if (i % 3 === 0) bell(ctx, out, t0 + i * eighth + 0.02, bright[i] - 12, 2.2, 0.22, { pan: 0.22, level: 0.1, strike: 0.08 });
    }
    // dizi upper octave answer
    for (let i = 0; i < 5; i++) {
      wind(ctx, out, t0 + eighth * (4 + i), bright[i] + 12, eighth * 0.8, 0.24, {
        type: 'sine', breath: 0.05, vibrato: 0.006, membrane: 0.03, pan: 0.25, level: 0.1,
      });
    }
  }
  // light percussion
  for (let t = 0.1; t < 7.7; t += beat) taiko(ctx, out, t, 0.18, { f0: 90, dur: 0.4, level: 0.16, seed: 31 });
  const rendered = await ctx.startRendering();
  // normalize upward only (the tape will be attenuated anyway)
  let peak = 0;
  for (let c = 0; c < 2; c++) {
    const d = rendered.getChannelData(c);
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  }
  if (peak > 0) {
    const g = 0.82 / peak;
    for (let c = 0; c < 2; c++) {
      const d = rendered.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] *= g;
    }
  }
  return rendered;
}

function scheduleTape(ctx, bus, t0, tape) {
  // tape bus: slowing playbackRate, low-pass melt, 0.6 Hz wow
  const tapeGain = gain(ctx, 0);
  const lp = filter(ctx, 'lowpass', 8200, 0.6);
  const hp = filter(ctx, 'highpass', 110, 0.5);
  tapeGain.connect(hp).connect(lp).connect(bus.input);
  tapeGain.gain.setValueAtTime(0, t0);
  tapeGain.gain.linearRampToValueAtTime(0.55, t0 + 0.05);
  tapeGain.gain.setValueAtTime(0.55, t0 + 2.0);
  tapeGain.gain.linearRampToValueAtTime(0.0, t0 + 5.7);
  lp.frequency.setValueAtTime(8600, t0);
  lp.frequency.exponentialRampToValueAtTime(1200, t0 + 2.0);
  lp.frequency.exponentialRampToValueAtTime(520, t0 + 4.8);

  const src = ctx.createBufferSource();
  src.buffer = tape;
  src.loop = true;
  src.playbackRate.setValueAtTime(1.0, t0);
  src.playbackRate.exponentialRampToValueAtTime(0.7937, t0 + 2.0);
  // wow & flutter
  const wow = ctx.createOscillator();
  wow.frequency.value = 0.6;
  const wobble = gain(ctx, 0.018);
  wow.connect(wobble).connect(src.playbackRate);
  src.connect(tapeGain);
  src.start(t0);
  src.stop(t0 + 2.02);
  wow.start(t0); wow.stop(t0 + 2.02);

  // tape hiss / crackle bed
  const hiss = ctx.createBufferSource();
  const hb = ctx.createBuffer(1, Math.ceil(SR * 6), SR);
  let seed = 0x755aa;
  const hd = hb.getChannelData(0);
  for (let i = 0; i < hd.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    hd[i] = ((seed / 4294967296) * 2 - 1) * 0.03;
  }
  hiss.buffer = hb; hiss.loop = true;
  const hg = gain(ctx, 0);
  hg.gain.setValueAtTime(0, t0);
  hg.gain.linearRampToValueAtTime(0.18, t0 + 0.2);
  hg.gain.linearRampToValueAtTime(0, t0 + 5.7);
  hiss.connect(hg).connect(tapeGain);
  hiss.start(t0); hiss.stop(t0 + 5.8);

  // four locked-groove repeats on the 2.0 downbeat
  for (let i = 0; i < 4; i++) {
    const when = t0 + 2.0 + i * 0.25;
    const s = ctx.createBufferSource();
    s.buffer = tape;
    s.playbackRate.value = 0.7937;
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.46, when + 0.008);
    g.gain.setValueAtTime(0.46, when + 0.085);
    g.gain.linearRampToValueAtTime(0.0001, when + 0.14);
    s.connect(g).connect(tapeGain);
    s.start(when, 1.15 + i * 0.012, 0.14);
    s.stop(when + 0.16);
    // needle click
    noiseTick(ctx, bus.input, when, 0.11, { freq: 2800, q: 2.4, decay: 0.012, pan: i % 2 ? 0.2 : -0.2, seed: 500 + i });
  }
  // Keep a low, wounded room tone under the abyss; the final third of this era
  // must not fall into dead air even after the tape has faded.
  strings(ctx, bus.input, t0 + 4.05, 38, 1.9, 0.24, { attack: 0.5, lowpass: 300, level: 0.055, pan: -0.2 });
  crystal(ctx, bus.input, t0 + 4.3, 81, 2.4, 0.1, { pan: 0.25 });
  // resume the badly wounded tape after the skip
  const resume = ctx.createBufferSource();
  resume.buffer = tape;
  resume.loop = true;
  resume.playbackRate.value = 0.7937;
  const rg = gain(ctx, 0);
  rg.gain.setValueAtTime(0, t0 + 2.1);
  rg.gain.linearRampToValueAtTime(0.3, t0 + 3.0);
  rg.gain.linearRampToValueAtTime(0, t0 + 5.4);
  resume.connect(rg).connect(tapeGain);
  resume.start(t0 + 3.05);
  resume.stop(t0 + 5.5);

  // impacts at the cut and at the split
  impact(ctx, bus.input, t0 + 2.0, 0.65, { freq: 150, seed: 71, pan: -0.1 });
  stamp(ctx, bus.input, t0 + 3.0, 0.65);
  taiko(ctx, bus.input, t0 + 3.0, 0.55, { f0: 42, dur: 2.0, seed: 72 });
}

function scheduleIntro(ctx, bus) {
  const t = 0;
  strings(ctx, bus.input, 0.02, 33, 5.85, 0.55, { attack: 1.4, release: 1.3, lowpass: 360, level: 0.085, pan: -0.1 });
  strings(ctx, bus.input, 0.5, 40, 5.2, 0.42, { attack: 1.8, release: 1.4, lowpass: 420, level: 0.055, pan: 0.16 });
  const gq = [45, 48, 50, 53, 57, 60, 64];
  for (let i = 0; i < gq.length; i++) {
    pluck(ctx, bus.input, 0.55 + i * 0.72, gq[i], 3.2, 0.42, {
      bright: 0.45, decay: 4.2, pan: -0.14 + 0.05 * i, level: 0.18, seed: 11 + i,
    });
  }
  // the first stress-test stamp
  stamp(ctx, bus.input, 4.0, 1.0, { crystal: 81 });
  bell(ctx, bus.input, 4.0, 33, 7.0, 0.3, { pan: -0.2, level: 0.12, strike: 0.3 });
  noiseSwell(ctx, bus.input, 5.35, 0.55, 0.12, { mid: 2300, attack: 0.35, release: 0.15, seed: 51 });
  // a single guqin harmonic as the seal cracks
  pluck(ctx, bus.input, 4.55, 72, 2.4, 0.35, { bright: 0.8, decay: 2.6, pan: 0.18, level: 0.13, seed: 33 });
}

function scheduleTang(ctx, bus, i, t0) {
  const t = t0;
  bass(ctx, bus.input, i === 0 ? A2 : i === 1 ? C3 : E3, t, 5.8, 0.3, 0);
  chord(ctx, bus.input, i === 0 ? [57, 60, 64] : i === 1 ? [60, 64, 67] : [59, 62, 67], t, 5.8, 0.11, 0, { lowpass: 1500 });
  // bright bell pattern
  const bellNotes = [69, 72, 76, 81, 76, 72];
  for (let k = 0; k < bellNotes.length; k++) {
    bell(ctx, bus.input, t + 0.08 + k * 0.48, bellNotes[k] - 12, 2.2, 0.18 + (k === 0 ? 0.08 : 0), {
      pan: k % 2 ? 0.22 : -0.18, level: 0.1, strike: 0.12, seed: 120 + k,
    });
  }
  // bar 2: the motif in the bright gong mode
  motif(ctx, bus.input, t + 2.0, (c, o, tt, m, d, v, op) => pluck(c, o, tt, m, d, v, { ...op, bright: 0.72, decay: 2.8, level: 0.12, body: 320, bodyGain: 3 }), MOTIF_BRIGHT, { step: 0.25, dur: 0.42, vel: 0.45, pan: -0.12 });
  motif(ctx, bus.input, t + 2.24, (c, o, tt, m, d, v, op) => wind(c, o, tt, m + 12, d, v, { type: 'sine', breath: 0.04, vibrato: 0.007, membrane: 0.04, pan: 0.2, level: 0.11 }), MOTIF_BRIGHT, { step: 0.5, dur: 0.8, vel: 0.33 });
  // dizi answer in bar 3
  wind(ctx, bus.input, t + 4.3, i === 0 ? 76 : i === 1 ? 79 : 81, 1.1, 0.28, { type: 'sine', breath: 0.05, membrane: 0.05, pan: 0.25, level: 0.12 });
  // light percussion / crossings
  taiko(ctx, bus.input, t, 0.38, { f0: 74, dur: 1.2, level: 0.28, seed: 100 + i });
  taiko(ctx, bus.input, t + 2.0, 0.48, { f0: 64, dur: 1.4, level: 0.32, seed: 110 + i });
  taiko(ctx, bus.input, t + 4.0, 0.3, { f0: 80, dur: 1.0, level: 0.22, seed: 120 + i });
  if (i === 1) arpeggio(ctx, bus.input, t + 0.65, (c, o, tt, m, d, v, op) => pluck(c, o, tt, m, d, v, { ...op, bright: 0.85, decay: 1.4, level: 0.12 }), [76, 79, 81, 84, 81, 79], 0.19, { pan: -0.2 });
  if (i === 2) {
    crystal(ctx, bus.input, t + 2.0, 93, 2.4, 0.25, { pan: 0.26 });
    noiseSwell(ctx, bus.input, t + 1.9, 0.4, 0.08, { mid: 4200, attack: 0.28, release: 0.1, seed: 130 });
    stamp(ctx, bus.input, t + 2.0, 0.45);
  }
  riser(ctx, bus.input, t + 5.55, 0.07);
}

function scheduleCold(ctx, bus, i, t0) {
  const t = t0;
  const lowRoot = i === 0 ? A2 : i === 1 ? F2 : D3;
  bass(ctx, bus.input, lowRoot, t, 5.8, 0.38, 0);
  // gate slam / shatter / fracture depending on era
  if (i === 0) {
    // 04: gate close + edict
    const typeTicks = [0.2, 0.45, 0.7, 0.95, 1.2, 1.45, 1.7];
    typeTicks.forEach((dt, k) => woodblock(ctx, bus.input, t + dt, 0.15, { pan: -0.25 + (k % 3) * 0.2, seed: 200 + k }));
    subDrop(ctx, bus.input, t + 2.0, 1.0, { f0: 48, dur: 1.6, level: 0.4 });
    impact(ctx, bus.input, t + 2.0, 1.0, { freq: 140, decay: 0.45, seed: 201, subF0: 44 });
    bell(ctx, bus.input, t + 2.02, 45, 6.0, 0.3, { pan: -0.2, strike: 0.3, level: 0.13 });
    xiaoMotif(ctx, bus.input, t + 4.05, 0.75, 0.22);
    noiseSwell(ctx, bus.input, t + 5.5, 0.55, 0.08, { mid: 1500, attack: 0.4, release: 0.15, seed: 202 });
  } else if (i === 1) {
    // 05: accounting ticks, rain, vernacular press
    const ticks = 18;
    for (let k = 0; k < ticks; k++) woodblock(ctx, bus.input, t + 0.12 + k * 0.25, 0.11 + (k % 4 === 0 ? 0.04 : 0), { pan: k % 2 ? 0.2 : -0.15, seed: 300 + k });
    noiseSwell(ctx, bus.input, t + 0.2, 5.2, 0.06, { mid: 1900, attack: 0.4, release: 0.8, pan: -0.15, seed: 301 });
    xiaoMotif(ctx, bus.input, t + 2.04, 1.0, 0.28);
    stamp(ctx, bus.input, t + 2.0, 0.35);
    pluck(ctx, bus.input, t + 4.1, 55, 2.8, 0.28, { bright: 0.38, decay: 3.6, pan: 0.12, level: 0.13 });
    riser(ctx, bus.input, t + 5.5, 0.07);
  } else {
    // 06: constructivist pressure, then frozen shards
    strings(ctx, bus.input, t + 0.1, 40, 5.4, 0.4, { attack: 0.4, lowpass: 900, level: 0.07, pan: -0.2 });
    noiseSwell(ctx, bus.input, t + 0.2, 2.1, 0.10, { mid: 700, attack: 1.4, release: 0.5, pan: 0.1, seed: 401 });
    impact(ctx, bus.input, t + 2.0, 0.9, { freq: 210, decay: 0.5, seed: 402, subF0: 46 });
    // ice fracture
    for (let k = 0; k < 9; k++) crystal(ctx, bus.input, t + 2.02 + k * 0.035, 88 + (k % 5) * 3, 1.6, 0.12, { pan: -0.5 + k * 0.12 });
    noiseSwell(ctx, bus.input, t + 2.0, 0.8, 0.17, { mid: 5200, q: 1.4, attack: 0.01, release: 0.5, seed: 403 });
    chord(ctx, bus.input, [45, 48, 52], t + 2.05, 3.4, 0.12, 0, { lowpass: 700 });
    stringMotif(ctx, bus.input, t + 3.2, 0.55, 0.35);
  }
}

function xiaoMotif(ctx, out, t, vel = 0.28, step = 0.32) {
  for (let i = 0; i < MOTIF_LOW.length; i++) {
    wind(ctx, out, t + i * step, MOTIF_LOW[i] + 12, step * 1.3, vel, {
      type: 'sine', breath: 0.09, vibrato: 0.007, membrane: 0, pan: -0.18 + (i % 3) * 0.16, level: 0.17,
    });
  }
}

function stringMotif(ctx, out, t, vel = 0.35, step = 0.38) {
  strings(ctx, out, t, 45, 4.4, vel, { attack: 0.25, lowpass: 520, level: 0.06, pan: -0.1 });
  for (let i = 0; i < MOTIF_LOW.length; i++) {
    pluck(ctx, out, t + i * step, MOTIF_LOW[i] + 12, 1.8, vel * 0.5, { bright: 0.34, decay: 3.2, pan: 0.1 - (i % 2) * 0.2, level: 0.1, seed: 320 + i });
  }
}

function scheduleWoodcut(ctx, bus, t0, tape) {
  scheduleTape(ctx, bus, t0, tape);
  // low gusts and a blade-like strike at the loop
  noiseSwell(ctx, bus.input, t0, 2.0, 0.08, { mid: 520, attack: 1.2, release: 0.3, pan: -0.3, seed: 501 });
  crystal(ctx, bus.input, t0 + 2.0, 96, 1.2, 0.17, { pan: 0.35 });
  crystal(ctx, bus.input, t0 + 3.0, 84, 2.0, 0.13, { pan: -0.3 });
}

function scheduleGoldSpheres(ctx, bus, t0) {
  bass(ctx, bus.input, A2, t0, 5.8, 0.32);
  // the counter and incoming metal
  for (let k = 0; k < 10; k++) {
    noiseTick(ctx, bus.input, t0 + 0.1 + k * 0.11, 0.08 + k * 0.004, { freq: 3200 + k * 130, q: 2.6, pan: k % 2 ? 0.2 : -0.2, seed: 600 + k });
  }
  for (const [dt, pan, pitch] of [[0.2, -0.4, 60], [0.6, 0.35, 64], [1.15, -0.2, 55], [1.55, 0.5, 67], [2.0, 0, 48], [2.2, -0.5, 62], [2.38, 0.45, 57], [2.6, -0.2, 65], [3.0, 0.3, 52], [4.0, 0, 45]]) {
    taiko(ctx, bus.input, t0 + dt, dt === 2.0 ? 0.8 : 0.35, { f0: pitch, dur: 1.3, level: 0.26, pan, seed: 610 + dt * 10 });
    if (dt >= 2.0) crystal(ctx, bus.input, t0 + dt + 0.01, 84 + Math.round(pitch / 6), 1.4, 0.09, { pan: -pan });
  }
  // a small, vulnerable bell motif inside the vault
  motif(ctx, bus.input, t0 + 2.1, (c, o, tt, m, d, v, op) => bell(c, o, tt, m - 12, d, v, { partials: [[1, 1, 1.3], [2.02, 0.3, 0.7], [3.1, 0.12, 0.4]], level: 0.13, pan: op.pan, seed: 620 + m }), MOTIF_A, { step: 0.33, dur: 0.9, vel: 0.3, pan: 0.1 });
  noiseSwell(ctx, bus.input, t0 + 2.0, 2.0, 0.055, { mid: 1300, attack: 0.2, release: 0.8, pan: 0.1, seed: 630 });
  riser(ctx, bus.input, t0 + 5.5, 0.06);
}

function scheduleShadow(ctx, bus, t0) {
  bass(ctx, bus.input, D3, t0, 5.8, 0.42);
  strings(ctx, bus.input, t0 + 0.1, 38, 5.4, 0.32, { attack: 0.8, lowpass: 380, level: 0.07, pan: -0.25 });
  // 10 fps wooden punctuations in bar 1
  for (let k = 0; k < 8; k++) woodblock(ctx, bus.input, t0 + 0.13 + k * 0.2, 0.18, { pan: 0.2 - (k % 2) * 0.4, seed: 700 + k });
  xiaoMotif(ctx, bus.input, t0 + 2.08, 0.55, 0.3);
  // the rod yank: metal scrape + empty wire
  impact(ctx, bus.input, t0 + 2.0, 0.5, { freq: 2600, decay: 0.18, pan: -0.4, seed: 701 });
  noiseTick(ctx, bus.input, t0 + 2.02, 0.22, { freq: 5200, q: 2, decay: 0.1, pan: 0.2 });
  bell(ctx, bus.input, t0 + 2.06, 81, 2.4, 0.18, { pan: 0.35, level: 0.1, strike: 0.15 });
  // a single empty high harmonic
  crystal(ctx, bus.input, t0 + 4.2, 93, 2.6, 0.12, { pan: -0.15 });
  noiseSwell(ctx, bus.input, t0 + 3.6, 2.2, 0.04, { mid: 2400, attack: 0.8, release: 0.8, pan: 0.3, seed: 702 });
  riser(ctx, bus.input, t0 + 5.55, 0.05);
}

function scheduleBullet(ctx, bus, t0) {
  // Weather bus: all wind/rain lives here, so the 300 Hz downbeat can cut the highs.
  const windGain = gain(ctx, 0.5);
  windGain.connect(bus.weather);
  noiseSwell(ctx, windGain, t0, 2.05, 0.4, { mid: 1500, q: 0.5, attack: 0.8, release: 0.1, pan: -0.35, seed: 801 });
  noiseSwell(ctx, windGain, t0, 2.05, 0.25, { mid: 3600, q: 0.7, attack: 0.9, release: 0.1, pan: 0.3, seed: 802 });
  bass(ctx, bus.input, A2, t0, 5.8, 0.28);
  // bar 1 wind/thunder heartbeat
  taiko(ctx, bus.input, t0 + 0.3, 0.35, { f0: 50, dur: 1.2, level: 0.24, seed: 803 });
  taiko(ctx, bus.input, t0 + 1.3, 0.25, { f0: 46, dur: 1.0, level: 0.2, seed: 804 });
  // 0.012× cut
  const cut = t0 + 2.0;
  bus.weatherLP.frequency.cancelScheduledValues(cut);
  bus.weatherLP.frequency.setValueAtTime(9000, cut);
  bus.weatherLP.frequency.exponentialRampToValueAtTime(300, cut + 0.055);
  subDrop(ctx, bus.input, cut, 0.65, { f0: 44, dur: 2.6, level: 0.3 });
  crystal(ctx, bus.input, cut + 0.02, 96, 4.6, 0.25, { pan: 0.18 });
  crystal(ctx, bus.input, cut + 0.18, 88, 5.0, 0.18, { pan: -0.2 });
  // the shelter motif on soft piano
  for (let i = 0; i < MOTIF_A.length; i++) {
    piano(ctx, bus.input, cut + 0.25 + i * 0.34, MOTIF_A[i] - 12, 2.2, 0.34, { pan: -0.15 + (i % 3) * 0.14, level: 0.11, decay: 3.6 });
  }
  chord(ctx, bus.input, [45, 52, 57], cut + 0.2, 3.4, 0.08, 0, { lowpass: 900, attack: 1.0 });
  // time resumes; weather returns
  const release = t0 + 4.85;
  bus.weatherLP.frequency.setValueAtTime(300, release);
  bus.weatherLP.frequency.exponentialRampToValueAtTime(5000, release + 0.9);
  noiseSwell(ctx, bus.input, release, 0.7, 0.06, { mid: 1200, attack: 0.4, release: 0.3, seed: 805 });
}

function scheduleMonument(ctx, bus, t0) {
  bass(ctx, bus.input, A2, t0, 5.8, 0.4);
  strings(ctx, bus.input, t0 + 0.2, 40, 5.3, 0.4, { attack: 1.2, release: 1.6, lowpass: 500, level: 0.06, pan: 0.2 });
  // huge empty hall
  noiseSwell(ctx, bus.input, t0 + 0.2, 5.0, 0.035, { mid: 900, attack: 2.0, release: 2.0, pan: -0.3, seed: 901 });
  for (let i = 0; i < MOTIF_LOW.length; i += 2) {
    pluck(ctx, bus.input, t0 + 0.35 + i * 0.38, MOTIF_LOW[i] + 12, 3.0, 0.28, { bright: 0.32, decay: 4.0, pan: 0.1, level: 0.12, seed: 910 + i });
  }
  // the camera's 15× plunge: a gong and the motif at the human scale
  stamp(ctx, bus.input, t0 + 2.0, 0.7);
  bell(ctx, bus.input, t0 + 2.0, 33, 7.0, 0.3, { pan: 0.1, level: 0.12, strike: 0.25 });
  xiaoMotif(ctx, bus.input, t0 + 2.2, 0.28, 0.42);
  // leaves, high delicate harmonics
  for (let k = 0; k < 5; k++) crystal(ctx, bus.input, t0 + 3.8 + k * 0.12, 88 + [0, 3, 5, 7, 10][k], 2.2, 0.07, { pan: -0.4 + k * 0.2 });
  riser(ctx, bus.input, t0 + 5.5, 0.05);
}

function scheduleWater(ctx, bus, t0) {
  water(ctx, bus.input, t0, 5.8, 0.16, { seed: 1001, pan: -0.1 });
  bass(ctx, bus.input, F2, t0, 5.8, 0.22);
  const notes = [57, 60, 64, 69, 72, 69];
  for (let i = 0; i < notes.length; i++) {
    pluck(ctx, bus.input, t0 + 0.5 + i * 0.72, notes[i], 3.4, 0.33, { bright: 0.6, decay: 4.5, pan: 0.12 - (i % 2) * 0.22, level: 0.15, seed: 1010 + i });
  }
  // gull: a high glissando with a breathy tail
  const gull = ctx.createOscillator();
  gull.type = 'sine';
  gull.frequency.setValueAtTime(1500, t0 + 2.03);
  gull.frequency.exponentialRampToValueAtTime(2350, t0 + 2.17);
  gull.frequency.exponentialRampToValueAtTime(1050, t0 + 2.7);
  const gg = gain(ctx, 0);
  gg.gain.setValueAtTime(0, t0 + 2.03);
  gg.gain.linearRampToValueAtTime(0.14, t0 + 2.08);
  gg.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.8);
  const ggPan = panned(ctx, bus.input, 0.45);
  gull.connect(gg).connect(ggPan);
  gull.start(t0 + 2.03); gull.stop(t0 + 2.85);
  // the couplet: sparse high harmonics
  for (let i = 0; i < 4; i++) crystal(ctx, bus.input, t0 + 4.1 + i * 0.22, 81 + [0, 5, 7, 12][i], 3.4, 0.08, { pan: 0.35 - i * 0.18 });
  // CRT leak starts
  hum(ctx, bus.input, t0 + 5.35, 0.65, 0.015, { pan: 0.2 });
  beep(ctx, bus.input, t0 + 5.55, 720, 0.08, 0.035, { pan: 0.2 });
  riser(ctx, bus.input, t0 + 5.45, 0.045);
}

function scheduleScope(ctx, bus, t0) {
  // electrical bed
  hum(ctx, bus.input, t0, 5.8, 0.022, { pan: -0.1 });
  bass(ctx, bus.input, A2, t0, 5.8, 0.2);
  const beeps = [880, 660, 990, 720, 1320];
  for (let i = 0; i < beeps.length; i++) beep(ctx, bus.input, t0 + 0.12 + i * 0.28, beeps[i], 0.1, 0.06, { pan: -0.1 + i * 0.05 });
  // Lissajous siren
  const sirenT = t0 + 2.0;
  for (let i = 0; i < 6; i++) {
    beep(ctx, bus.input, sirenT + i * 0.16, [520, 780, 610, 1040, 690, 1230][i], 0.14, 0.08, { pan: -0.4 + i * 0.16 });
  }
  // an abstract, metallic motif while the screen is a knot
  for (let i = 0; i < MOTIF_A.length; i++) {
    beep(ctx, bus.input, sirenT + 0.1 + i * 0.18, mtof(MOTIF_A[i] - 12), 0.15, 0.035, { pan: Math.sin(i) * 0.3 });
  }
  // long green tone and decay
  beep(ctx, bus.input, t0 + 3.2, 360, 2.2, 0.06, { pan: 0.1 });
  crystal(ctx, bus.input, t0 + 2.8, 91, 3.2, 0.08, { pan: -0.2 });
  // power off
  const off = ctx.createOscillator();
  // (the long green tone is allowed to ring under the power-down)
  off.type = 'sine';
  off.frequency.setValueAtTime(420, t0 + 5.0);
  off.frequency.exponentialRampToValueAtTime(40, t0 + 5.55);
  const og = gain(ctx, 0);
  og.gain.setValueAtTime(0.1, t0 + 5.0);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + 5.6);
  off.connect(og).connect(bus.input);
  off.start(t0 + 5.0); off.stop(t0 + 5.65);
  impact(ctx, bus.input, t0 + 5.65, 0.3, { freq: 90, decay: 0.3, seed: 1101 });
}

function scheduleCollapse(ctx, bus, t0) {
  bass(ctx, bus.input, A2, t0, 5.8, 0.3);
  // the hanging slabs breathe
  for (let k = 0; k < 3; k++) noiseTick(ctx, bus.input, t0 + 0.4 + k * 0.7, 0.07, { freq: 900, decay: 0.1, pan: -0.3 + k * 0.3, seed: 1200 + k });
  heartbeat(ctx, bus.input, t0 + 1.0, 0.28, { pan: 0 });
  // release and rubble
  const st = t0 + 2.0;
  for (let k = 0; k < 8; k++) {
    impact(ctx, bus.input, st + k * 0.16, 0.55 - k * 0.04, { freq: 120 + k * 40, decay: 0.35 + k * 0.02, seed: 1300 + k, subF0: 42 });
    noiseTick(ctx, bus.input, st + k * 0.16 + 0.03, 0.1, { freq: 2200 - k * 90, q: 1.7, decay: 0.05, pan: -0.4 + k * 0.12, seed: 1310 + k });
  }
  noiseSwell(ctx, bus.input, st, 2.4, 0.06, { mid: 700, attack: 0.05, release: 1.4, seed: 1320 });
  strings(ctx, bus.input, t0 + 0.1, 33, 5.6, 0.32, { attack: 0.9, lowpass: 300, level: 0.07, pan: -0.1 });
  strings(ctx, bus.input, st + 1.0, 40, 2.8, 0.24, { attack: 0.5, lowpass: 420, level: 0.05, pan: 0.2 });
  // the question, a fragile piano note
  piano(ctx, bus.input, st + 1.4, 57, 3.0, 0.24, { level: 0.14, pan: -0.2, decay: 4.0 });
  piano(ctx, bus.input, st + 1.55, 64, 3.0, 0.18, { level: 0.12, pan: 0.2, decay: 4.0 });
  crystal(ctx, bus.input, t0 + 5.4, 88, 2.4, 0.07, { pan: 0.2 });
  riser(ctx, bus.input, t0 + 5.55, 0.04);
}

function schedulePixel(ctx, bus, t0) {
  // 8-bit accompaniment — deliberately louder than the surrounding ambient eras
  const N = [48, 50, 52, 55, 57, 60, 64, 67];
  for (let k = 0; k < 24; k++) {
    chiptune(ctx, bus.input, t0 + 0.05 + k * 0.25, N[k % N.length] + 12, 0.11, 0.3, { type: 'square', pan: k % 2 ? 0.28 : -0.28 });
  }
  chiptune(ctx, bus.input, t0 + 0.0, 36, 0.4, 0.3, { type: 'triangle' });
  // the four flips
  const chordNotes = [[72, 76, 79], [74, 79, 81], [76, 81, 84], [79, 84, 88]];
  for (let i = 0; i < 4; i++) {
    const t = t0 + 2.08 + i * 0.2;
    for (const m of chordNotes[i]) chiptune(ctx, bus.input, t, m, 0.14, 0.32, { type: 'square', pan: i % 2 ? 0.3 : -0.3 });
    crystal(ctx, bus.input, t, 93 + i * 2, 0.9, 0.13, { pan: 0.1 });
  }
  motif(ctx, bus.input, t0 + 2.1, (c, o, tt, m, d, v, op) => chiptune(c, o, tt, m + 12, d, v * 0.9, { type: 'square', pan: op.pan, level: 0.3 }), MOTIF_BRIGHT, { step: 0.19, dur: 0.18, vel: 0.45 });
  // victory jingle
  for (let i = 0; i < 5; i++) chiptune(ctx, bus.input, t0 + 3.0 + i * 0.09, [84, 88, 91, 96, 100][i], 0.18, 0.26, { type: 'square', pan: 0.22 });
  crystal(ctx, bus.input, t0 + 3.0, 100, 2.6, 0.18, { pan: -0.12 });
  riser(ctx, bus.input, t0 + 5.5, 0.05);
}

function scheduleY2K(ctx, bus, t0) {
  bass(ctx, bus.input, C3, t0, 5.8, 0.3);
  chord(ctx, bus.input, [60, 64, 67], t0 + 0.1, 5.7, 0.16, 0, { lowpass: 1800 });
  // notification pop-ups on the scripted beats
  popup(ctx, bus.input, t0 + 2.0, 84, 0.52, { pan: -0.28 });
  popup(ctx, bus.input, t0 + 2.32, 88, 0.44, { pan: 0.26 });
  popup(ctx, bus.input, t0 + 2.64, 91, 0.36, { pan: -0.15 });
  for (let i = 0; i < 12; i++) noiseTick(ctx, bus.input, t0 + 2.62 + i * 0.115, 0.12, { freq: 3200, q: 2.8, decay: 0.012, pan: -0.1, seed: 1500 + i });
  // a soft, original MIDI-ish motif
  for (let i = 0; i < MOTIF_BRIGHT.length; i++) {
    bell(ctx, bus.input, t0 + 3.0 + i * 0.24, MOTIF_BRIGHT[i], 1.5, 0.24, { pan: 0.2 - (i % 2) * 0.4, level: 0.16, strike: 0.08 });
  }
  // window shake = a mechanical rattle
  impact(ctx, bus.input, t0 + 2.0, 0.35, { freq: 700, decay: 0.1, seed: 1510, subF0: 65 });
  riser(ctx, bus.input, t0 + 5.5, 0.045);
}

function scheduleLofi(ctx, bus, t0) {
  const duck = gain(ctx, 1);
  duck.connect(bus.input);
  chord(ctx, duck, [60, 64, 67, 69], t0 + 0.15, 5.5, 0.16, 0, { lowpass: 1500, attack: 0.15 });
  // duck the pad under each kick
  for (let t = t0; t < t0 + 5.9; t += 0.5) {
    duck.gain.setValueAtTime(0.36, t);
    duck.gain.linearRampToValueAtTime(1.0, t + 0.18);
  }
  for (let t = t0; t < t0 + 5.9; t += 0.5) {
    taiko(ctx, bus.input, t, 0.45, { f0: 50, dur: 0.55, level: 0.25, seed: 1600 });
    if (Math.round((t - t0) * 2) % 2 === 1) noiseTick(ctx, bus.input, t, 0.13, { freq: 1700, q: 0.9, decay: 0.06, pan: 0.1, seed: 1601 });
    noiseTick(ctx, bus.input, t + 0.25, 0.05, { freq: 4800, q: 2.2, decay: 0.012, pan: -0.2, seed: 1602 });
  }
  // warm motif
  for (let i = 0; i < MOTIF_A.length; i++) {
    pluck(ctx, bus.input, t0 + 2.0 + i * 0.3, MOTIF_A[i] - 12, 2.2, 0.42, { bright: 0.55, decay: 3.0, level: 0.2, pan: 0.12 - (i % 3) * 0.2, seed: 1610 + i });
  }
  // little UI likes
  for (let i = 0; i < 6; i++) crystal(ctx, bus.input, t0 + 2.1 + i * 0.4, 96 + (i % 3), 0.6, 0.08, { pan: 0.4 });
  noiseSwell(ctx, bus.input, t0 + 0.1, 5.2, 0.04, { mid: 1200, attack: 1.5, release: 2.0, seed: 1620 });
}

function scheduleCode(ctx, bus, t0) {
  bass(ctx, bus.input, C3, t0, 5.8, 0.3);
  strings(ctx, bus.input, t0 + 0.05, 36, 5.6, 0.28, { attack: 0.8, lowpass: 420, level: 0.06, pan: -0.2 });
  chord(ctx, bus.input, [60, 64, 67, 71], t0 + 0.15, 5.7, 0.16, 0, { lowpass: 2000, attack: 0.8 });
  // mechanical keyboard as 16th-note shaker
  for (let i = 0; i < 46; i++) {
    noiseTick(ctx, bus.input, t0 + 0.08 + i * 0.125, 0.06 + (i % 4 === 0 ? 0.03 : 0), { freq: 2500 + (i % 4) * 500, q: 3.5, decay: 0.01, pan: (i % 2 ? 0.18 : -0.18), seed: 1700 + i });
  }
  // warm piano motif after compile
  for (let i = 0; i < MOTIF_A.length; i++) {
    piano(ctx, bus.input, t0 + 2.0 + i * 0.28, MOTIF_A[i], 2.4, 0.48, { level: 0.12, pan: -0.18 + (i % 3) * 0.14, decay: 3.1 });
  }
  crystal(ctx, bus.input, t0 + 2.0, 96, 3.4, 0.17, { pan: 0.28 });
  // compile click and star shimmer
  noiseTick(ctx, bus.input, t0 + 2.0, 0.17, { freq: 1800, q: 2.8, decay: 0.03, pan: 0, seed: 1710 });
  for (let i = 0; i < 10; i++) crystal(ctx, bus.input, t0 + 2.2 + i * 0.12, 88 + PENTA[i % PENTA.length], 2.2, 0.06, { pan: -0.4 + i * 0.09 });
  // final chord
  chord(ctx, bus.input, [48, 55, 60, 64], t0 + 4.2, 2.4, 0.08, 0, { lowpass: 1800, attack: 0.4 });
  riser(ctx, bus.input, t0 + 5.45, 0.04);
}

function scheduleOutro(ctx, bus) {
  const t0 = OUTRO_START;
  // full-ensemble opening phrase (4 bars)
  const roots = [48, 55, 53, 48];
  const chords = [[48, 55, 60, 64], [43, 50, 55, 59], [41, 48, 53, 57], [48, 55, 60, 64]];
  for (let b = 0; b < 4; b++) {
    const t = t0 + b * 2;
    const root = roots[b];
    bass(ctx, bus.input, root - 12, t, 1.95, 0.42, 0);
    chord(ctx, bus.input, chords[b], t + 0.02, 1.95, 0.14, 0, { lowpass: 2200, attack: 0.4 });
    // a full, rich statement of the leitmotif on different instruments
    const inst = b % 4 === 0 ? piano : b % 4 === 1 ? pipaVoice : b % 4 === 2 ? diziVoice : bellVoice;
    for (let i = 0; i < MOTIF_BRIGHT.length; i++) {
      inst(ctx, bus.input, t + 0.06 + i * 0.22, MOTIF_BRIGHT[i], 1.4, 0.27, {
        pan: -0.2 + (i % 3) * 0.2, level: 0.1, seed: 1800 + i, bright: 0.7, decay: 2.8,
      });
    }
    // strings sustain the bar
    strings(ctx, bus.input, t + 0.02, root + 12, 1.9, 0.32, { attack: 0.2, release: 0.35, lowpass: 1800, level: 0.05, pan: 0.2 });
    taiko(ctx, bus.input, t, 0.4, { f0: 58, dur: 1.2, level: 0.26, seed: 1810 + b });
  }
  // gong at the pull-back
  stamp(ctx, bus.input, t0 + 0.02, 0.8);
  bell(ctx, bus.input, t0 + 0.02, 33, 8.0, 0.3, { pan: 0, level: 0.12, strike: 0.3 });
  // bars 5–7: push into the empty seat, thinning instrumentation
  bass(ctx, bus.input, 45, t0 + 8.0, 3.6, 0.28, 0);
  strings(ctx, bus.input, t0 + 8.0, 45, 3.6, 0.25, { attack: 1.0, release: 1.4, lowpass: 400, level: 0.05, pan: -0.15 });
  piano(ctx, bus.input, t0 + 8.2, 69, 3.2, 0.2, { level: 0.07, pan: 0.15, decay: 4.2 });
  crystal(ctx, bus.input, t0 + 10.5, 84, 3.0, 0.08, { pan: -0.2 });
  // 8–9: the cold court line
  bell(ctx, bus.input, t0 + 14.0, 45, 4.0, 0.18, { pan: 0.1, level: 0.1, strike: 0.1 });
  noiseSwell(ctx, bus.input, t0 + 13.6, 4.0, 0.035, { mid: 600, attack: 1.0, release: 2.0, seed: 1900 });
  // the room does not become dead air: a low, almost sub-audible drone and a
  // few piano notes carry the push into the empty seat.
  bass(ctx, bus.input, 45, t0 + 12.0, 6.0, 0.32, 0);
  pad(ctx, bus.input, t0 + 12.1, 45, 6.0, 0.11, { lowpass: 500, attack: 1.6, pan: -0.2 });
  pad(ctx, bus.input, t0 + 12.1, 52, 6.0, 0.08, { lowpass: 700, attack: 1.6, pan: 0.2 });
  piano(ctx, bus.input, t0 + 12.6, 69, 4.0, 0.22, { level: 0.07, pan: 0.12, decay: 4.6 });
  piano(ctx, bus.input, t0 + 13.8, 72, 3.0, 0.16, { level: 0.06, pan: -0.2, decay: 4.6 });
  crystal(ctx, bus.input, t0 + 15.2, 88, 3.2, 0.1, { pan: 0.3 });
  // 10–12: the star river, final page
  const starT = t0 + 18.0;
  bass(ctx, bus.input, 45, starT, 5.8, 0.3, 0);
  strings(ctx, bus.input, starT, 33, 5.8, 0.3, { attack: 1.0, lowpass: 420, level: 0.06, pan: 0.2 });
  crystal(ctx, bus.input, starT, 96, 4.0, 0.22, { pan: 0.25 });
  for (let i = 0; i < 12; i++) {
    crystal(ctx, bus.input, starT + 0.08 + i * 0.2, 84 + PENTA[i % PENTA.length], 2.6, 0.09, { pan: -0.55 + i * 0.1 });
  }
  chord(ctx, bus.input, [48, 55, 60, 64], starT + 0.1, 5.8, 0.12, 0, { lowpass: 2600, attack: 1.4 });
  for (let i = 0; i < MOTIF_A.length; i++) {
    pluck(ctx, bus.input, starT + 0.4 + i * 0.3, MOTIF_A[i] + 12, 2.8, 0.34, { bright: 0.3, decay: 5.0, pan: -0.2 + (i % 3) * 0.2, level: 0.18, seed: 1910 + i });
  }
  // final silence / one guqin harmonic / one oar
  pluck(ctx, bus.input, 136.45, 69, 2.2, 0.34, { bright: 0.8, decay: 3.5, level: 0.2, pan: 0.1, seed: 1999 });
  pluck(ctx, bus.input, 136.6, 81, 1.8, 0.2, { bright: 0.9, decay: 3.4, level: 0.1, pan: -0.25, seed: 2001 });
  oar(ctx, bus.input, 137.0, 0.26, { pan: -0.2, seed: 2000 });
}

// light wrappers matching the instrument voice signature
function pipaVoice(ctx, out, t, m, d, v, opts) {
  return pluck(ctx, out, t, m, d, v, {
    bright: opts.bright ?? 0.72, decay: opts.decay ?? 2.8, level: opts.level ?? 0.1,
    pan: opts.pan ?? 0, click: 0.05, seed: opts.seed ?? m,
  });
}
function diziVoice(ctx, out, t, m, d, v, opts) {
  return wind(ctx, out, t, m + 12, d, v, {
    type: 'sine', breath: 0.05, vibrato: 0.006, membrane: 0.04,
    pan: opts.pan ?? 0, level: opts.level ?? 0.1, seed: opts.seed ?? m,
  });
}
function bellVoice(ctx, out, t, m, d, v, opts) {
  return bell(ctx, out, t, m, d, v, {
    pan: opts.pan ?? 0, level: opts.level ?? 0.1, seed: opts.seed ?? m, strike: 0.08,
  });
}

function scheduleTransitions(ctx, bus) {
  for (let i = 1; i <= 18; i++) {
    const t = INTRO + i * SCENE_DUR - 0.38;
    if (t >= DURATION - 2) continue;
    // gentle riser and a low footstep on the crossing
    noiseSwell(ctx, bus.input, t, 0.36, 0.03 + (i % 3) * 0.01, { mid: 1100 + i * 60, attack: 0.25, release: 0.08, seed: 2100 + i });
    if (i <= 17) {
      taiko(ctx, bus.input, t + 0.36, 0.1, { f0: 80, dur: 0.35, level: 0.08, seed: 5000 + i });
    }
  }
}

function buildScore(ctx, bus, tape) {
  scheduleIntro(ctx, bus);
  // 01–03: Tang, bright gong mode
  for (let i = 0; i < 3; i++) scheduleTang(ctx, bus, i, sceneStart(i));
  // 04–06: cold, excluded, fractured
  for (let i = 3; i < 6; i++) scheduleCold(ctx, bus, i - 3, sceneStart(i));
  // 07: the tape
  scheduleWoodcut(ctx, bus, sceneStart(6), tape);
  // 08–12
  scheduleGoldSpheres(ctx, bus, sceneStart(7));
  scheduleShadow(ctx, bus, sceneStart(8));
  scheduleBullet(ctx, bus, sceneStart(9));
  scheduleMonument(ctx, bus, sceneStart(10));
  scheduleWater(ctx, bus, sceneStart(11));
  // 13–18
  scheduleScope(ctx, bus, sceneStart(12));
  scheduleCollapse(ctx, bus, sceneStart(13));
  schedulePixel(ctx, bus, sceneStart(14));
  scheduleY2K(ctx, bus, sceneStart(15));
  scheduleLofi(ctx, bus, sceneStart(16));
  scheduleCode(ctx, bus, sceneStart(17));
  scheduleOutro(ctx, bus);
  scheduleTransitions(ctx, bus);
}

/**
 * Render the whole score at 48 kHz stereo. Returns an AudioBuffer of exactly
 * 138.0 s, peak-normalised to −1 dBFS.
 */
export async function renderScore(opts = {}) {
  const tape = await renderTangTape();
  const sr = SR;
  const seconds = Math.min(DURATION, Math.max(1, opts.duration ?? DURATION));
  const length = Math.ceil(seconds * sr);
  const ctx = new OfflineAudioContext(2, length, sr);
  const bus = makeBus(ctx);
  buildScore(ctx, bus, tape);
  const raw = await ctx.startRendering();
  widen(raw, 1.22);
  const out = opts.normalize === false ? raw : normalize(raw, 0.89);
  // deterministic fade-in/out to avoid container clicks
  fade(out, 0.04, 1.1);
  return out;
}

/** Mid/side width without a Haas delay; keeps mono compatibility sane. */
function widen(buffer, amount = 1.2) {
  const a = buffer.numberOfChannels > 1 ? buffer.getChannelData(0) : null;
  const b = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
  if (!a || !b) return buffer;
  for (let i = 0; i < a.length; i++) {
    const mid = (a[i] + b[i]) * 0.5;
    const side = (a[i] - b[i]) * 0.5 * amount;
    a[i] = mid + side;
    b[i] = mid - side;
  }
  return buffer;
}

function normalize(buffer, peakTarget = 0.89) {
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a > peak) peak = a;
    }
  }
  if (peak > 0) {
    const g = peakTarget / peak;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] *= g;
    }
  }
  return buffer;
}

function fade(buffer, inSec = 0.04, outSec = 1.1) {
  const sr = buffer.sampleRate;
  const n = buffer.length;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    const a = Math.floor(inSec * sr), b = Math.floor(outSec * sr);
    for (let i = 0; i < a; i++) d[i] *= i / a;
    for (let i = 0; i < b; i++) d[n - 1 - i] *= i / b;
  }
}

/** Exposed for the preview bridge and tools. */
export { analyse, wavBytes };
