/**
 * 08 · 三维金属球体挤压 · 春望家书 / PBR Gold Spheres Crush · 757
 *
 * A dark vault, one overhead key light, 260 heavy gold spheres. In the middle of
 * it a single white letter — the family letter — is the only soft thing in the
 * frame. On the bar-2 downbeat the ransom counter snaps to 10,000两黄金 and the
 * spheres flood in and crush the letter into a narrow standing strip; the couplet
 * 【烽火连三月，家书抵万金】 survives on the paper in the shadow of the metal.
 *
 * Algorithms: a cached PBR-ish sphere sprite (multi-stop radial, bounce light,
 * environment band, specular hot spot), two precomputed relaxed packings (open
 * and crushed) interpolated with a spring, a mechanical odometer reel, and a
 * procedural letter whose waist profile pinches shut under pressure.
 */
import KIT from '../kit/index.js';
import { clamp01, lerp, smoothstep, easeOut, hash, unit, mulberry32, TAU } from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
const N_SPHERES = 260;

const C = {
  gold: '#d8aa4f',
  cream: '#f4e8ce',
  seal: '#9f2b22',
};

const LETTER = { cx: 960, cy: 586, w: 300, h: 664 };
const COUNTER = { x: 72, y: 196, w: 442, h: 156 };

/* --------------------------------------------------------------- sphere art */
let SPHERE = null, SPHERE_FG = null;
const SPHERE_VARS = [];

function paintSphere(ctx, S, tone = 0) {
  const c = S / 2, R = S * 0.47;
  ctx.clearRect(0, 0, S, S);
  const g = ctx.createRadialGradient(c - S * 0.12, c - S * 0.14, S * 0.02, c, c, R);
  g.addColorStop(0, '#fff8e2');
  g.addColorStop(0.09, '#f6e0aa');
  g.addColorStop(0.26, '#dfb96a');
  g.addColorStop(0.48, '#bd8a37');
  g.addColorStop(0.68, '#7d571f');
  g.addColorStop(0.86, '#3c280e');
  g.addColorStop(1, '#160f05');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.clip();
  // reflected room: a warm horizon band across the lower half
  const band = ctx.createLinearGradient(0, c + R * 0.04, 0, c + R * 0.78);
  band.addColorStop(0, 'rgba(255,225,168,0)');
  band.addColorStop(0.3, 'rgba(255,232,186,0.22)');
  band.addColorStop(0.44, 'rgba(255,244,214,0.08)');
  band.addColorStop(0.72, 'rgba(60,36,10,0.45)');
  band.addColorStop(1, 'rgba(20,12,4,0.65)');
  ctx.fillStyle = band;
  ctx.fillRect(0, c - R, S, R * 2);
  // bounced key light from the paper below
  const bounce = ctx.createRadialGradient(c + S * 0.06, c + R * 0.6, 2, c + S * 0.06, c + R * 0.6, R * 0.62);
  bounce.addColorStop(0, 'rgba(255,226,176,0.26)');
  bounce.addColorStop(0.5, 'rgba(255,210,150,0.07)');
  bounce.addColorStop(1, 'rgba(255,210,150,0)');
  ctx.fillStyle = bounce;
  ctx.fillRect(0, c, S, R + 2);
  // terminator: the night side of the sphere
  const term = ctx.createRadialGradient(c - R * 0.24, c - R * 0.3, R * 0.22, c + R * 0.12, c + R * 0.2, R * 1.05);
  term.addColorStop(0, 'rgba(0,0,0,0)');
  term.addColorStop(0.55, 'rgba(10,6,2,0.16)');
  term.addColorStop(0.82, 'rgba(6,4,1,0.55)');
  term.addColorStop(1, 'rgba(2,1,0,0.9)');
  ctx.fillStyle = term;
  ctx.fillRect(0, 0, S, S);
  // specular hot spot
  const sp = ctx.createRadialGradient(c - R * 0.36, c - R * 0.38, 1, c - R * 0.36, c - R * 0.38, R * 0.24);
  sp.addColorStop(0, 'rgba(255,255,252,1)');
  sp.addColorStop(0.2, 'rgba(255,250,226,0.8)');
  sp.addColorStop(0.55, 'rgba(255,240,200,0.18)');
  sp.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = sp;
  ctx.fillRect(0, 0, S, S);
  // a second, cooler specular from the vault edge
  const sp2 = ctx.createRadialGradient(c + R * 0.4, c - R * 0.5, 1, c + R * 0.4, c - R * 0.5, R * 0.2);
  sp2.addColorStop(0, 'rgba(255,244,220,0.5)');
  sp2.addColorStop(1, 'rgba(255,244,220,0)');
  ctx.fillStyle = sp2;
  ctx.fillRect(0, 0, S, S);
  // reflected strip light, kept subtle
  ctx.save();
  ctx.translate(c + R * 0.14, c + R * 0.34);
  ctx.rotate(-0.34);
  const sk = ctx.createLinearGradient(0, -4, 0, 4);
  sk.addColorStop(0, 'rgba(255,250,236,0)');
  sk.addColorStop(0.5, 'rgba(255,250,236,0.32)');
  sk.addColorStop(1, 'rgba(255,250,236,0)');
  ctx.fillStyle = sk;
  ctx.fillRect(-R * 0.3, -4, R * 0.6, 8);
  ctx.restore();
  // inner shadow at the lower rim
  const ish = ctx.createRadialGradient(c, c, R * 0.52, c, c, R);
  ish.addColorStop(0, 'rgba(0,0,0,0)');
  ish.addColorStop(0.86, 'rgba(20,10,2,0.22)');
  ish.addColorStop(1, 'rgba(10,5,1,0.62)');
  ctx.fillStyle = ish;
  ctx.fillRect(0, 0, S, S);
  if (tone === 1) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(70,46,16,0.34)';
    ctx.fillRect(0, 0, S, S);
  } else if (tone === 2) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,226,170,0.16)';
    ctx.fillRect(0, 0, S, S);
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(c, c, R - 1.2, 0, TAU);
  ctx.strokeStyle = tone === 1 ? 'rgba(220,180,120,0.16)' : 'rgba(255,220,160,0.26)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function paintSphereFg(ctx, S) {
  const small = KIT.makeCanvas(48, 48);
  const sctx = small.getContext('2d');
  paintSphere(sctx, 48, 0);
  ctx.clearRect(0, 0, S, S);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.36, S / 2, S / 2, S * 0.5);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,6,2,0.6)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.49, 0, TAU); ctx.fill();
}

