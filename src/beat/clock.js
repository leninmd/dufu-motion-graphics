/**
 * clock.js — the film's single source of timing truth.
 *
 * 120 BPM · 1 beat = 0.5 s · 1 bar = 4 beats = 2.0 s
 * Intro   3 bars   6.0 s  [00:00 – 00:06]
 * 18 eras 3 bars   6.0 s each, 54 bars, 108.0 s [00:06 – 01:54]
 * Outro  12 bars  24.0 s [01:54 – 02:18]
 * Total  69 bars 138.0 s = 8,280 frames @ 60 fps.
 *
 * Nothing in this module reads the wall clock. Every value is a pure function
 * of film time t (seconds) or of a scene index and its local time u.
 */

export const FPS = 60;
export const BPM = 120;
export const BEAT = 60 / BPM;          // 0.5 s
export const BAR = 4 * BEAT;           // 2.0 s
export const BARS_PER_SCENE = 3;
export const SCENE_DUR = BARS_PER_SCENE * BAR; // 6.0 s
export const N_SCENES = 18;
export const INTRO = 3 * BAR;          // 6.0 s
export const OUTRO = 12 * BAR;         // 24.0 s
export const OUTRO_START = INTRO + N_SCENES * SCENE_DUR; // 114.0 s
export const DURATION = OUTRO_START + OUTRO;             // 138.0 s
export const FRAMES = Math.round(DURATION * FPS);        // 8,280

export const VIEW_W = 1920;
export const VIEW_H = 1080;
export const SAFE = Object.freeze({ x: 64, y: 52, w: 1792, h: 976 });
export const MAX_KM = 4739;

/**
 * Checkpoint distance in kilometres at the start of each era.
 * The last value is the distance at the end of era 13; after that the
 * historical journey is complete and the odometer must only hold — never reverse.
 */
export const DISTANCE_ANCHORS = Object.freeze([
  0,      // 01  712 · 巩县
  420,    // 02  731 · 吴越
  705,    // 03  736 · 齐鲁
  1037,   // 04  746 · 长安
  1037,   // 05  751 · 困守长安
  1150,   // 06  755 · 奉先
  1420,   // 07  755w · 安史
  1880,   // 08  757 · 春望
  2600,   // 09  759 · 石壕
  3100,   // 10  761 · 成都
  3880,   // 11  766 · 夔州
  4350,   // 12  768 · 湘江
  4739,   // 13  770 · 潭州
  4739,   // 14  跨时空
  4739,   // 15  人生烂牌局
  4739,   // 16  2000s
  4739,   // 17  2020s
  4739,   // 18  2026
]);
export const DISTANCE_END = 4739;

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, p) => a + (b - a) * p;
export const mod1 = (v) => ((v % 1) + 1) % 1;
export const smoothstep = (a, b, v) => {
  if (a === b) return v < a ? 0 : 1;
  const p = clamp((v - a) / (b - a));
  return p * p * (3 - 2 * p);
};
export const smootherstep = (a, b, v) => {
  if (a === b) return v < a ? 0 : 1;
  const p = clamp((v - a) / (b - a));
  return p * p * p * (p * (p * 6 - 15) + 10);
};
export const easeInOutSine = (p) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(p));
export const frameAt = (t) => Math.round(clamp(t, 0, DURATION) * FPS);

/** Start time of a 0-based era. */
export const sceneStart = (i) => INTRO + i * SCENE_DUR;
export const sceneEnd = (i) => sceneStart(i) + SCENE_DUR;

/**
 * -1 = intro, 0..17 = era, 18 = outro.
 * Boundary times belong to the new section (the downbeat is the crossing).
 */
export function sectionAt(t) {
  if (t < INTRO) return -1;
  if (t >= OUTRO_START) return N_SCENES;
  return Math.min(N_SCENES - 1, Math.floor((t - INTRO) / SCENE_DUR + 1e-9));
}

/** Alias used by scenes and tools. */
export const sceneIndexAt = sectionAt;

export function localTimeOf(t, i = sectionAt(t)) {
  if (i < 0) return t;
  if (i >= N_SCENES) return t - OUTRO_START;
  return t - sceneStart(i);
}

