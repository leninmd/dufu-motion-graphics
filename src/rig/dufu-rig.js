/**
 * dufu-rig.js — one continuous puppet, eighteen ways of drawing him.
 *
 * The rig is a pure pose function:
 *   pose({ t, phase, mode, wind, lean, look, elder, staff, ... }) → named parts
 * The same joint coordinates are handed to each era's renderer: stone-rubbing
 * silhouette in 01, flying-white ribbon in 02, point cloud in 03, gold-outline
 * in 04, shadow-puppet cut-out in 09, phosphor vectors in 13, and the lone boat
 * in 12–18. The gait / oar cycle is exactly two beats (1.0 s):
 *   φ = (t · BPM / 60) · π = 2πt at 120 BPM.
 */
import {
  TAU, clamp, clamp01, lerp, hash, mulberry32, noise2, fbm1,
  smoothPath, smoothLoop, ellipsePts, vlerp, vlen, sub, norm,
} from '../kit/math.js';

export const RIG = Object.freeze({
  beatCycle: 1.0,
  height: 330,
  width: 210,
  hemY: -38,
  shoulderY: -242,
  headY: -292,
});

const P2 = (x, y) => [x, y];

function smoothClosed(pts, k = 8) {
  const out = smoothLoop(pts, k);
  out.push(out[0]);
  return out;
}

function offsetPolyline(pts, dx, dy, scale = 1) {
  return pts.map((p, i) => [p[0] + dx + Math.sin(i * 0.7) * scale, p[1] + dy]);
}

/* ------------------------------------------------------------------ mount */
function makeDonkey(phi, speed = 1, wind = 0.4) {
  const legs = 4;
  const step = Math.sin(phi * 2) * 0.8;
  const bodyY = -138;
  const torso = smoothClosed([
    [-92, bodyY + 6], [-74, bodyY - 26], [-24, bodyY - 40], [34, bodyY - 34],
    [66, bodyY - 8], [50, bodyY + 22], [4, bodyY + 28], [-48, bodyY + 24], [-88, bodyY + 16],
  ], 7);
  const neckPts = smoothPath([[32, bodyY - 22], [64, bodyY - 58], [72, bodyY - 94]], 6);
  const head = smoothClosed([
    [66, bodyY - 94], [92, bodyY - 102], [110, bodyY - 90], [104, bodyY - 74],
    [82, bodyY - 66], [68, bodyY - 72],
  ], 5);
  const ears = [
    smoothPath([[72, bodyY - 98], [62, bodyY - 124], [78, bodyY - 108]], 3),
    smoothPath([[80, bodyY - 104], [86, bodyY - 130], [94, bodyY - 108]], 3),
  ];
  const tail = smoothPath([[-92, bodyY - 4], [-116, bodyY + 14], [-108 + wind * 8, bodyY + 54]], 5);
  const mkLeg = (x, ph, front) => {
    const knee = [x + Math.sin(ph) * 12, bodyY + 35 + (front ? 8 : 0)];
    const ankle = [x + Math.sin(ph) * 19, -10 - Math.max(0, Math.cos(ph)) * 11];
    return {
      hip: [x, bodyY + 22], knee, ankle,
      line: smoothPath([[x, bodyY + 20], knee, ankle], 4),
      hoof: [ankle[0] + 2, ankle[1]],
    };
  };
  const legsPts = [
    mkLeg(-68, phi, false), mkLeg(-28, phi + Math.PI, false),
    mkLeg(38, phi + 0.7, true), mkLeg(54, phi + Math.PI + 0.7, true),
  ];
  const saddle = smoothClosed([[-44, bodyY - 31], [6, bodyY - 35], [14, bodyY - 20], [-38, bodyY - 14]], 5);
  const blanket = smoothPath([[-56, bodyY - 18], [-24, bodyY + 2], [20, bodyY + 2], [52, bodyY - 14]], 8);
  const stirrup = smoothPath([[4, bodyY - 12], [14, bodyY + 34], [4, bodyY + 45], [-6, bodyY + 32]], 3);
  const reins = smoothPath([[84, bodyY - 82], [32, bodyY - 52], [-4, bodyY - 30]], 8);
  return {
    kind: 'donkey',
    torso, neck: neckPts, head, ears, tail, legs: legsPts, saddle, blanket, stirrup, reins,
    bodyY,
    parts: [
      { id: 'donkeyTail', role: 'mount', kind: 'line', pts: tail, width: 3 },
      ...legsPts.map((l, i) => ({ id: 'donkeyLeg' + i, role: 'mount', kind: 'line', pts: l.line, width: 7 })),
      { id: 'donkeyBody', role: 'mount', kind: 'poly', pts: torso, closed: true },
      { id: 'donkeyNeck', role: 'mount', kind: 'line', pts: neckPts, width: 22 },
      { id: 'donkeyHead', role: 'mount', kind: 'poly', pts: head, closed: true },
      ...ears.map((e, i) => ({ id: 'donkeyEar' + i, role: 'mount', kind: 'line', pts: e, width: 5 })),
      { id: 'donkeySaddle', role: 'mount', kind: 'poly', pts: saddle, closed: true },
      { id: 'donkeyBlanket', role: 'mount', kind: 'line', pts: blanket, width: 5 },
      { id: 'donkeyRein', role: 'mount', kind: 'line', pts: reins, width: 1.4 },
      { id: 'donkeyStirrup', role: 'mount', kind: 'line', pts: stirrup, width: 2 },
    ],
  };
}

