#!/usr/bin/env node
/**
 * Pre-bake the rigid-body collapse for era 14 with Matter.js.
 *
 * Deterministic: fixed 60 Hz timestep, seeded initial nudges, no date/clock.
 * The runtime scene imports `src/generated/collapse.js` and only interpolates
 * pre-computed transforms, so a seek to any frame is byte-stable.
 *
 *   node tools/prebake-collapse.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import Matter from 'matter-js';
import { ROOT } from './server.mjs';

const { Engine, World, Bodies, Body, Composite } = Matter;
const W = 1920, H = 1080, FPS = 60, FRAMES = 240;
const FLOOR_Y = 1014;

const SENTENCES = [
  { text: '如果有一天，你的人生突然崩塌', y: 154, size: 62, face: 'mono', red: false },
  { text: '十年求职无门', y: 282, size: 82, face: 'mono', red: false },
  { text: '连家人的屋顶都护不住', y: 420, size: 64, face: 'mono', red: false },
];
const FRAGMENTS = [
  '突然崩塌', '人生', '无门', '屋顶', '护不住', '十年', '如果', '一天', '家人',
  '求职', '失意者', '冷炙', '残杯', '富儿门', '破屋', '孤舟', '家书', '长夜',
];
const SEED = 0x5e14;

function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rand(SEED);

const bodies = [];
const meta = [];

/** Collision radius used by the position-relaxation pass (fontSize × 0.58). */
const radiusOf = (size) => +(size * 0.58).toFixed(2);

function addChar(text, x, y, size, red, idx) {
  const w = size * 1.18;
  const h = size * 1.32;
  const body = Bodies.rectangle(x, y, w, h, {
    friction: 0.65,
    frictionStatic: 1.1,
    frictionAir: 0.025,
    restitution: 0.035,
    density: 0.0028,
    chamfer: { radius: Math.max(2, size * 0.06) },
    label: `char-${idx}`,
  });
  body.text = text;
  body.fs = size;
  body.kind = 'char';
  body.red = red;
  body.w = w;
  body.h = h;
  body.rad = radiusOf(size);
  body.phase = r() * 6.283;
  // Important: create dynamic so Matter records original mass, then freeze.
  Body.setStatic(body, true);
  bodies.push(body);
  meta.push({ id: `c${idx}`, text, size, w: +w.toFixed(1), h: +h.toFixed(1), red, r: body.rad });
}

let idx = 0;
for (const line of SENTENCES) {
  const chars = [...line.text];
  const gap = Math.max(4, line.size * 0.08);
  const total = chars.length * line.size * 1.18 + (chars.length - 1) * gap;
  let x = 960 - total / 2 + line.size * 0.59;
  for (let i = 0; i < chars.length; i++) {
    addChar(chars[i], x, line.y + (i % 2) * 1.5, line.size, false, idx++);
    x += line.size * 1.18 + gap;
  }
}
// Extra sentence fragments / rubble: smaller blocks above, out toward the edges.
for (let i = 0; i < 26; i++) {
  const text = FRAGMENTS[i % FRAGMENTS.length];
  const size = 22 + Math.floor(r() * 13);
  const w = Math.max(64, size * [...text].length * 1.05 + 18);
  const h = size * 1.45;
  const x = 180 + r() * (W - 360);
  const y = 80 + r() * 330;
  const body = Bodies.rectangle(x, y, w, h, {
    friction: 0.7,
    frictionAir: 0.03,
    restitution: 0.02,
    density: 0.0018,
    label: `frag-${i}`,
  });
  body.text = text;
  body.fs = size;
  body.kind = 'frag';
  body.red = i % 7 === 0;
  body.w = w;
  body.h = h;
  // a multi-glyph strip needs a wider separation circle than one glyph
  body.rad = +Math.max(size * 0.58, w * 0.34).toFixed(2);
  body.phase = r() * 6.283;
  Body.setStatic(body, true);
  bodies.push(body);
  meta.push({ id: `f${i}`, text, size, w: +w.toFixed(1), h: +h.toFixed(1), red: body.red, r: body.rad });
}
// A few red accent shards
for (let i = 0; i < 8; i++) {
  const text = ['失', '意', '者', '废', '物', '泪', '诗', '史'][i];
  const size = 44 + Math.floor(r() * 26);
  const x = 420 + r() * 1080;
  const y = 60 + r() * 180;
  const w = size * 1.14, h = size * 1.3;
  const body = Bodies.rectangle(x, y, w, h, {
    friction: 0.5, frictionAir: 0.02, restitution: 0.08, density: 0.003,
    label: `red-${i}`,
  });
  body.text = text; body.fs = size; body.kind = 'red'; body.red = true; body.w = w; body.h = h;
  body.rad = radiusOf(size);
  body.phase = r() * 6.283;
  Body.setStatic(body, true);
  bodies.push(body);
  meta.push({ id: `r${i}`, text, size, w: +w.toFixed(1), h: +h.toFixed(1), red: true, r: body.rad });
}

const engine = Engine.create({ enableSleeping: true });
engine.gravity.y = 1.45;
engine.positionIterations = 10;
engine.velocityIterations = 8;
const world = engine.world;
World.add(world, bodies);
World.add(world, [
  Bodies.rectangle(W / 2, FLOOR_Y + 32, W + 600, 64, { isStatic: true, friction: 0.9, label: 'floor' }),
  Bodies.rectangle(-42, H / 2, 84, H * 2, { isStatic: true, friction: 0.5, label: 'wallL' }),
  Bodies.rectangle(W + 42, H / 2, 84, H * 2, { isStatic: true, friction: 0.5, label: 'wallR' }),
  // Low outer kerbs only: the ruins must spread across the whole floor, not be
  // funnelled into one tall heap in the middle of the frame.
  Bodies.rectangle(70, FLOOR_Y - 16, 40, 32, { isStatic: true, friction: 0.4, label: 'kerbL' }),
  Bodies.rectangle(W - 70, FLOOR_Y - 16, 40, 32, { isStatic: true, friction: 0.4, label: 'kerbR' }),
]);