/** A bar/beat snapshot at film time t. Pure. */
export function beatInfo(t) {
  const tt = clamp(t, 0, DURATION);
  const i = sectionAt(tt);
  const local = localTimeOf(tt, i);
  const beatPos = tt / BEAT;
  const barPos = tt / BAR;
  const beatPhase = mod1(beatPos);
  const barPhase = mod1(barPos);
  const beatIndex = Math.floor(beatPos + 1e-9);
  const barIndex = Math.floor(barPos + 1e-9);
  const localBeatPos = local / BEAT;
  const localBarPos = local / BAR;
  const sceneP = i >= 0 && i < N_SCENES ? clamp(local / SCENE_DUR) : 0;
  return {
    t: tt,
    u: local,
    local,
    scene: i,
    sceneIndex: i,
    sceneP,
    beat: beatPos,
    beatIndex,
    beatPhase,
    bar: barPos,
    barIndex,
    barPhase,
    // sharp, zero at the instant of every beat / bar
    pulse: Math.pow(1 - beatPhase, 5),
    barPulse: Math.pow(1 - barPhase, 6),
    onBeat: beatPhase < 1e-6,
    onDownbeat: barPhase < 1e-6,
    beatInBar: Math.floor(localBeatPos + 1e-9) % 4,
    barInScene: Math.floor(localBarPos + 1e-9),
    section: i >= 0 && i < N_SCENES ? Math.min(3, Math.floor(localBarPos + 1e-9) + 1) : 0,
    localBeatPhase: mod1(localBeatPos),
    localBarPhase: mod1(localBarPos),
    // the traveller's gait / oar cycle: exactly two beats (1.0 s)
    walkPhase: mod1((tt / 1.0)),
    walkAngle: mod1(tt / 1.0) * Math.PI * 2,
    // scene golden markers
    wonder: i >= 0 && i < N_SCENES ? smoothstep(2.0, 2.08, local) : 0,
    eye: i >= 0 && i < N_SCENES ? smoothstep(4.0, 4.08, local) : 0,
  };
}

/** Local time inside scene i (0..6), clamped for safe rendering. */
export function sceneLocal(i, t) {
  return clamp(t - sceneStart(i), 0, SCENE_DUR);
}

/** Distance shown by the HUD. Monotonic non-decreasing over the whole film. */
export function distanceAt(t) {
  const tt = clamp(t, 0, DURATION);
  if (tt < INTRO) return 0;
  if (tt >= OUTRO_START) return DISTANCE_END;
  const i = sectionAt(tt);
  const u = clamp(tt - sceneStart(i), 0, SCENE_DUR);
  const p = u / SCENE_DUR;
  const a = DISTANCE_ANCHORS[i];
  const b = i + 1 < DISTANCE_ANCHORS.length
    ? Math.max(a, DISTANCE_ANCHORS[i + 1])
    : DISTANCE_END;
  // Linear distance, with a barely perceptible beat cadence in the last tenth
  // of each km; it can never go backwards.
  return a + (b - a) * p;
}

/** Integer display value; clamped monotone. */
export const hudKm = (t) => Math.floor(distanceAt(t) + 1e-7);
export function formatKm(km) {
  const n = Math.max(0, Math.min(MAX_KM, Math.round(km)));
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Scene number label: 01..18. */
export const sceneNo = (i) => String(i + 1).padStart(2, '0');

/** The next crossing downbeat after t (or null). */
export function nextCrossing(t) {
  if (t < INTRO) return INTRO;
  if (t >= OUTRO_START) return null;
  const i = sectionAt(t);
  return sceneEnd(i);
}

/** Era entry / wonder / eye / exit marker times, useful for audio and QA. */
export function sceneCues(i) {
  const s = sceneStart(i);
  return {
    entry: s,
    bar1: s,
    wonder: s + 2,
    eye: s + 4,
    exit: s + 6,
    gate: s + 5.75,
  };
}

/** Format seconds as MM:SS.mmm — no locale, stable for screenshots. */
export function timecode(t) {
  const v = clamp(t, 0, DURATION);
  const m = Math.floor(v / 60);
  const s = Math.floor(v % 60);
  const f = Math.round((v % 1) * FPS);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(f).padStart(2, '0')}`;
}

export const CLOCK = Object.freeze({
  FPS, BPM, BEAT, BAR, BARS_PER_SCENE, SCENE_DUR, N_SCENES,
  INTRO, OUTRO, OUTRO_START, DURATION, FRAMES, VIEW_W, VIEW_H,
  DISTANCE_ANCHORS, DISTANCE_END, MAX_KM,
});