function makeHorse(phi, speed = 1, wind = 0.3) {
  const gallop = Math.sin(phi * 2);
  const bodyY = -166;
  const torso = smoothClosed([
    [-118, bodyY + 8], [-94, bodyY - 34], [-30, bodyY - 50], [38, bodyY - 42],
    [84, bodyY - 16], [65, bodyY + 22], [4, bodyY + 30], [-66, bodyY + 26], [-112, bodyY + 18],
  ], 7);
  const neck = smoothPath([[34, bodyY - 34], [72, bodyY - 76], [90, bodyY - 118]], 7);
  const head = smoothClosed([
    [84, bodyY - 122], [126, bodyY - 126], [148, bodyY - 105], [132, bodyY - 84],
    [102, bodyY - 82], [86, bodyY - 96],
  ], 5);
  const mane = smoothPath([[36, bodyY - 42], [48, bodyY - 80], [68, bodyY - 118], [84, bodyY - 126]], 8);
  const tail = smoothPath([[-116, bodyY - 2], [-158, bodyY + 18 + gallop * 6], [-150 - wind * 20, bodyY + 86]], 6);
  const mkLeg = (x, ph, front) => {
    const knee = [x + Math.sin(ph) * 25, bodyY + 42 + (front ? 0 : 4)];
    const ankle = [x + Math.sin(ph) * 54, -9 - Math.max(0, Math.cos(ph)) * 26];
    return { line: smoothPath([[x, bodyY + 28], knee, ankle], 5), ankle };
  };
  const legs = [
    mkLeg(-84, phi, false), mkLeg(-32, phi + Math.PI * 0.85, false),
    mkLeg(56, phi + 0.5, true), mkLeg(86, phi + Math.PI * 0.4, true),
  ];
  const saddle = smoothClosed([[-54, bodyY - 38], [10, bodyY - 44], [26, bodyY - 22], [-42, bodyY - 16]], 5);
  return {
    kind: 'horse',
    torso, neck, head, mane, tail, legs, saddle, bodyY,
    parts: [
      { id: 'horseTail', role: 'mount', kind: 'line', pts: tail, width: 13 },
      ...legs.map((l, i) => ({ id: 'horseLeg' + i, role: 'mount', kind: 'line', pts: l.line, width: 10 })),
      { id: 'horseBody', role: 'mount', kind: 'poly', pts: torso, closed: true },
      { id: 'horseNeck', role: 'mount', kind: 'line', pts: neck, width: 30 },
      { id: 'horseMane', role: 'mount', kind: 'line', pts: mane, width: 6 },
      { id: 'horseHead', role: 'mount', kind: 'poly', pts: head, closed: true },
      { id: 'horseSaddle', role: 'mount', kind: 'poly', pts: saddle, closed: true },
    ],
  };
}

/* ------------------------------------------------------------------ figure */
/**
 * pose — the shared traveller.
 * phase omitted → φ = 2πt. Pass `phase` to quantise (shadow puppet / pixel).
 * mode: 'walk' | 'ride' | 'boat'
 * mount: 'donkey' | 'horse' (ride only)
 */