/* ------------------------------------------------------------------ packing */
const PACK = { spheres: null };

function relax(list, radii, slotHalf, iters) {
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < list.length; i++) {
      const a = list[i], ra = radii[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j], rb = radii[j];
        let dx = b[0] - a[0], dy = b[1] - a[1];
        const min = ra + rb + 2;
        const d2 = dx * dx + dy * dy;
        if (d2 > min * min || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) * 0.5;
        dx /= d; dy /= d;
        a[0] -= dx * push; a[1] -= dy * push;
        b[0] += dx * push; b[1] += dy * push;
      }
    }
    for (let i = 0; i < list.length; i++) {
      const p = list[i], r = radii[i];
      if (p[0] < 20 + r) p[0] = 20 + r;
      if (p[0] > W - 20 - r) p[0] = W - 20 - r;
      if (p[1] < 120 + r) p[1] = 120 + r;
      if (p[1] > H + 40 - r) p[1] = H + 40 - r;
      if (p[0] > COUNTER.x - 30 - r && p[0] < COUNTER.x + COUNTER.w + 30 + r && p[1] > COUNTER.y - 30 - r && p[1] < COUNTER.y + COUNTER.h + 30 + r) {
        const dxl = p[0] - (COUNTER.x - 30 - r), dxr = (COUNTER.x + COUNTER.w + 30 + r) - p[0];
        const dyt = p[1] - (COUNTER.y - 30 - r), dyb = (COUNTER.y + COUNTER.h + 30 + r) - p[1];
        const m = Math.min(dxl, dxr, dyt, dyb);
        if (m === dxl) p[0] = COUNTER.x - 30 - r;
        else if (m === dxr) p[0] = COUNTER.x + COUNTER.w + 30 + r;
        else if (m === dyt) p[1] = COUNTER.y - 30 - r;
        else p[1] = COUNTER.y + COUNTER.h + 30 + r;
      }
      if (Math.abs(p[0] - LETTER.cx) < slotHalf + r && p[1] > LETTER.cy - LETTER.h / 2 - r && p[1] < LETTER.cy + LETTER.h / 2 + r) {
        p[0] = LETTER.cx + (p[0] < LETTER.cx ? -1 : 1) * (slotHalf + r);
      }
    }
  }
  return list;
}

function buildPack() {
  if (PACK.spheres) return PACK.spheres;
  const r = mulberry32(757);
  const radii = [], open = [], crushed = [];
  for (let i = 0; i < N_SPHERES; i++) {
    let rad;
    if (i < 22) rad = 52 + r() * 28;
    else if (i < 214) rad = 21 + Math.pow(r(), 1.4) * 26;
    else if (i < 250) rad = 14 + r() * 8;
    else rad = 78 + r() * 26;
    radii.push(rad);
    const gx = 32 + (i % 20) * ((W - 64) / 20) + (r() - 0.5) * 70;
    const gy = 150 + Math.floor(i / 20) * ((H - 130) / 13) + (r() - 0.5) * 60;
    let x = gx;
    if (Math.abs(x - LETTER.cx) < 190) x = LETTER.cx + (x < LETTER.cx ? -1 : 1) * (190 + r() * 90);
    open.push([Math.min(W - 20, Math.max(20, x)), Math.min(H + 30, Math.max(150, gy))]);
    crushed.push([open[i][0], open[i][1]]);
  }
  relax(open, radii, 168, 46);
  relax(crushed, radii, 54, 64);
  const spheres = [];
  for (let i = 0; i < N_SPHERES; i++) {
    const side = unit(757, i, 1) < 0.5 ? -1 : 1;
    spheres.push({
      r: radii[i],
      open: open[i],
      crushed: crushed[i],
      depth: r(),
      entry: [side < 0 ? -120 - r() * 320 : W + 120 + r() * 320, open[i][1] + (r() - 0.5) * 300],
      spin: (r() - 0.5) * 2.4,
      phase: r() * TAU,
      fg: i >= 250,
      variant: i % 3,
      damp: 0.7 + r() * 0.6,
    });
  }
  spheres.sort((a, b) => a.depth - b.depth);
  PACK.spheres = spheres;
  return spheres;
}

