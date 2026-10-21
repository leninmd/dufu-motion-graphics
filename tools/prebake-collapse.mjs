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
  body.phase = r() * 6.283;
  // Important: create dynamic so Matter records original mass, then freeze.
  Body.setStatic(body, true);
  bodies.push(body);
  meta.push({ id: `c${idx}`, text, size, w: +w.toFixed(1), h: +h.toFixed(1), red });
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
  body.phase = r() * 6.283;
  Body.setStatic(body, true);
  bodies.push(body);
  meta.push({ id: `f${i}`, text, size, w: +w.toFixed(1), h: +h.toFixed(1), red: body.red });
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
  body.phase = r() * 6.283;
  Body.setStatic(body, true);
  bodies.push(body);
  meta.push({ id: `r${i}`, text, size, w: +w.toFixed(1), h: +h.toFixed(1), red: true });
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
  // invisible angled ramps funnel the ruins toward the centre
  Bodies.rectangle(250, 850, 660, 34, { isStatic: true, angle: -0.32, friction: 0.2, restitution: 0.01, label: 'rampL' }),
  Bodies.rectangle(W - 250, 850, 660, 34, { isStatic: true, angle: 0.32, friction: 0.2, restitution: 0.01, label: 'rampR' }),
]);

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
  for (const b of bodies) {
    paths.get(b).push([
      +b.position.x.toFixed(1),
      +b.position.y.toFixed(1),
      +b.angle.toFixed(4),
    ]);
  }
  Engine.update(engine, 1000 / FPS);
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