export function pose(opts = {}) {
  const t = opts.t ?? 0;
  const phase = opts.phase ?? (t / RIG.beatCycle) * TAU;
  const mode = opts.mode || 'walk';
  const wind = clamp01(opts.wind ?? 0.35);
  const lean = opts.lean ?? 0;
  const look = opts.look ?? 0;
  const elder = !!opts.elder;
  const bornChild = opts.child ?? false;
  const staffOn = opts.staff !== false;
  const speed = opts.speed ?? 1;
  const hasMount = mode === 'ride' && (opts.mount === 'donkey' || opts.mount === 'horse');
  const mount = hasMount ? (opts.mount === 'horse' ? makeHorse(phase, speed, wind) : makeDonkey(phase, speed, wind)) : null;
  const riding = !!mount;
  const baseY = riding ? (mount.kind === 'horse' ? -214 : -196) : 0;
  const bodyBob = riding ? Math.sin(phase * 2) * 1.8 : -Math.abs(Math.cos(phase)) * 3.2 * speed;
  const sway = Math.sin(phase) * (riding ? 2.4 : 2.0) * speed;
  const bob = bodyBob;
  const tilt = lean - (riding ? 0.02 : 0.045) + Math.sin(phase) * 0.007;
  const hx = look * 5 + sway * 0.25;
  const headY = RIG.headY + bob + tilt * 24 + (riding ? 4 : 0);
  const headX = hx + 3;
  const shoulderY = RIG.shoulderY + bob + tilt * 12;
  const waistY = -174 + bob * 0.85 + tilt * 6;
  const hemY = RIG.hemY + bob * 0.35 + (riding ? 48 : 0);
  const bodyC = [sway * 0.4, 0];

  // --------------------------------------------------------------- robe body
  const robe = smoothClosed([
    [-14, -280 + bob], [-35, -264 + bob], [-50, -236 + bob], [-43, -200 + bob],
    [-50, -160 + bob], [-68, -94 + bob], [-84 + wind * 19, hemY - 6], [-48, hemY + 4],
    [-4, hemY - 4], [42, hemY + 2], [84 + wind * 12, hemY - 10], [63, -98 + bob],
    [52, -154 + bob], [58, -208 + bob], [48, -246 + bob], [28, -270 + bob],
  ], 8);
  const collar = [
    smoothPath([[-18, -274 + bob], [2, -244 + bob], [22, -269 + bob]], 4),
    smoothPath([[-2, -244 + bob], [-4, -198 + bob], [-1, -174 + bob]], 4),
  ];
  const folds = [];
  for (let k = 0; k < 5; k++) {
    const s = k / 4;
    folds.push(smoothPath([
      [lerp(-45, 50, s) + sway, -196 + bob],
      [lerp(-52, 58, s) - wind * 10 + 4, -130 + bob],
      [lerp(-70, 76, s) + wind * 16, hemY - 10],
    ], 5));
  }
  const robeTail = [
    smoothPath([[-72 + wind * 16, hemY - 3], [-112 - wind * 65, hemY + 20 + wind * 18], [-148 - wind * 80, hemY - 2 + wind * 26]], 6),
    smoothPath([[-58 + wind * 10, hemY + 1], [-94 - wind * 54, hemY + 46], [-118 - wind * 72, hemY + 35]], 5),
  ];
  const sashY = waistY + 6;
  const sash = smoothPath([[-46, sashY], [-18, sashY + 4], [16, sashY + 1], [50, sashY - 4]], 8);
  const sashTails = [
    smoothPath([[34, sashY + 2], [50 + wind * 18, sashY + 48], [34 + wind * 34, sashY + 98]], 6),
    smoothPath([[30, sashY + 3], [27 + wind * 8, sashY + 58], [12 + wind * 22, sashY + 88]], 5),
  ];

  // -------------------------------------------------------------- scroll pack
  const scrollC = [-49 - wind * 4, -214 + bob];
  const scrollAng = -0.58 + wind * 0.04;
  const ca = Math.cos(scrollAng), sa = Math.sin(scrollAng);
  const roll = (dx, dy, len, thick) => {
    const ox = scrollC[0] + dx, oy = scrollC[1] + dy;
    const pts = [];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push([ox - len / 2 + u * len, oy + u * 8]);
    }
    // draw as a leaning capsule in rig-space
    const half = thick / 2;
    const outline = [
      [ox - ca * len / 2 - sa * half, oy - sa * len / 2 + ca * half],
      [ox + ca * len / 2 - sa * half, oy + sa * len / 2 + ca * half],
      [ox + ca * len / 2 + sa * half, oy + sa * len / 2 - ca * half],
      [ox - ca * len / 2 + sa * half, oy - sa * len / 2 - ca * half],
    ];
    return { pts, outline, end: [ox + ca * len / 2, oy + sa * len / 2], r: half };
  };
  const scroll = {
    rolls: [roll(-6, -12, 104, 16), roll(10, 8, 92, 13), roll(-18, 22, 76, 10)],
    strap: smoothPath([[scrollC[0], scrollC[1] - 30], [12, -228 + bob], [46, -210 + bob]], 5),
    ribbon: smoothPath([[scrollC[0] - 38, scrollC[1] + 16], [-88 - wind * 20, -184 + bob], [-111 - wind * 36, -150 + bob]], 5),
  };
  // giant brush / sword props are scene-owned; a rolled poem is always present.

  // ------------------------------------------------------------------- arms
  const armSwing = Math.sin(phase) * (riding ? 3 : 9) * speed;
  const staffHand = [50 + armSwing * 0.3, -152 + bob + (riding ? -20 : 0)];
  const staffShoulder = [32, -243 + bob + (riding ? -12 : 0)];
  const staffElbow = [45, -194 + bob + (riding ? -16 : 0)];
  const staffArm = { shoulder: staffShoulder, elbow: staffElbow, hand: staffHand, side: 1 };
  const sleeveStaff = smoothClosed([
    [staffShoulder[0] + 4, staffShoulder[1] - 9],
    [staffShoulder[0] + 25, staffShoulder[1] - 3],
    [staffElbow[0] + 24, staffElbow[1] - 2],
    [staffHand[0] + 35, staffHand[1] + 18],
    [staffHand[0] + 5, staffHand[1] + 10],
    [staffElbow[0] - 8, staffElbow[1] + 22],
    [staffShoulder[0] - 12, staffShoulder[1] + 10],
  ], 7);
  const backSwing = -Math.sin(phase) * 12 * speed;
  const backHand = [-49 + backSwing, -141 + bob + (riding ? -18 : 0)];
  const backShoulder = [-32, -241 + bob + (riding ? -12 : 0)];
  const backElbow = [-49 + backSwing * 0.35, -191 + bob + (riding ? -14 : 0)];
  const backArm = { shoulder: backShoulder, elbow: backElbow, hand: backHand, side: -1 };
  const sleeveBack = smoothClosed([
    [backShoulder[0] - 4, backShoulder[1] - 9],
    [backShoulder[0] - 28, backShoulder[1] + 1],
    [backElbow[0] - 25 - wind * 10, backElbow[1] + 2],
    [backHand[0] - 38 - wind * 26, backHand[1] + 18 + wind * 10],
    [backHand[0] - 2, backHand[1] + 9],
    [backElbow[0] + 8, backElbow[1] + 20],
    [backShoulder[0] + 11, backShoulder[1] + 12],
  ], 7);
  const sleeveTail = [
    smoothPath([[backHand[0] - 28, backHand[1] + 12], [backHand[0] - 68 - wind * 40, backHand[1] + 35], [backHand[0] - 98 - wind * 56, backHand[1] + 18]], 6),
  ];

  // ------------------------------------------------------------------- legs
  const stride = riding ? 6 : 25 * speed;
  const stepLift = riding ? 0 : 13 * speed;
  const mkLeg = (side, legPhase) => {
    const swing = Math.sin(legPhase) * stride;
    const lift = Math.max(0, Math.cos(legPhase)) * stepLift;
    const hip = [side * 12 - 2, (riding ? -150 : -100) + bob];
    let knee, ankle, foot;
    if (riding) {
      knee = [side * 38, -142 + bob];
      ankle = [side * 48, -101 + bob];
      foot = [side * 53, -93 + bob];
    } else {
      knee = [swing * 0.55 + side * 8, -66 - lift * 0.5 + bob * 0.4];
      ankle = [swing + side * 6, -10 - lift];
      foot = [swing + side * 6 + 14, -6 - lift * 0.95];
    }
    const line = smoothPath([hip, knee, ankle], 5);
    const boot = smoothClosed([
      [ankle[0] - 7, ankle[1] - 2], [ankle[0] + 7, ankle[1] - 4],
      [foot[0] + 6, foot[1] + 1], [foot[0] - 4, foot[1] + 5], [ankle[0] - 9, ankle[1] + 3],
    ], 4);
    return { hip, knee, ankle, foot, line, boot, side, visible: !riding };
  };
  const legFar = mkLeg(-1, phase + Math.PI);
  const legNear = mkLeg(1, phase);

  // ------------------------------------------------------------------- head
  const headC = [headX, headY];
  const headR = 22;
  const neckPts = [smoothPath([[headX - 2, headY + 17], [headX - 6, headY + 38], [headX - 1, headY + 52 + bob]], 4)];
  const jawY = headY + 16;
  const beardLen = elder ? 74 : bornChild ? 8 : (opts.beard != null ? 58 * opts.beard : 44);
  const beardColor = elder ? 'rgba(238,235,224,0.95)' : null;
  const beard = smoothClosed([
    [headX - 12, jawY - 2], [headX - 5, jawY + 5],
    [headX + 3 + wind * 8, jawY + beardLen * 0.55],
    [headX - 2 + wind * 16, jawY + beardLen],
    [headX - 13 + wind * 5, jawY + beardLen * 0.56],
    [headX - 20, jawY + 12],
  ], 5);
  const moustache = [
    smoothPath([[headX + 4, headY + 11], [headX + 17, headY + 14], [headX + 24, headY + 22]], 3),
    smoothPath([[headX - 2, headY + 12], [headX + 9, headY + 19], [headX + 11, headY + 27]], 3),
  ];
  const nose = [
    [headX + 17, headY - 5], [headX + 26, headY + 6], [headX + 18, headY + 10], [headX + 15, headY + 4],
  ];
  const eye = { c: [headX + 10, headY - 4], r: 1.8 };
  const ear = { c: [headX - 14, headY + 2], rx: 5.5, ry: 8.5 };
  const hair = smoothPath([[headX - 18, headY - 11], [headX - 24, headY + 8], [headX - 18, headY + 16]], 4);
  const cap = smoothClosed([
    [headX - 23, headY - 9], [headX - 19, headY - 29], [headX - 6, headY - 40],
    [headX + 15, headY - 36], [headX + 25, headY - 17], [headX + 20, headY - 4],
    [headX + 3, headY - 10], [headX - 10, headY - 6],
  ], 6);
  const capBow = smoothPath([[headX - 21, headY - 25], [headX - 38, headY - 22], [headX - 48, headY - 34]], 4);
  const capTails = [
    smoothPath([[headX - 20, headY - 22], [headX - 55 - wind * 18, headY - 12], [headX - 82 - wind * 34, headY + 5 + wind * 12]], 5),
    smoothPath([[headX - 18, headY - 16], [headX - 47 - wind * 24, headY + 3], [headX - 70 - wind * 41, headY + 28]], 5),
  ];
  const hat = opts.hat || 'futou';

  // ------------------------------------------------------------------ staff
  const staffPts = staffOn && !riding ? smoothPath([
    [staffHand[0] - 7, staffHand[1] + 4], [staffHand[0] - 14, staffHand[1] + 74],
    [staffHand[0] - 19, -2], [staffHand[0] - 23, 12],
  ], 5) : staffOn ? smoothPath([[staffHand[0], staffHand[1]], [staffHand[0] - 15, staffHand[1] + 55]], 4) : null;
  const staffTop = staffOn ? [staffHand[0] - 2, staffHand[1] - 28] : null;
  const staffKnot = staffOn ? smoothPath([[staffHand[0] - 3, staffHand[1] - 31], [staffHand[0] + 6, staffHand[1] - 40], [staffHand[0] + 13, staffHand[1] - 33]], 4) : null;

  // ------------------------------------------------------------- flat parts
  const parts = [];
  if (mount) parts.push(...mount.parts);
  parts.push(
    { id: 'scrollRibbon', role: 'scroll', kind: 'line', pts: scroll.ribbon, width: 1.6 },
    { id: 'scrollStrap', role: 'scroll', kind: 'line', pts: scroll.strap, width: 4 },
    ...scroll.rolls.map((r, i) => ({ id: 'scrollRoll' + i, role: 'scroll', kind: 'poly', pts: r.outline, closed: true })),
    { id: 'robeTail0', role: 'robe-tail', kind: 'poly', pts: robeTail[0], closed: false },
    { id: 'robeTail1', role: 'robe-tail', kind: 'poly', pts: robeTail[1], closed: false },
    { id: 'sashTail0', role: 'sash', kind: 'line', pts: sashTails[0], width: 2.2 },
    { id: 'sashTail1', role: 'sash', kind: 'line', pts: sashTails[1], width: 1.6 },
    { id: 'sleeveFar', role: 'sleeve-far', kind: 'poly', pts: sleeveBack, closed: true },
    { id: 'sleeveTail', role: 'sleeve-tail', kind: 'poly', pts: sleeveTail[0], closed: false },
    { id: 'legFar', role: 'leg-far', kind: 'line', pts: legFar.line, width: 8 },
    { id: 'bootFar', role: 'leg-far', kind: 'poly', pts: legFar.boot, closed: true },
    { id: 'legNear', role: 'leg-near', kind: 'line', pts: legNear.line, width: 8 },
    { id: 'bootNear', role: 'leg-near', kind: 'poly', pts: legNear.boot, closed: true },
    { id: 'robe', role: 'body', kind: 'poly', pts: robe, closed: true },
    { id: 'sash', role: 'sash', kind: 'line', pts: sash, width: 7 },
    ...folds.map((f, i) => ({ id: 'fold' + i, role: 'detail', kind: 'line', pts: f, width: 1.5 })),
    ...collar.map((c, i) => ({ id: 'collar' + i, role: 'detail', kind: 'line', pts: c, width: 2 })),
    { id: 'sleeveNear', role: 'sleeve-near', kind: 'poly', pts: sleeveStaff, closed: true },
    { id: 'neck', role: 'skin', kind: 'line', pts: neckPts[0], width: 11 },
    { id: 'head', role: 'skin', kind: 'circle', c: headC, r: headR },
    { id: 'nose', role: 'skin', kind: 'poly', pts: nose, closed: true },
    { id: 'ear', role: 'skin', kind: 'ellipse', c: ear.c, rx: ear.rx, ry: ear.ry },
    { id: 'eye', role: 'eye', kind: 'dot', c: eye.c, r: eye.r },
    { id: 'hair', role: 'hair', kind: 'line', pts: hair, width: 6 },
    { id: 'cap', role: 'cap', kind: 'poly', pts: cap, closed: true },
    { id: 'capBow', role: 'cap', kind: 'line', pts: capBow, width: 3 },
    ...capTails.map((c, i) => ({ id: 'capTail' + i, role: 'cap', kind: 'line', pts: c, width: 2.2 })),
    { id: 'beard', role: 'beard', kind: 'poly', pts: beard, closed: true },
    ...moustache.map((m, i) => ({ id: 'moustache' + i, role: 'hair', kind: 'line', pts: m, width: 1.3 })),
  );
  if (staffPts) parts.push(
    { id: 'staff', role: 'staff', kind: 'line', pts: staffPts, width: 3.2 },
    { id: 'staffTop', role: 'staff', kind: 'line', pts: staffTop ? smoothPath([staffPts[0], staffTop], 2) : [], width: 2.2 },
    { id: 'staffKnot', role: 'staff', kind: 'line', pts: staffKnot || [], width: 2.4 },
  );

  return {
    t, phase, mode, mount, riding, elder, hat,
    colors: {
      beard: beardColor,
      hair: elder ? 'rgba(230,227,216,0.9)' : '#191510',
    },
    bodyBob: bob, tilt, sway,
    robe, robeTail, collar, folds, sash, sashTails, scroll,
    arms: { near: staffArm, far: backArm, sleeveNear: sleeveStaff, sleeveFar: sleeveBack, sleeveTail },
    legs: { near: legNear, far: legFar, stride, lift: stepLift },
    head: {
      c: headC, r: headR, nose, eye, ear, hair, beard, moustache,
      cap, capBow, capTails, neck: neckPts[0],
    },
    staff: { pts: staffPts, top: staffTop, knot: staffKnot, hand: staffHand },
    bodyC, headX, headY, shoulderY, hemY,
    parts,
    bounds: riding
      ? { x0: -200, x1: 200, y0: mount.kind === 'horse' ? -460 : -430, y1: 6 }
      : { x0: -180, x1: 130, y0: -335, y1: 10 },
  };
}