/* ------------------------------------------------ position-based separation */
/**
 * Six rounds of Position Relaxation with a separation circle of fontSize × 0.58:
 * the settled glyphs lean on each other but can never interpenetrate.
 */
function relaxOnce(strength) {
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      let dx = b.position.x - a.position.x;
      let dy = b.position.y - a.position.y;
      const min = a.rad + b.rad;
      let d = Math.hypot(dx, dy);
      if (d >= min) continue;
      if (d < 1e-4) { dx = (i % 2 ? 1 : -1) * 0.5; dy = 0.6; d = Math.hypot(dx, dy); }
      const push = (min - d) * 0.5 * strength;
      const nx = dx / d, ny = dy / d;
      Body.setPosition(a, { x: a.position.x - nx * push, y: a.position.y - ny * push });
      Body.setPosition(b, { x: b.position.x + nx * push, y: b.position.y + ny * push });
    }
  }
  // re-seat every body on the floor / inside the walls
  for (const b of bodies) {
    const lim = FLOOR_Y - b.h / 2 + 2;
    let y = b.position.y;
    let x = b.position.x;
    if (y > lim) y = lim;
    if (x < b.w / 2 + 14) x = b.w / 2 + 14;
    if (x > W - b.w / 2 - 14) x = W - b.w / 2 - 14;
    if (y !== b.position.y || x !== b.position.x) Body.setPosition(b, { x, y });
  }
}

// Release all bodies and give a tiny seeded nudge (same seed every run).
for (const b of bodies) {
  Body.setStatic(b, false);
  Body.setVelocity(b, {
    x: (r() - 0.5) * 1.0,
    y: 0.15 + r() * 0.5,
  });
  Body.setAngularVelocity(b, (r() - 0.5) * 0.012);
}

const paths = new Map(bodies.map((b) => [b, []]));
for (let f = 0; f < FRAMES; f++) {
  Engine.update(engine, 1000 / FPS);
  // progressive separation keeps the settled pile collision-free without a
  // visible snap: two gentle rounds per frame, six hard rounds on the tail
  if (f >= 66) {
    const tail = f >= FRAMES - 10;
    const rounds = tail ? 6 : 2;
    const strength = tail ? 0.62 : 0.3;
    for (let k = 0; k < rounds; k++) relaxOnce(strength);
  }
  for (const b of bodies) {
    paths.get(b).push([
      +b.position.x.toFixed(1),
      +b.position.y.toFixed(1),
      +b.angle.toFixed(4),
    ]);
  }
}

// six final relaxation rounds, purely so the last frame is provably separated
for (let k = 0; k < 6; k++) relaxOnce(0.62);

/* ------------------------------------------------ settle into the rubble band
 * The heap is compressed toward the floor and re-relaxed until it lies wholly
 * inside the bottom band (top ≈ 800, floor 1014). The correction is blended
 * into the last 40 baked frames so the compression reads as the rubble settling,
 * never as a snap.
 */
const TARGET_TOP = 800;
let topMost = Infinity;
for (const b of bodies) topMost = Math.min(topMost, b.position.y - b.h / 2);
const kSquash = Math.min(1, (FLOOR_Y - TARGET_TOP) / Math.max(1, FLOOR_Y - topMost));
const snap = bodies.map((b) => ({ x: b.position.x, y: b.position.y }));
for (let pass = 0; pass < 14; pass++) {
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    b.position.x = snap[i].x;
    b.position.y = FLOOR_Y - (FLOOR_Y - snap[i].y) * kSquash;
  }
  for (let r2 = 0; r2 < 4; r2++) relaxOnce(0.8);
}
// converge the separation to zero interpenetration
for (let k2 = 0; k2 < 16; k2++) relaxOnce(0.92);
const settled = bodies.map((b) => ({ x: b.position.x, y: b.position.y }));
// blend the settled pose into the tail of the recorded path
const BLEND = 40;
for (let f = FRAMES - BLEND; f < FRAMES; f++) {
  const t = (f - (FRAMES - BLEND)) / (BLEND - 1);
  const e = t * t * (3 - 2 * t);
  for (let i = 0; i < bodies.length; i++) {
    const p = paths.get(bodies[i])[f];
    p[0] = +(p[0] + (settled[i].x - p[0]) * e).toFixed(1);
    p[1] = +(p[1] + (settled[i].y - p[1]) * e).toFixed(1);
  }
}

const out = {
  generatedBy: 'tools/prebake-collapse.mjs',
  library: 'matter-js@0.20.0 (MIT)',
  fps: FPS,
  frames: FRAMES,
  width: W,
  height: H,
  floorY: FLOOR_Y,
  releaseSeconds: 2,
  bodies: meta.map((m, i) => ({ ...m, path: paths.get(bodies[i]) })),
};
const file = path.join(ROOT, 'src', 'generated', 'collapse.js');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, `/* Generated by tools/prebake-collapse.mjs. Do not hand-edit. */\nexport const COLLAPSE = ${JSON.stringify(out)};\n`, 'utf8');
console.log(`wrote ${path.relative(ROOT, file)} · ${out.bodies.length} bodies · ${FRAMES} frames · ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);