/* ------------------------------------------------------------- vault / set */
let VAULT = null;
function paintVault(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a0907');
  g.addColorStop(0.34, '#100d09');
  g.addColorStop(0.7, '#0a0806');
  g.addColorStop(1, '#050403');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  // a soft vertical shaft: horizontal falloff so the cone has no hard edge
  const hb = ctx.createLinearGradient(600, 0, 1320, 0);
  hb.addColorStop(0, 'rgba(255,210,150,0)');
  hb.addColorStop(0.32, 'rgba(255,210,150,0.05)');
  hb.addColorStop(0.5, 'rgba(255,222,168,0.10)');
  hb.addColorStop(0.68, 'rgba(255,210,150,0.05)');
  hb.addColorStop(1, 'rgba(255,210,150,0)');
  ctx.fillStyle = hb;
  ctx.fillRect(600, 0, 720, 1000);
  // the lamp itself, far up in the dark
  const lampG = ctx.createRadialGradient(960, -120, 20, 960, -80, 460);
  lampG.addColorStop(0, 'rgba(255,236,196,0.24)');
  lampG.addColorStop(0.4, 'rgba(255,214,156,0.08)');
  lampG.addColorStop(1, 'rgba(255,214,156,0)');
  ctx.fillStyle = lampG;
  ctx.fillRect(400, -80, 1120, 640);
  ctx.restore();
  const pool = ctx.createRadialGradient(960, 930, 20, 960, 930, 520);
  pool.addColorStop(0, 'rgba(255,212,150,0.10)');
  pool.addColorStop(1, 'rgba(255,200,130,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(300, 560, 1320, 520);
  // receding pilasters
  const pr = mulberry32(7571);
  for (let i = 0; i < 7; i++) {
    const x = 90 + i * 290 + pr() * 40;
    const w = 46 + pr() * 26;
    ctx.fillStyle = `rgba(${26 + pr() * 10},${20 + pr() * 8},${13 + pr() * 6},0.55)`;
    ctx.fillRect(x, 70, w, H - 120);
    ctx.fillStyle = 'rgba(255,214,160,0.05)';
    ctx.fillRect(x + w - 6, 70, 3, H - 120);
  }
  // polished floor
  const fl = ctx.createLinearGradient(0, 840, 0, H);
  fl.addColorStop(0, 'rgba(40,28,16,0)');
  fl.addColorStop(0.4, 'rgba(52,34,16,0.32)');
  fl.addColorStop(1, 'rgba(8,5,3,0.9)');
  ctx.fillStyle = fl;
  ctx.fillRect(0, 820, W, H - 820);
  // metallic dust
  for (let i = 0; i < 340; i++) {
    const x = pr() * W, y = pr() * H;
    const a = 0.03 + Math.pow(pr(), 2) * 0.22;
    ctx.fillStyle = `rgba(255,224,170,${a})`;
    ctx.fillRect(x, y, 1 + pr() * 1.8, 1 + pr() * 1.8);
  }
  const v = ctx.createRadialGradient(960, 500, 260, 960, 540, 1180);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.55, 'rgba(0,0,0,0.30)');
  v.addColorStop(1, 'rgba(0,0,0,0.86)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/* ------------------------------------------------------------------ letter */
let LETTER_PAPER = null, LETTER_PATTERN = null;

function paintLetterPaper(ctx) {
  // warm ivory xuan paper — never grey, never metal
  ctx.fillStyle = '#f6f2e8';
  ctx.fillRect(0, 0, LETTER.w, LETTER.h);
  const g = ctx.createLinearGradient(0, 0, LETTER.w, LETTER.h);
  g.addColorStop(0, 'rgba(255,253,246,0.86)');
  g.addColorStop(0.5, 'rgba(248,242,230,0.2)');
  g.addColorStop(1, 'rgba(214,202,180,0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LETTER.w, LETTER.h);
  const r = mulberry32(7572);
  for (let i = 0; i < 900; i++) {
    const x = r() * LETTER.w, y = r() * LETTER.h;
    ctx.fillStyle = r() < 0.5 ? `rgba(255,255,250,${0.1 + r() * 0.3})` : `rgba(120,104,80,${0.02 + r() * 0.09})`;
    ctx.fillRect(x, y, 1 + r() * 20, 0.8);
  }
  // the letter's body: faint unreadable brush lines
  ctx.save();
  ctx.strokeStyle = 'rgba(70,58,40,0.22)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 15; i++) {
    const y = 76 + i * 32;
    let x = 42;
    while (x < LETTER.w - 54) {
      const len = 16 + r() * 58;
      ctx.beginPath();
      ctx.moveTo(x, y + (r() - 0.5) * 2);
      ctx.lineTo(x + len, y + (r() - 0.5) * 2);
      ctx.stroke();
      x += len + 9 + r() * 15;
    }
  }
  ctx.restore();
  // fold
  ctx.strokeStyle = 'rgba(90,76,54,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, LETTER.h * 0.5); ctx.lineTo(LETTER.w, LETTER.h * 0.5 + 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,250,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, LETTER.h * 0.5 - 2); ctx.lineTo(LETTER.w, LETTER.h * 0.5); ctx.stroke();
  // red seal near the head of the letter, clear of the couplet
  KIT.ink.sealStamp(ctx, LETTER.w - 96, 20, 62, '家書', {
    seed: 757, color: C.seal, h: 76, vertical: true, inset: 6,
  });
  ctx.strokeStyle = 'rgba(120,104,78,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, LETTER.w - 2, LETTER.h - 2);
  const v = ctx.createRadialGradient(LETTER.w * 0.5, LETTER.h * 0.45, LETTER.h * 0.2, LETTER.w * 0.5, LETTER.h * 0.5, LETTER.h * 0.85);
  v.addColorStop(0, 'rgba(90,74,50,0)');
  v.addColorStop(1, 'rgba(90,74,50,0.12)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, LETTER.w, LETTER.h);
}

function letterShape(crush) {
  const base = lerp(0.96, 0.37, crush);
  const rim = lerp(0.04, 0.48, crush);
  const left = [], right = [];
  const step = 14;
  for (let y = 0; y <= LETTER.h; y += step) {
    const t = y / LETTER.h;
    const hw = LETTER.w * 0.5 * (base + rim * Math.pow(Math.abs(2 * t - 1), 1.6));
    const wob = (Math.sin(t * 19 + 1.3) * 1.6 + Math.sin(t * 7.1) * 2.4) * crush;
    left.push([LETTER.w / 2 - hw + wob, y]);
    right.push([LETTER.w / 2 + hw + wob, y]);
  }
  return { left, right };
}
function letterPath(ctx, shape) {
  ctx.beginPath();
  ctx.moveTo(shape.left[0][0], shape.left[0][1]);
  for (let i = 1; i < shape.left.length; i++) ctx.lineTo(shape.left[i][0], shape.left[i][1]);
  for (let i = shape.right.length - 1; i >= 0; i--) ctx.lineTo(shape.right[i][0], shape.right[i][1]);
  ctx.closePath();
}

function drawPoemLocal(ctx, u, w, h) {
  const reveal = smoothstep(2.34, 2.95, u);
  if (reveal <= 0.001) return;
  const text = '烽火连三月，家书抵万金';
  const size = 48;
  const gap = size * 1.055;
  const chars = [...text];
  const cx = w / 2 + 3;
  const top = 62;
  ctx.save();
  // a darker column behind the type: the paper is in the shadow of the metal
  const shade = ctx.createLinearGradient(0, 0, w, 0);
  shade.addColorStop(0, 'rgba(8,5,2,0)');
  shade.addColorStop(0.36, 'rgba(8,5,2,0.58)');
  shade.addColorStop(0.5, 'rgba(8,5,2,0.66)');
  shade.addColorStop(0.64, 'rgba(8,5,2,0.58)');
  shade.addColorStop(1, 'rgba(8,5,2,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 44, w, h - 60);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${size}px ${KIT.FONT.display}`;
  for (let i = 0; i < chars.length; i++) {
    const a = clamp01((reveal - i * 0.045) * 2.6);
    if (a <= 0.01) continue;
    const y = top + 30 + i * gap + (1 - easeOut(a)) * 10;
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = 'rgba(8,5,2,0.9)';
    ctx.fillText(chars[i], cx + 2.4, y + 3.4);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#f4e8ce';
    ctx.fillText(chars[i], cx, y);
  }
  ctx.restore();
}

/* ----------------------------------------------------------------- counter */
function counterValue(u) {
  if (u < 2.0) {
    const p = clamp01((u - 0.12) / 1.86);
    return 1 + 9999 * easeOut(p);
  }
  const t = u - 2.0;
  const over = 250 * Math.exp(-t * 9) * Math.sin(Math.min(Math.PI, t * 26));
  return 10000 + Math.max(0, over);
}
function comma(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function drawCounter(ctx, u) {
  const v = counterValue(u);
  const x = COUNTER.x, y = COUNTER.y, w = COUNTER.w, h = COUNTER.h;
  ctx.save();
  ctx.fillStyle = 'rgba(8,7,5,0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(216,170,79,0.45)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = 'rgba(216,170,79,0.16)';
  ctx.strokeRect(x + 5.5, y + 5.5, w - 11, h - 11);
  KIT.drawText(ctx, 'RANSOM / 贖金', x + 18, y + 24, {
    size: 12, font: KIT.FONT.mono, weight: 700, color: 'rgba(216,170,79,0.8)', letterSpacing: 2.2,
  });
  const lamp = u >= 2.0 ? 1 : 0.35 + 0.3 * Math.sin(u * 12);
  ctx.fillStyle = `rgba(220,60,44,${0.35 + lamp * 0.6})`;
  ctx.beginPath(); ctx.arc(x + w - 30, y + 22, 5, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(220,60,44,0.14)';
  ctx.beginPath(); ctx.arc(x + w - 30, y + 22, 13, 0, TAU); ctx.fill();
  const wx = x + 16, wy = y + 46, ww = w - 32, wh = 66;
  ctx.fillStyle = '#050403';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = 'rgba(216,170,79,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(wx + 0.5, wy + 0.5, ww - 1, wh - 1);
  ctx.save();
  ctx.beginPath(); ctx.rect(wx + 2, wy + 2, ww - 4, wh - 4); ctx.clip();
  const size = 56;
  const cell = 34;
  const places = [4, 3, 2, 1, 0];
  ctx.font = `300 ${size}px ${KIT.FONT.mono}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let cx = wx + ww - 20 - (places.length * cell + 14);
  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    const scroll = v / Math.pow(10, place);
    const d = Math.floor(scroll) % 10;
    const frac = scroll - Math.floor(scroll);
    if (i === 2) cx += 16;
    if (i === 1) {
      ctx.fillStyle = 'rgba(216,170,79,0.9)';
      ctx.fillText(',', cx + cell * 0.62, wy + wh / 2 + 3);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - cell * 0.52, wy + 2, cell * 1.04, wh - 4);
    ctx.clip();
    for (let k = 0; k < 2; k++) {
      const yy = wy + wh / 2 - frac * 60 + k * 60;
      const val = (d + k) % 10;
      ctx.fillStyle = k === 0 ? 'rgba(242,227,194,0.98)' : 'rgba(242,227,194,0.42)';
      ctx.fillText(String(val), cx, yy);
    }
    ctx.restore();
    cx += cell;
  }
  ctx.restore();
  KIT.drawText(ctx, '两黄金', x + 18, y + h - 24, {
    size: 22, font: KIT.FONT.serif, weight: 500, color: 'rgba(242,227,194,0.9)', letterSpacing: 2,
  });
  KIT.drawText(ctx, 'Au 79 · 10,000 兩 · 757', x + w - 18, y + h - 24, {
    size: 10.5, font: KIT.FONT.mono, weight: 500, color: 'rgba(216,170,79,0.55)', align: 'right', letterSpacing: 0.9,
  });
  ctx.fillStyle = 'rgba(216,170,79,0.28)';
  for (let i = 0; i < 26; i++) ctx.fillRect(wx + 8 + i * 14, wy + wh + 6, 1, i % 5 === 0 ? 5 : 2);
  ctx.restore();
  markText('s08-counter', comma(v), wx, wy, ww, wh, { size: 56, align: 'right' });
}

/* ------------------------------------------------------------------- scene */
export function renderAt(ctx, u, beat, env = {}) {
  const spheres = buildPack();
  if (!VAULT) VAULT = KIT.layer('scene08:vault', W, H, paintVault);
  if (!SPHERE) {
    for (let k = 0; k < 3; k++) {
      SPHERE_VARS.push(KIT.layer('scene08:sphere' + k, 256, 256, (c) => paintSphere(c, 256, k)));
    }
    SPHERE = SPHERE_VARS[0];
    SPHERE_FG = KIT.layer('scene08:sphereFg', 256, 256, (c) => paintSphereFg(c, 256));
  }
  if (!LETTER_PAPER) {
    LETTER_PAPER = KIT.layer('scene08:letter', LETTER.w, LETTER.h, paintLetterPaper);
    LETTER_PATTERN = ctx.createPattern(LETTER_PAPER, 'no-repeat');
  }

  const crush = smoothstep(1.84, 2.12, u);
  const waist = Math.max(0, crush - smoothstep(2.35, 2.95, u) * 0.12);
  const enter = smoothstep(0.1, 1.9, u);
  const pulse = beat && beat.pulse ? beat.pulse : 0;
  const jolt = u >= 2 && u < 2.6 ? Math.exp(-(u - 2) * 9) : 0;
  const cam = smoothstep(4.4, 5.6, u);
  const shape = letterShape(waist);
  const letterRot = 0.012 * Math.sin(u * 0.7) - 0.035 * crush;
  const light = [960, -160];

  ctx.save();
  ctx.translate(8 * cam + Math.sin(u * 71) * jolt * 9, -6 * cam + Math.cos(u * 53) * jolt * 5);

  ctx.drawImage(VAULT, -10, -10, W + 20, H + 20);

  const drawLetter = () => {
    // cast shadow on the floor
    ctx.save();
    ctx.translate(LETTER.cx, LETTER.cy);
    ctx.rotate(letterRot);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(10, LETTER.h / 2 + 24, LETTER.w * 0.44, 18, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(LETTER.cx, LETTER.cy);
    ctx.rotate(letterRot);
    // halo: the brightest object in the room
    const glow = ctx.createRadialGradient(0, -20, 10, 0, 0, LETTER.h * 0.8);
    glow.addColorStop(0, 'rgba(255,236,196,0.30)');
    glow.addColorStop(0.5, 'rgba(255,224,170,0.10)');
    glow.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-LETTER.w, -LETTER.h * 0.7, LETTER.w * 2, LETTER.h * 1.5);

    ctx.save();
    ctx.translate(-LETTER.w / 2, -LETTER.h / 2);
    // paper
    letterPath(ctx, shape);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = LETTER_PATTERN;
    ctx.fill();
    // key light: the paper is the brightest object in the room
    const key = ctx.createLinearGradient(0, 0, LETTER.w * 0.7, LETTER.h);
    key.addColorStop(0, 'rgba(255,252,240,0.42)');
    key.addColorStop(0.42, 'rgba(255,250,236,0.10)');
    key.addColorStop(1, 'rgba(255,244,220,0)');
    ctx.fillStyle = key;
    ctx.fillRect(0, 0, LETTER.w, LETTER.h);
    // metal occlusion only at the pinched edges, and kept translucent so the
    // sheet still reads as warm ivory paper rather than grey metal
    const side = ctx.createLinearGradient(0, 0, LETTER.w, 0);
    const occl = 0.12 + waist * 0.16;
    side.addColorStop(0, `rgba(46,32,14,${occl})`);
    side.addColorStop(0.14, 'rgba(60,44,22,0.08)');
    side.addColorStop(0.5, 'rgba(60,44,22,0)');
    side.addColorStop(0.86, 'rgba(60,44,22,0.08)');
    side.addColorStop(1, `rgba(46,32,14,${occl})`);
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, LETTER.w, LETTER.h);
    const vert = ctx.createLinearGradient(0, 0, 0, LETTER.h);
    vert.addColorStop(0, 'rgba(255,244,214,0.14)');
    vert.addColorStop(0.5, 'rgba(60,40,16,0)');
    vert.addColorStop(0.82, 'rgba(120,92,50,0.10)');
    vert.addColorStop(1, 'rgba(70,52,26,0.24)');
    ctx.fillStyle = vert;
    ctx.fillRect(0, 0, LETTER.w, LETTER.h);
    // pinched waist: two soft fold shadows where the metal bites into the sheet
    if (crush > 0.05) {
      ctx.save();
      ctx.globalAlpha = crush;
      const waistShade = ctx.createLinearGradient(0, 0, LETTER.w, 0);
      const k = lerp(0.5, 0.32, crush);
      waistShade.addColorStop(0, 'rgba(90,66,32,0)');
      waistShade.addColorStop(clamp01(k - 0.12), 'rgba(90,66,32,0)');
      waistShade.addColorStop(k, 'rgba(74,52,24,0.34)');
      waistShade.addColorStop(clamp01(k + 0.12), 'rgba(90,66,32,0)');
      waistShade.addColorStop(1, 'rgba(90,66,32,0)');
      ctx.fillStyle = waistShade;
      ctx.fillRect(0, 0, LETTER.w, LETTER.h);
      ctx.restore();
    }
    // creases radiating from the waist (soft, curved folds — not string art)
    if (crush > 0.05) {
      ctx.save();
      ctx.globalAlpha = crush * 0.8;
      for (let i = 0; i < 5; i++) {
        const t = 0.2 + i * 0.15;
        const y0 = LETTER.h * 0.5 + (i - 2) * 16;
        const bow = (i - 2) * 9;
        ctx.beginPath();
        ctx.moveTo(LETTER.w * 0.5 - 6, y0);
        ctx.quadraticCurveTo(LETTER.w * 0.34, y0 - 60 + bow, LETTER.w * t, LETTER.h * 0.1 + (i % 3) * 18);
        ctx.strokeStyle = 'rgba(96,72,36,0.30)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(LETTER.w * 0.5 - 4, y0 + 1.4);
        ctx.quadraticCurveTo(LETTER.w * 0.34, y0 - 58.6 + bow, LETTER.w * t + 1.4, LETTER.h * 0.1 + (i % 3) * 18 + 1.4);
        ctx.strokeStyle = 'rgba(255,251,236,0.42)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(LETTER.w * 0.5 + 6, y0);
        ctx.quadraticCurveTo(LETTER.w * 0.66, y0 + 60 - bow, LETTER.w * (1 - t + 0.14), LETTER.h * 0.92 - (i % 3) * 16);
        ctx.strokeStyle = 'rgba(96,72,36,0.26)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }
    // envelope flap / fold: a quiet V near the top lobe
    ctx.save();
    ctx.strokeStyle = 'rgba(74,60,42,0.32)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 8); ctx.lineTo(LETTER.w / 2, LETTER.h * 0.28); ctx.lineTo(LETTER.w, 8);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,250,236,0.42)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 11); ctx.lineTo(LETTER.w / 2, LETTER.h * 0.28 + 3); ctx.lineTo(LETTER.w, 11);
    ctx.stroke();
    ctx.restore();
    // hot rim along the pinched edges
    ctx.strokeStyle = 'rgba(255,240,206,0.5)';
    ctx.lineWidth = 2;
    letterPath(ctx, shape);
    ctx.stroke();
    // NOTE: the vertical couplet that used to be typeset down the middle of the
    // envelope is gone — it fought the foreground subtitle and turned the sheet
    // grey. The paper now carries only its own miniature brush-script texture.
    ctx.restore();
    ctx.restore();
    ctx.restore();
  };

  // --- back spheres -------------------------------------------------------
  const pos = (s) => {
    if (u < 2.05) {
      const e = 0.32 + 0.68 * easeOut(clamp01((enter - s.depth * 0.3) / 0.7));
      return [
        lerp(s.entry[0], s.open[0] + Math.sin(u * 0.8 + s.phase) * 4, e),
        lerp(s.entry[1], s.open[1] + Math.cos(u * 0.6 + s.phase) * 3, e),
      ];
    }
    let px = lerp(s.open[0], s.crushed[0], crush);
    let py = lerp(s.open[1], s.crushed[1], crush);
    const settle = Math.exp(-(u - 2.05) * 3.2) * Math.sin((u - 2.05) * 18) * 2.5;
    px += settle * s.damp + Math.sin(u * 0.5 + s.phase) * 1.6;
    py += settle * s.damp * 0.6 + Math.cos(u * 0.42 + s.phase) * 1.2;
    const gap = smoothstep(4.5, 5.3, u);
    if (gap > 0) {
      const k = clamp01((px - 980) / 940);
      px += gap * (170 * k * k + 40);
      py += gap * Math.sin(px * 0.01) * 8;
    }
    return [px, py];
  };

  const drawSphere = (s, px, py) => {
    const rr = s.r;
    const rot = Math.atan2(py - light[1], px - light[0]) - Math.atan2(-0.55, -0.83);
    const spr = s.fg ? SPHERE_FG : SPHERE_VARS[s.variant];
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = '#030201';
    ctx.beginPath();
    ctx.ellipse(px + rr * 0.22, py + rr * 0.8, rr * 0.96, rr * 0.34, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.drawImage(spr, -rr, -rr, rr * 2, rr * 2);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = 'rgba(255,196,120,1)';
    ctx.beginPath();
    ctx.ellipse(px + rr * 0.2, py + rr * 0.84, rr * 0.5, rr * 0.11, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  for (const s of spheres) {
    if (s.fg) continue;
    if (s.depth > 0.78) continue;
    const [px, py] = pos(s);
    drawSphere(s, px, py);
  }

  drawLetter();

  // mid-depth spheres
  for (const s of spheres) {
    if (s.fg) continue;
    if (s.depth <= 0.78 || s.depth > 0.9) continue;
    const [px, py] = pos(s);
    drawSphere(s, px, py);
  }

  drawCounter(ctx, u);

  // thin compression readout beside the letter
  const waistW = Math.round(LETTER.w * lerp(0.96, 0.37, waist));
  if (u > 1.6) {
    const a = smoothstep(1.7, 2.0, u) * 0.9;
    ctx.save();
    ctx.globalAlpha = a;
    const bx = LETTER.cx + LETTER.w * 0.5 + 40, by = LETTER.cy - LETTER.h * 0.5 + 20;
    ctx.strokeStyle = 'rgba(216,170,79,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + LETTER.h); ctx.stroke();
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(bx - 5, by + (LETTER.h * i) / 10); ctx.lineTo(bx + 5, by + (LETTER.h * i) / 10); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(6,5,3,0.75)';
    ctx.fillRect(bx + 12, by - 4, 148, 54);
    KIT.drawText(ctx, `STRIP ${waistW} px`, bx + 20, by + 14, {
      size: 11, font: KIT.FONT.mono, weight: 600, color: 'rgba(216,170,79,0.85)', letterSpacing: 1.2,
    });
    KIT.drawText(ctx, '家书 / 一紙', bx + 20, by + 36, {
      size: 13, font: KIT.FONT.serif, weight: 400, color: 'rgba(242,227,194,0.65)', letterSpacing: 1.5,
    });
    ctx.restore();
  }

  // metallic dust kicked up on the downbeat
  if (u >= 2.0 && u < 3.6) {
    const d = u - 2.0;
    const a = Math.exp(-d * 2.4);
    const dr = mulberry32(7573);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const ang = dr() * TAU;
      const sp = 80 + dr() * 460;
      const x = LETTER.cx + Math.cos(ang) * sp * d;
      const y = LETTER.cy + Math.sin(ang) * sp * d * 0.55 + 40 * d * d;
      ctx.fillStyle = `rgba(255,224,168,${(a * (0.15 + dr() * 0.55)).toFixed(3)})`;
      const sz = 0.8 + dr() * 2.6;
      ctx.fillRect(x, y, sz, sz);
    }
    ctx.restore();
  }

  // front-depth spheres and the giants, out of focus
  for (const s of spheres) {
    if (!s.fg && s.depth <= 0.9) continue;
    const [px, py] = pos(s);
    ctx.save();
    ctx.globalAlpha = s.fg ? 0.94 : 1;
    ctx.drawImage(SPHERE_FG, px - s.r * 1.02, py - s.r * 1.02, s.r * 2.04, s.r * 2.04);
    ctx.restore();
  }

  // gate to the next era at the right edge
  const gateP = smoothstep(5.0, 5.5, u);
  if (gateP > 0.01) {
    ctx.save();
    ctx.globalAlpha = gateP;
    const gx = 1758, gy = 250, gw = 128, gh = 646;
    const g = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    g.addColorStop(0, 'rgba(255,224,170,0)');
    g.addColorStop(0.5, 'rgba(255,226,176,0.26)');
    g.addColorStop(1, 'rgba(255,242,204,0.88)');
    ctx.fillStyle = g;
    ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = 'rgba(216,170,79,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(gx + 0.5, gy + 0.5, gw, gh);
    const P = KIT.rig.pose({ t: u, phase: (Math.floor(u * 2) / 2) * TAU, wind: 0.3, staff: true, elder: true });
    const walk = smoothstep(5.05, 6.0, u);
    const rp = KIT.rig.placed(P, { x: 1796 + walk * 30, y: 952, scale: 0.64 });
    KIT.rig.drawSilhouette(ctx, rp, { color: 'rgba(8,5,2,0.92)' });
    KIT.rig.drawWire(ctx, rp, { color: 'rgba(255,232,190,0.22)', width: 1 });
    KIT.drawText(ctx, '第 09 帙 →', gx + gw / 2, gy - 24, {
      size: 12, font: KIT.FONT.serif, weight: 500, color: 'rgba(232,206,158,0.7)', align: 'center', letterSpacing: 2,
    });
    ctx.restore();
  }

  // red seal-stamp vignette: pulses once on the downbeat
  if (u >= 2.0) {
    const sp = Math.exp(-(u - 2.0) * 5.5);
    if (sp > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = sp * 0.55;
      const sg = ctx.createRadialGradient(LETTER.cx, LETTER.cy, 80, LETTER.cx, LETTER.cy, 760);
      sg.addColorStop(0, 'rgba(140,30,20,0.35)');
      sg.addColorStop(0.6, 'rgba(150,38,26,0.55)');
      sg.addColorStop(1, 'rgba(30,8,6,0.9)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  // outside-the-layer captions, on a small vitrine plate
  ctx.save();
  ctx.fillStyle = 'rgba(7,6,4,0.72)';
  ctx.fillRect(78, 372, 330, 68);
  ctx.strokeStyle = 'rgba(216,170,79,0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(78.5, 372.5, 329, 67);
  ctx.fillStyle = 'rgba(216,170,79,0.8)';
  ctx.fillRect(78, 372, 3, 68);
  KIT.drawText(ctx, 'METAL / COLLATERAL / 757', 96, 398, {
    size: 12, font: KIT.FONT.mono, weight: 600, color: 'rgba(216,170,79,0.72)', letterSpacing: 2.4,
  });
  KIT.drawText(ctx, '火光三日 · 一紙萬金', 96, 422, {
    size: 18, font: KIT.FONT.serif, weight: 400, color: 'rgba(242,227,194,0.72)', letterSpacing: 1.6,
  });
  ctx.restore();

  // finish
  const v = ctx.createRadialGradient(960, 540, 380, 960, 540, 1180);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.62, 'rgba(0,0,0,0.18)');
  v.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const grain = KIT.layer('scene08:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 757, { amp: 0.09 }));
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.10;
  ctx.drawImage(grain, 0, 0, W, H);
  ctx.restore();
  ctx.restore();

  // The couplet lives once, on a translucent Hui-ink banner at the bottom
  // centre. The crushed sheet behind it stays a warm ivory object.
  const poemA = smoothstep(2.3, 2.78, u) * (1 - smoothstep(4.9, 5.35, u));
  if (poemA > 0.01) {
    ctx.save();
    ctx.globalAlpha = poemA;
    const band = ctx.createLinearGradient(0, 786, 0, 898);
    band.addColorStop(0, 'rgba(6,5,4,0)');
    band.addColorStop(0.10, 'rgba(9,7,5,0.80)');
    band.addColorStop(0.90, 'rgba(9,7,5,0.80)');
    band.addColorStop(1, 'rgba(6,5,4,0)');
    ctx.fillStyle = band;
    ctx.fillRect(250, 786, 1420, 112);
    const hair = ctx.createLinearGradient(250, 0, 1670, 0);
    hair.addColorStop(0, 'rgba(216,170,79,0)');
    hair.addColorStop(0.18, 'rgba(216,170,79,0.55)');
    hair.addColorStop(0.82, 'rgba(216,170,79,0.55)');
    hair.addColorStop(1, 'rgba(216,170,79,0)');
    ctx.fillStyle = hair;
    ctx.fillRect(250, 793, 1420, 1.2);
    ctx.fillRect(250, 889, 1420, 1.2);
    KIT.drawText(ctx, '烽火连三月，家书抵万金。', 960, 838, {
      size: 60, font: KIT.FONT.display, weight: 600, color: 'rgba(248,238,219,0.99)', align: 'center',
      letterSpacing: 5,
      shadow: { color: 'rgba(0,0,0,0.85)', blur: 14, x: 0, y: 3 },
    });
    KIT.drawText(ctx, '《春望》 · 七五七 · 家书 / FAMILY LETTER', 960, 880, {
      size: 11, font: KIT.FONT.serif, weight: 500, color: 'rgba(226,205,166,0.7)', align: 'center', letterSpacing: 2.2,
    });
    KIT.ink.sealStamp(ctx, 1588, 806, 60, '家書', {
      seed: 758, color: '#a52a22', vertical: true, alpha: 0.9, font: KIT.FONT.display, border: true, inset: 6,
    });
    ctx.restore();
    markText('s08-poem-full', '烽火连三月，家书抵万金。', 620, 806, 680, 66, { size: 60, align: 'center' });
  }

  if (pulse > 0.7 && u >= 2.0 && u < 2.3) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,220,160,${(pulse - 0.7) * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(LETTER.cx, LETTER.cy, 80 + (u - 2.0) * 700, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  void env;
}