/* ------------------------------------------------------------------- boat */
/** The post-768 form of the rig: a leaf of a boat on the Xiang. */
export function boatPose(opts = {}) {
  const t = opts.t ?? 0;
  const phase = opts.phase ?? (t / RIG.beatCycle) * TAU;
  const wind = clamp01(opts.wind ?? 0.3);
  const row = Math.sin(phase);
  const row2 = Math.cos(phase);
  const bob = Math.sin(phase * 2 + 0.7) * 2.5;
  const x = -10;
  const y = -6 + bob;
  const hull = smoothClosed([
    [x - 280, y - 28], [x - 236, y + 3], [x - 160, y + 25], [x - 20, y + 32],
    [x + 150, y + 29], [x + 252, y + 7], [x + 300, y - 34], [x + 286, y - 26],
    [x + 170, y - 8], [x + 20, y - 3], [x - 130, y - 9], [x - 242, y - 36], [x - 270, y - 41],
  ], 7);
  const deck = smoothPath([[x - 260, y - 22], [x - 170, y + 4], [x - 30, y + 10], [x + 150, y + 7], [x + 256, y - 18]], 8);
  const planks = [];
  for (let i = 0; i < 3; i++) {
    planks.push(smoothPath([
      [x - 240 + i * 7, y + 2 + i * 6], [x - 80, y + 18 + i * 4], [x + 110, y + 18 + i * 3], [x + 260, y - 2 + i * 3],
    ], 10));
  }
  const bowRope = smoothPath([[x + 290, y - 35], [x + 326, y - 45], [x + 338 + wind * 6, y - 18]], 5);
  // standing boatman (elder, cloak, wide hat)
  const figX = x - 168, figY = y - 12;
  const head = { c: [figX + 8, figY - 188], r: 18 };
  const hat = smoothClosed([
    [figX - 30, figY - 198], [figX - 16, figY - 222], [figX + 2, figY - 228],
    [figX + 24, figY - 220], [figX + 38, figY - 198], [figX + 20, figY - 190], [figX - 12, figY - 193],
  ], 5);
  const cloak = smoothClosed([
    [figX - 12, figY - 172], [figX - 34, figY - 140], [figX - 48, figY - 82],
    [figX - 56 - wind * 12, figY - 20], [figX - 18, figY - 8], [figX + 28, figY - 14],
    [figX + 42, figY - 74], [figX + 26, figY - 142], [figX + 16, figY - 172],
  ], 7);
  const cloakFolds = [
    smoothPath([[figX + 2, figY - 152], [figX - 6, figY - 100], [figX + 2, figY - 34]], 5),
    smoothPath([[figX - 24, figY - 138], [figX - 36, figY - 90], [figX - 34, figY - 36]], 5),
  ];
  const oarHand = [figX + 24, figY - 107];
  const oarOuter = [x + 154 + row * 24, y + 4 + row2 * 5];
  const oar = smoothPath([oarHand, [x + 40, y - 14], oarOuter], 5);
  const oarBlade = smoothClosed([
    [oarOuter[0] - 8, oarOuter[1] - 2], [oarOuter[0] + 32, oarOuter[1] + 12],
    [oarOuter[0] + 34, oarOuter[1] + 22], [oarOuter[0] - 6, oarOuter[1] + 9],
  ], 4);
  const arm = smoothPath([[figX + 10, figY - 150], [figX + 26, figY - 126], oarHand], 5);
  const passenger = [];
  for (let k = 0; k < 3; k++) {
    const px = x + 22 + k * 56 + Math.sin(phase + k) * 1.2;
    const py = y - 34;
    passenger.push({
      body: smoothClosed([[px - 25, py], [px - 18, py - 42], [px, py - 56], [px + 19, py - 40], [px + 27, py]], 5),
      head: { c: [px + 2, py - 66], r: 11 },
      hat: smoothPath([[px - 16, py - 68], [px + 2, py - 84], [px + 20, py - 68]], 3),
    });
  }
  const lantern = { x: x + 232, y: y - 92 };
  const lanternRope = smoothPath([[x + 256, y - 10], [x + 248, y - 56], [lantern.x + 5, lantern.y - 18]], 5);
  const parts = [
    { id: 'boatHull', role: 'boat', kind: 'poly', pts: hull, closed: true },
    ...passenger.flatMap((p, i) => [
      { id: 'passengerBody' + i, role: 'passenger', kind: 'poly', pts: p.body, closed: true },
      { id: 'passengerHead' + i, role: 'passenger', kind: 'circle', c: p.head.c, r: p.head.r },
    ]),
    { id: 'boatCloak', role: 'boatman', kind: 'poly', pts: cloak, closed: true },
    ...cloakFolds.map((f, i) => ({ id: 'cloakFold' + i, role: 'boatman-detail', kind: 'line', pts: f, width: 2 })),
    { id: 'boatmanHead', role: 'skin', kind: 'circle', c: head.c, r: head.r },
    { id: 'boatmanHat', role: 'cap', kind: 'poly', pts: hat, closed: true },
    { id: 'oar', role: 'oar', kind: 'line', pts: oar, width: 4 },
    { id: 'oarBlade', role: 'oar', kind: 'poly', pts: oarBlade, closed: true },
    { id: 'boatArm', role: 'boatman', kind: 'line', pts: arm, width: 7 },
    { id: 'deck', role: 'boat-detail', kind: 'line', pts: deck, width: 2 },
    ...planks.map((p, i) => ({ id: 'plank' + i, role: 'boat-detail', kind: 'line', pts: p, width: 1.4 })),
    { id: 'bowRope', role: 'rope', kind: 'line', pts: bowRope, width: 1.3 },
    { id: 'lanternRope', role: 'rope', kind: 'line', pts: lanternRope, width: 1 },
  ];
  return {
    t, phase, mode: 'boat', riding: false, elder: true, hat: 'straw',
    hull, deck, planks, bowRope, boatman: { head, hat, cloak, folds: cloakFolds, oarHand, arm }, oar, oarBlade,
    passenger, lantern, lanternRope, row, row2, bob,
    parts,
    colors: { beard: 'rgba(238,235,224,0.9)', hair: 'rgba(230,227,216,0.9)' },
    bounds: { x0: x - 290, x1: x + 350, y0: y - 240, y1: 48 },
  };
}

/* ---------------------------------------------------------------- helpers */
/** Deep-map a pose into scene coordinates. */
export function placed(pos, place = {}) {
  const s = place.scale ?? 1;
  const rot = place.rot ?? 0;
  const flip = place.flip ? -1 : 1;
  const c = Math.cos(rot), sn = Math.sin(rot);
  const ox = place.x ?? 0, oy = place.y ?? 0;
  const T = (p) => {
    const x = p[0] * s * flip, y = p[1] * s;
    return [ox + x * c - y * sn, oy + x * sn + y * c];
  };
  const isPt = (v) => Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
  const walk = (v, key) => {
    if (isPt(v)) return T(v);
    if (typeof v === 'number') {
      if (key === 'r' || key === 'rx' || key === 'ry' || key === 'width' || key === 'stride' || key === 'lift' || key === 'bodyBob') return v * s;
      return v;
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v)) out[k] = walk(v[k], k);
      return out;
    }
    return v;
  };
  const out = walk(pos);
  out.place = { ...place, scale: s, rot, flip };
  // out.parts was already deep-mapped by walk(); transforming it a second time
  // would double the placement offset. The walker also scales radii, so no
  // extra fix-up pass is needed.
  return out;
}

/** Style-agnostic flat list of parts, ordered back to front. */
export function rigParts(pos) {
  return pos.parts || [];
}

function poly(ctx, pts, close = true) {
  if (!pts || pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

/**
 * A neutral ink rendering of the rig (used by tests and as a fallback).
 * Era renderers should use `rigParts` and their own materials instead.
 */
export function drawRig(ctx, pos, opts = {}) {
  const color = opts.color || '#1c1710';
  const alpha = opts.alpha ?? 1;
  const line = opts.line || null;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const p of rigParts(pos)) {
    if (!p.pts && p.kind !== 'circle' && p.kind !== 'dot' && p.kind !== 'ellipse') continue;
    if (p.role === 'mount') {
      ctx.fillStyle = opts.mountFill || color;
      ctx.strokeStyle = line || color;
      ctx.lineWidth = opts.mountWidth || 2;
    } else if (p.role === 'skin') {
      ctx.fillStyle = opts.skin || color;
      ctx.strokeStyle = line || color;
    } else if (p.role === 'cap' || p.role === 'hair' || p.role === 'beard') {
      ctx.fillStyle = opts.hair || color;
      ctx.strokeStyle = line || color;
    } else if (p.role === 'scroll') {
      ctx.fillStyle = opts.scroll || color;
      ctx.strokeStyle = line || color;
    } else {
      ctx.fillStyle = opts.robe || color;
      ctx.strokeStyle = line || color;
    }
    if (p.kind === 'poly') {
      poly(ctx, p.pts, p.closed);
      if (opts.fill !== false) ctx.fill();
      if (line || opts.stroke) ctx.stroke();
    } else if (p.kind === 'line') {
      poly(ctx, p.pts, false);
      ctx.lineWidth = p.width || 2;
      ctx.strokeStyle = line || color;
      ctx.stroke();
    } else if (p.kind === 'circle') {
      ctx.beginPath(); ctx.arc(p.c[0], p.c[1], p.r, 0, TAU);
      if (opts.fill !== false) ctx.fill();
      if (line || opts.stroke) ctx.stroke();
    } else if (p.kind === 'ellipse') {
      ctx.beginPath(); ctx.ellipse(p.c[0], p.c[1], p.rx, p.ry, 0, 0, TAU);
      if (opts.fill !== false) ctx.fill();
      if (line || opts.stroke) ctx.stroke();
    } else if (p.kind === 'dot') {
      ctx.beginPath(); ctx.arc(p.c[0], p.c[1], p.r, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

export function drawSilhouette(ctx, pos, opts = {}) {
  const color = opts.color || '#15110c';
  const alpha = opts.alpha ?? 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  for (const p of rigParts(pos)) {
    if (!p.pts && p.kind !== 'circle' && p.kind !== 'dot' && p.kind !== 'ellipse') continue;
    if (p.kind === 'poly') {
      if (!p.closed && p.role !== 'boat' && p.role !== 'robe-tail' && p.role !== 'sleeve-tail') continue;
      poly(ctx, p.pts, p.closed);
      ctx.fill();
    } else if (p.kind === 'line') {
      if (p.role === 'detail' || p.role === 'boat-detail' || p.role === 'rope') continue;
      poly(ctx, p.pts, false);
      ctx.lineWidth = p.width || 2;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if (p.kind === 'circle') {
      ctx.beginPath(); ctx.arc(p.c[0], p.c[1], p.r, 0, TAU); ctx.fill();
    } else if (p.kind === 'ellipse') {
      ctx.beginPath(); ctx.ellipse(p.c[0], p.c[1], p.rx, p.ry, 0, 0, TAU); ctx.fill();
    } else if (p.kind === 'dot') {
      ctx.beginPath(); ctx.arc(p.c[0], p.c[1], p.r, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

export function drawWire(ctx, pos, opts = {}) {
  const color = opts.color || '#f0e7d2';
  const width = opts.width ?? 1.5;
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const p of rigParts(pos)) {
    if (p.kind === 'poly') {
      poly(ctx, p.pts, p.closed);
      ctx.lineWidth = width * (p.role === 'body' || p.role === 'mount' ? 1.2 : 0.8);
      ctx.stroke();
    } else if (p.kind === 'line') {
      poly(ctx, p.pts, false);
      ctx.lineWidth = width * (p.width ? Math.min(1.4, p.width / 7) : 0.8);
      ctx.stroke();
    } else if (p.kind === 'circle' || p.kind === 'ellipse') {
      ctx.beginPath();
      if (p.kind === 'circle') ctx.arc(p.c[0], p.c[1], p.r, 0, TAU);
      else ctx.ellipse(p.c[0], p.c[1], p.rx, p.ry, 0, 0, TAU);
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Sample a pose into deterministic points (for point clouds / particle figures). */
export function sampleRig(pos, opts = {}) {
  const edgeStep = opts.edgeStep ?? 7;
  const fillStep = opts.fillStep ?? 13;
  const seed = opts.seed ?? 19;
  const r = mulberry32(hash('rigsample', seed));
  const pts = [];
  const addPoly = (polyPts, closed, fill) => {
    if (!polyPts || polyPts.length < 2) return;
    for (let i = 0; i < polyPts.length; i++) {
      const a = polyPts[i], b = polyPts[(i + 1) % polyPts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(len / edgeStep));
      for (let k = 0; k < n; k++) pts.push([lerp(a[0], b[0], k / n) + (r() - 0.5) * 1.2, lerp(a[1], b[1], k / n) + (r() - 0.5) * 1.2]);
    }
    if (fill && closed) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of polyPts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      const step = Math.max(4, fillStep);
      for (let y = y0; y < y1; y += step) {
        for (let x = x0; x < x1; x += step) {
          // cheap point-in-polygon
          let inside = false;
          for (let i = 0, j = polyPts.length - 1; i < polyPts.length; j = i++) {
            const xi = polyPts[i][0], yi = polyPts[i][1], xj = polyPts[j][0], yj = polyPts[j][1];
            if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) inside = !inside;
          }
          if (inside) pts.push([x + (r() - 0.5) * step * 0.8, y + (r() - 0.5) * step * 0.8]);
        }
      }
    }
  };
  for (const p of rigParts(pos)) {
    if (p.kind === 'poly') addPoly(p.pts, p.closed !== false, !!opts.fill);
    else if (p.kind === 'line') {
      for (let i = 1; i < p.pts.length; i++) {
        const a = p.pts[i - 1], b = p.pts[i];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const n = Math.max(1, Math.ceil(len / edgeStep));
        for (let k = 0; k < n; k++) pts.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
      }
    } else if (p.kind === 'circle') {
      const n = Math.max(12, Math.round(p.r * 1.5));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        pts.push([p.c[0] + Math.cos(a) * p.r, p.c[1] + Math.sin(a) * p.r]);
      }
    } else if (p.kind === 'ellipse') {
      const n = 24;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        pts.push([p.c[0] + Math.cos(a) * p.rx, p.c[1] + Math.sin(a) * p.ry]);
      }
    }
  }
  return pts;
}

/** A tiny pose helper for secondary figures (old woman, officials, boat family). */
export function walkerPose(opts = {}) {
  const t = opts.t ?? 0;
  const phase = opts.phase ?? t * TAU;
  const sway = Math.sin(phase) * 2;
  const bob = -Math.abs(Math.cos(phase)) * 2;
  const robe = smoothClosed([
    [-10, -170 + bob], [-26, -150 + bob], [-32, -100 + bob], [-46, -8 + bob],
    [-8, 2 + bob], [20, -6 + bob], [26, -98 + bob], [14, -150 + bob], [8, -170 + bob],
  ], 6);
  const head = { c: [2 + sway, -192 + bob], r: 16 };
  const hat = smoothClosed([[-16, -199 + bob], [-2, -214 + bob], [14, -207 + bob], [18, -195 + bob], [-12, -193 + bob]], 4);
  const staff = smoothPath([[24, -128 + bob], [35, -62 + bob], [40, -4 + bob]], 4);
  const parts = [
    { id: 'oldRobe', role: 'body', kind: 'poly', pts: robe, closed: true },
    { id: 'oldHead', role: 'skin', kind: 'circle', c: head.c, r: head.r },
    { id: 'oldHat', role: 'cap', kind: 'poly', pts: hat, closed: true },
    { id: 'oldStaff', role: 'staff', kind: 'line', pts: staff, width: 2 },
  ];
  return { t, phase, robe, head, hat, staff, parts, colors: { hair: '#e7e2d5' }, bounds: { x0: -60, x1: 60, y0: -225, y1: 8 } };
}

export const RIG_BOUNDS = { x0: -180, x1: 130, y0: -335, y1: 10 };
