/**
 * 01 · 汉唐石刻拓片 / Rubbing & Stone Engraving · 712 · 巩县
 *
 * A museum rubbing lifted from a black granite stele. Charcoal stone, low-relief
 * mass under incised white line, then a paper-tooth erosion pass so every edge
 * is pitted rather than vector-clean. On the bar-2 downbeat the stele shudders
 * and 【七岁属辞，开口咏凤凰】 is cut into the stone; the right edge splits into
 * the first portal and the child walks through it into era 02.
 */
import KIT from '../kit/index.js';
import {
  clamp01, lerp, smoothstep, easeOut, easeInOut, hash, unit, mulberry32, TAU,
} from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
const PAPER = '#e6dcc2';
const PAPER_WARM = '#bfae8d';
const RED = '#a52a22';

const LINE = 'rgba(236,227,206,0.95)';
const LINE_SOFT = 'rgba(236,227,206,0.52)';
const LINE_FAINT = 'rgba(236,227,206,0.26)';
const MASS = 'rgba(236,227,206,0.30)';
const MASS_DEEP = 'rgba(236,227,206,0.16)';

const GROUND = 892;
const PROC_W = 2240;
const PROC_OFF = -168;

/* =================================================================== utils */
function mul(seed) { return mulberry32(hash('s01', seed)); }

function jpoly(ctx, pts, seed, amt = 1.2) {
  const r = mul(seed);
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0] + (r() - 0.5) * amt;
    const y = pts[i][1] + (r() - 0.5) * amt;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function carve(ctx, pts, o = {}) {
  jpoly(ctx, pts, o.seed ?? 1, o.jitter ?? 1.2);
  if (o.fill !== null) { ctx.fillStyle = o.fill || MASS; ctx.fill(); }
  if (o.stroke !== null) {
    ctx.strokeStyle = o.stroke || LINE;
    ctx.lineWidth = o.lw ?? 2.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function strokePath(ctx, pts, color = LINE, width = 2.4, seed = 1, jitter = 0.7) {
  const r = mul(seed);
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0] + (r() - 0.5) * jitter;
    const y = pts[i][1] + (r() - 0.5) * jitter;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Tapered filled line — the basic incision. */
function taper(ctx, pts, w0, w1, color, seed = 1) {
  if (!pts || pts.length < 2) return;
  const r = mul(seed);
  const left = [], right = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    const t = i / (pts.length - 1);
    const w = lerp(w0, w1, t) * (0.86 + r() * 0.28) * 0.5;
    left.push([p[0] + nx * w, p[1] + ny * w]);
    right.push([p[0] - nx * w, p[1] - ny * w]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/* ================================================================ granite */
function graniteLayer() {
  return KIT.layer('s01:granite:v2', W, H, (c) => {
    const g = c.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, '#312b21');
    g.addColorStop(0.26, '#231f18');
    g.addColorStop(0.6, '#191611');
    g.addColorStop(1, '#0c0a08');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    // raking museum light across the plate
    const lg = c.createRadialGradient(W * 0.46, H * 0.46, 60, W * 0.46, H * 0.5, W * 0.62);
    lg.addColorStop(0, 'rgba(150,132,100,0.20)');
    lg.addColorStop(0.45, 'rgba(112,96,70,0.09)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = lg;
    c.fillRect(0, 0, W, H);

    const cloud = KIT.cloudLayer(640, 360, 112, { tint: '#8a8069', alpha: 0.9, smallW: 96, smallH: 54, octaves: 5 });
    c.save();
    c.globalCompositeOperation = 'screen';
    c.globalAlpha = 0.26;
    c.drawImage(cloud, 0, 0, W, H);
    c.globalAlpha = 0.13;
    c.drawImage(cloud, -W * 0.24, -H * 0.12, W * 1.4, H * 1.32);
    c.restore();

    const r = mulberry32(hash('s01granite', 712));

    // feldspar / quartz speckle
    c.save();
    for (let i = 0; i < 17000; i++) {
      const x = r() * W, y = r() * H;
      const s = 0.4 + Math.pow(r(), 3.2) * 2.8;
      const l = 50 + r() * 132;
      c.fillStyle = `rgba(${l | 0},${(l - 4) | 0},${(l - 13) | 0},${(0.10 + r() * 0.46).toFixed(3)})`;
      c.fillRect(x, y, s, s);
    }
    // mica glints
    for (let i = 0; i < 360; i++) {
      const x = r() * W, y = r() * H * 0.96;
      const w = 1.4 + r() * 4.4, h = 0.6 + r() * 1.3;
      const a = (0.12 + r() * 0.4) * (1 - (y / H) * 0.5);
      c.save();
      c.translate(x, y);
      c.rotate(r() * TAU);
      c.fillStyle = `rgba(246,238,214,${a.toFixed(3)})`;
      c.fillRect(-w / 2, -h / 2, w, h);
      c.restore();
    }
    // hairline fractures
    c.lineCap = 'round';
    for (let k = 0; k < 40; k++) {
      let x = r() * W, y = r() * H;
      const len = 40 + r() * 440;
      const dir = (r() - 0.5) * 1.6 + Math.PI * 0.5;
      c.strokeStyle = `rgba(206,196,174,${(0.02 + r() * 0.07).toFixed(3)})`;
      c.lineWidth = 0.5 + r() * 1.2;
      c.beginPath();
      c.moveTo(x, y);
      for (let s = 0; s < 12; s++) {
        x += Math.cos(dir) * (len / 12) + (r() - 0.5) * 20;
        y += Math.sin(dir) * (len / 12) + (r() - 0.5) * 10;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    for (let k = 0; k < 5; k++) {
      let x = r() * W, y = -20 + r() * H * 0.5;
      c.strokeStyle = `rgba(5,4,3,${(0.12 + r() * 0.16).toFixed(3)})`;
      c.lineWidth = 0.8 + r() * 2.2;
      c.beginPath();
      c.moveTo(x, y);
      for (let s = 0; s < 16; s++) {
        x += (r() - 0.5) * 46;
        y += 22 + r() * 48;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    c.restore();

    // paper seam
    c.save();
    const seam = c.createLinearGradient(740, 0, 778, 0);
    seam.addColorStop(0, 'rgba(0,0,0,0)');
    seam.addColorStop(0.4, 'rgba(0,0,0,0.30)');
    seam.addColorStop(0.52, 'rgba(224,212,184,0.10)');
    seam.addColorStop(0.64, 'rgba(0,0,0,0.20)');
    seam.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = seam;
    c.fillRect(740, 0, 38, H);
    c.strokeStyle = 'rgba(220,208,182,0.10)';
    c.lineWidth = 1;
    c.beginPath();
    for (let y = 0; y <= H; y += 16) c.lineTo(757 + Math.sin(y * 0.021) * 2.6 + (r() - 0.5) * 1.4, y);
    c.stroke();
    // a hair of paper fibre left along the seam
    for (let i = 0; i < 90; i++) {
      const y = r() * H;
      c.strokeStyle = `rgba(236,226,204,${(0.03 + r() * 0.1).toFixed(3)})`;
      c.lineWidth = 0.5 + r() * 0.7;
      c.beginPath();
      c.moveTo(748 + r() * 20, y);
      c.lineTo(748 + r() * 20 + (r() - 0.5) * 20, y + (r() - 0.5) * 10);
      c.stroke();
    }
    c.restore();

    const v = c.createRadialGradient(W * 0.46, H * 0.44, H * 0.26, W * 0.5, H * 0.5, W * 0.74);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.6, 'rgba(4,3,2,0.22)');
    v.addColorStop(1, 'rgba(2,2,1,0.74)');
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);
  });
}

/* ============================================================ rubbing bake */
function bake(key, w, h, draw, opts = {}) {
  return KIT.layer(key, w, h, (c) => {
    const mk = KIT.makeCanvas(w, h);
    const m = mk.getContext('2d');
    draw(m, w, h);
    const tooth = KIT.grainLayer(Math.ceil(w / 2), Math.ceil(h / 2), opts.seed ?? 9, { amp: 0.95 });
    m.globalCompositeOperation = 'destination-out';
    m.globalAlpha = opts.erode ?? 0.4;
    m.drawImage(tooth, 0, 0, w, h);
    const fine = KIT.grainLayer(Math.ceil(w / 2.7), Math.ceil(h / 2.7), (opts.seed ?? 9) + 41, { amp: 0.95 });
    m.globalAlpha = (opts.erode ?? 0.4) * 0.62;
    m.drawImage(fine, 0, 0, w, h);
    // fibrous streaks along the rubbing direction
    m.globalAlpha = 0.16;
    const streak = KIT.grainLayer(200, 24, (opts.seed ?? 9) + 7, { amp: 0.9 });
    m.drawImage(streak, 0, 0, w, h);
    m.globalAlpha = 1;
    m.globalCompositeOperation = 'source-in';
    const tg = m.createLinearGradient(0, 0, 0, h);
    tg.addColorStop(0, opts.tint || PAPER);
    tg.addColorStop(0.6, opts.tint || PAPER);
    tg.addColorStop(1, opts.tint2 || PAPER_WARM);
    m.fillStyle = tg;
    m.fillRect(0, 0, w, h);
    c.drawImage(mk, 0, 0);
  });
}

/* =========================================================== Han figures */
/** Stocky Han pictorial-stone horse. Faces +x; hooves at y = 0; ~170 tall. */
function hanHorse(ctx, x, y, s, dir, seed, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  ctx.globalAlpha = o.alpha ?? 1;

  // far legs
  const farLegs = [
    [[-74, -94], [-84, -56], [-92, -16], [-80, -4]],
    [[52, -92], [62, -54], [58, -16], [70, -2]],
  ];
  for (let i = 0; i < farLegs.length; i++) {
    taper(ctx, farLegs[i], 9, 5, 'rgba(236,227,206,0.30)', seed + 11 + i);
    ctx.fillStyle = 'rgba(236,227,206,0.30)';
    const hp = farLegs[i][3];
    ctx.fillRect(hp[0] - 4, hp[1] - 2, 16, 6);
  }

  // tail — thick, knotted at the dock
  const tail = [];
  for (let i = 0; i <= 7; i++) {
    const t = i / 7;
    tail.push([-86 - t * 26 - Math.sin(t * 2.4) * 7, -112 + t * 40 + t * t * 48]);
  }
  taper(ctx, tail, 20, 3, LINE, seed + 2);
  ctx.strokeStyle = LINE_SOFT; ctx.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    const t = 0.2 + i * 0.2;
    ctx.beginPath();
    ctx.moveTo(-88 - t * 24, -110 + t * 55);
    ctx.lineTo(-103 - t * 30, -100 + t * 60);
    ctx.stroke();
  }

  // barrel / hindquarter / shoulder
  const body = [
    [-86, -104], [-80, -124], [-40, -132], [2, -128], [34, -126],
    [56, -112], [58, -92], [36, -66], [-14, -62], [-58, -70], [-82, -86],
  ];
  carve(ctx, body, { seed, fill: MASS, stroke: LINE, lw: 2.8, jitter: 1.5 });
  // interior incisions: rib cage + haunch
  for (let i = 0; i < 5; i++) {
    const bx = 22 - i * 17;
    strokePath(ctx, [[bx, -112], [bx - 6, -90], [bx - 4, -74]], 'rgba(236,227,206,0.22)', 1.4, seed + 30 + i, 1);
  }
  strokePath(ctx, [[-76, -104], [-52, -96], [-30, -90]], 'rgba(236,227,206,0.20)', 1.5, seed + 40, 1);
  ctx.beginPath();
  ctx.arc(-52, -102, 20, -1.1, 1.5);
  ctx.strokeStyle = 'rgba(236,227,206,0.24)'; ctx.lineWidth = 1.6; ctx.stroke();

  // neck
  const neck = [[30, -122], [50, -150], [68, -168], [90, -170], [92, -152], [70, -132], [54, -106], [38, -98]];
  carve(ctx, neck, { seed: seed + 3, fill: MASS, stroke: LINE, lw: 2.6, jitter: 1.1 });

  // mane: a short chiselled crest, not a saw
  strokePath(ctx, [[38, -126], [56, -148], [74, -168], [90, -176]], LINE, 5.5, seed + 50, 1.2);
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const mx = lerp(44, 88, t), my = lerp(-140, -178, t);
    strokePath(ctx, [[mx, my], [mx - 7, my + 5]], 'rgba(236,227,206,0.5)', 2, seed + 51 + i, 0.5);
  }

  // head
  const head = [[82, -178], [106, -180], [122, -168], [120, -152], [100, -146], [82, -154], [76, -166]];
  carve(ctx, head, { seed: seed + 5, fill: MASS, stroke: LINE, lw: 2.6, jitter: 1.0 });
  // ears
  carve(ctx, [[82, -182], [76, -202], [90, -186]], { seed: seed + 6, fill: MASS, stroke: LINE, lw: 1.8, jitter: 0.6 });
  carve(ctx, [[94, -186], [98, -204], [106, -188]], { seed: seed + 7, fill: MASS, stroke: LINE, lw: 1.8, jitter: 0.6 });
  // muzzle + jaw + eye
  strokePath(ctx, [[104, -158], [118, -156]], LINE, 1.8, seed + 8, 0.5);
  strokePath(ctx, [[84, -152], [98, -146], [112, -150]], LINE_SOFT, 1.6, seed + 9, 0.6);
  ctx.strokeStyle = LINE; ctx.lineWidth = 1.7;
  ctx.beginPath(); ctx.arc(104, -170, 3.4, 0, TAU); ctx.stroke();
  // bit + rein
  strokePath(ctx, [[116, -166], [110, -156], [100, -152]], LINE_SOFT, 1.9, seed + 10, 0.4);
  strokePath(ctx, [[62, -126], [18, -116], [-12, -108]], 'rgba(236,227,206,0.34)', 1.6, seed + 12, 0.8);
  // breast band
  strokePath(ctx, [[40, -120], [48, -96], [44, -72]], 'rgba(236,227,206,0.34)', 1.8, seed + 13, 0.5);

  // near legs
  const nearLegs = [
    [[-62, -88], [-56, -52], [-46, -14], [-30, -3]],
    [[40, -84], [46, -48], [38, -12], [56, -2]],
  ];
  for (let i = 0; i < nearLegs.length; i++) {
    taper(ctx, nearLegs[i], 14, 7, LINE, seed + 21 + i);
    ctx.fillStyle = LINE;
    const hp = nearLegs[i][3];
    ctx.fillRect(hp[0] - 2, hp[1] - 2, 18, 6);
    // joint lines
    const kp = nearLegs[i][1];
    ctx.fillStyle = 'rgba(10,9,7,0.55)';
    ctx.fillRect(kp[0] - 7, kp[1] - 1.5, 14, 3);
  }
  ctx.restore();
}

function wheel(ctx, cx, cy, r, alpha, teeth = 16) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.8;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * TAU + 0.09;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.1, cy + Math.sin(a) * r * 0.1);
    ctx.lineTo(cx + Math.cos(a) * r * 0.97, cy + Math.sin(a) * r * 0.97);
    ctx.stroke();
  }
  ctx.fillStyle = LINE;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.16, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Two-wheeled Han chariot with a fringed parasol. */
function hanChariot(ctx, x, y, s, dir, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);

  wheel(ctx, 30, -48, 44, 0.36);
  // body
  const box = [[-66, -112], [34, -116], [46, -98], [40, -58], [-60, -56], [-74, -80]];
  carve(ctx, box, { seed, fill: MASS, stroke: LINE, lw: 2.8, jitter: 1.3 });
  strokePath(ctx, [[-60, -94], [40, -98]], LINE, 2.4, seed + 3, 0.5);
  strokePath(ctx, [[-58, -76], [38, -78]], LINE_SOFT, 1.6, seed + 4, 0.5);
  // pole + canopy
  strokePath(ctx, [[-38, -112], [-34, -196]], LINE, 3.6, seed + 5, 0.5);
  const roof = [[-86, -200], [-46, -224], [24, -226], [58, -206], [54, -194], [-82, -190]];
  carve(ctx, roof, { seed: seed + 6, fill: 'rgba(236,227,206,0.24)', stroke: LINE, lw: 2.8, jitter: 1.1 });
  for (let i = 0; i < 10; i++) {
    const fx = -80 + i * 15;
    strokePath(ctx, [[fx, -194], [fx + 3, -176]], 'rgba(236,227,206,0.40)', 1.5, seed + 20 + i, 0.5);
  }
  // driver
  ctx.save();
  ctx.translate(-12, -114);
  const robe = [[-15, 0], [-20, -36], [-12, -58], [10, -58], [18, -34], [14, 0]];
  carve(ctx, robe, { seed: seed + 7, fill: MASS, stroke: LINE, lw: 2.2, jitter: 1 });
  ctx.strokeStyle = LINE; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(0, -70, 10, 0, TAU); ctx.stroke();
  carve(ctx, [[-10, -76], [-7, -88], [7, -88], [10, -76]], { seed: seed + 8, fill: MASS, stroke: LINE, lw: 1.6, jitter: 0.6 });
  strokePath(ctx, [[13, -50], [34, -58]], LINE, 3.4, seed + 9, 0.5);
  ctx.restore();
  wheel(ctx, -18, -50, 50, 1, 18);
  // shaft
  strokePath(ctx, [[40, -76], [116, -64], [190, -58]], LINE, 3.6, seed + 31, 0.6);
  ctx.restore();
}

/** Official / attendant — long robe, projecting cap, sword. */
function hanOfficial(ctx, x, y, s, dir, seed, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  ctx.globalAlpha = o.alpha ?? 1;
  const sl = o.sleeve ?? 1;
  const H = o.h ?? 250;

  // robe: shoulders → flared hem
  const robe = [
    [-20, -H * 0.82], [-30, -H * 0.62], [-24, -H * 0.42], [-34, 0],
    [0, 4], [30, 0], [22, -H * 0.44], [26, -H * 0.64], [18, -H * 0.84], [-2, -H * 0.9],
  ];
  carve(ctx, robe, { seed, fill: MASS, stroke: LINE, lw: 2.6, jitter: 1.3 });
  for (let i = 0; i < 4; i++) {
    strokePath(ctx, [[-14 + i * 10, -H * 0.5], [-18 + i * 12, -H * 0.24], [-14 + i * 14, 0]],
      'rgba(236,227,206,0.18)', 1.4, seed + 10 + i, 0.8);
  }
  // sash
  strokePath(ctx, [[-29, -H * 0.58], [0, -H * 0.55], [25, -H * 0.6]], LINE_SOFT, 2.4, seed + 2, 0.6);
  // sleeves — wide, hanging
  const slv = [[-22, -H * 0.8], [-46 * sl, -H * 0.66], [-52 * sl, -H * 0.36], [-24, -H * 0.42]];
  carve(ctx, slv, { seed: seed + 3, fill: MASS_DEEP, stroke: LINE, lw: 2, jitter: 0.9 });
  const slv2 = [[20, -H * 0.8], [44 * sl, -H * 0.64], [46 * sl, -H * 0.34], [22, -H * 0.42]];
  carve(ctx, slv2, { seed: seed + 4, fill: MASS_DEEP, stroke: LINE_SOFT, lw: 2, jitter: 0.9 });
  // head
  ctx.beginPath();
  ctx.arc(0, -H * 0.96, 13, 0, TAU);
  ctx.fillStyle = MASS; ctx.fill();
  ctx.strokeStyle = LINE; ctx.lineWidth = 2.2; ctx.stroke();
  // 进贤冠 cap
  const cap = [[-14, -H * 0.99], [-11, -H * 1.07], [10, -H * 1.09], [16, -H * 1.0], [8, -H * 0.95], [-12, -H * 0.95]];
  carve(ctx, cap, { seed: seed + 5, fill: 'rgba(236,227,206,0.36)', stroke: LINE, lw: 1.9, jitter: 0.7 });
  strokePath(ctx, [[-15, -H * 1.03], [-30, -H * 1.02], [-42, -H * 1.06]], LINE_SOFT, 1.9, seed + 6, 0.5);
  // beard
  strokePath(ctx, [[-4, -H * 0.92], [-6, -H * 0.86], [-2, -H * 0.82]], LINE_SOFT, 1.6, seed + 7, 0.4);
  // sword
  if (o.sword) {
    strokePath(ctx, [[-28, -H * 0.56], [-52, -H * 0.22], [-62, 2]], LINE, 2.8, seed + 8, 0.6);
    strokePath(ctx, [[-32, -H * 0.6], [-22, -H * 0.5]], LINE, 4.6, seed + 9, 0.4);
  }
  // feet
  ctx.fillStyle = LINE_SOFT;
  ctx.fillRect(-24, 0, 20, 5);
  ctx.fillRect(10, -1, 20, 5);
  ctx.restore();
}

/** Que gate-tower: the vertical anchor of a Han stone composition. */
function hanQue(ctx, x, y, s, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // two pillars
  for (let side = 0; side < 2; side++) {
    const px = side === 0 ? -52 : 52;
    const col = [[px - 16, 0], [px - 13, -190], [px - 17, -206], [px + 15, -208], [px + 13, -190], [px + 16, 0]];
    carve(ctx, col, { seed: seed + side, fill: MASS, stroke: LINE, lw: 2.4, jitter: 1.2 });
    for (let i = 0; i < 5; i++) {
      strokePath(ctx, [[px - 12, -30 - i * 34], [px + 12, -32 - i * 34]], 'rgba(236,227,206,0.16)', 1.4, seed + 10 + i, 0.6);
    }
    // bracket + roof
    carve(ctx, [[px - 32, -208], [px + 32, -208], [px + 24, -220], [px - 24, -220]], {
      seed: seed + 20 + side, fill: 'rgba(236,227,206,0.30)', stroke: LINE, lw: 2, jitter: 0.8,
    });
    carve(ctx, [[px - 44, -238], [px - 30, -222], [px + 30, -222], [px + 44, -238], [px + 30, -244], [px - 30, -244]], {
      seed: seed + 30 + side, fill: MASS, stroke: LINE, lw: 2.4, jitter: 0.9,
    });
    for (let i = 0; i < 6; i++) {
      strokePath(ctx, [[px - 28 + i * 11, -222], [px - 30 + i * 12, -238]], 'rgba(236,227,206,0.24)', 1.2, seed + 40 + i, 0.5);
    }
  }
  // lintel joining them
  carve(ctx, [[-52, -150], [52, -150], [52, -136], [-52, -136]], { seed: seed + 50, fill: 'rgba(236,227,206,0.22)', stroke: LINE, lw: 2, jitter: 0.8 });
  ctx.restore();
}

/** Han 月轮: incised disc with the moon-toad, ringed by chisel rays. */
function moonDisc(ctx, cx, cy, r, seed) {
  ctx.save();
  const rr = mul(hash('moon', seed));
  ctx.strokeStyle = 'rgba(236,227,206,0.46)';
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(236,227,206,0.20)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.84, 0, TAU); ctx.stroke();
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + 0.1;
    const l = 6 + rr() * 5;
    ctx.strokeStyle = `rgba(236,227,206,${(0.10 + rr() * 0.2).toFixed(3)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r + 3), cy + Math.sin(a) * (r + 3));
    ctx.lineTo(cx + Math.cos(a) * (r + 3 + l), cy + Math.sin(a) * (r + 3 + l));
    ctx.stroke();
  }
  // 蟾蜍 in low relief
  const bx = cx, by = cy + r * 0.06, bs = r * 0.52;
  const body = [[-1.0, 0.2], [-0.7, -0.42], [-0.2, -0.56], [0.34, -0.5], [0.82, -0.2],
    [0.94, 0.16], [0.4, 0.4], [-0.5, 0.4]];
  carve(ctx, body.map((q) => [bx + q[0] * bs, by + q[1] * bs]), {
    seed: seed + 2, fill: 'rgba(236,227,206,0.34)', stroke: LINE, lw: 2, jitter: 0.9,
  });
  for (const lx of [-0.62, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(bx + lx * bs, by + 0.3 * bs);
    ctx.lineTo(bx + (lx + 0.26) * bs, by + 0.72 * bs);
    ctx.lineTo(bx + (lx + 0.05) * bs, by + 0.86 * bs);
    ctx.strokeStyle = LINE; ctx.lineWidth = 2.4; ctx.stroke();
  }
  ctx.fillStyle = LINE;
  ctx.beginPath(); ctx.arc(bx - 0.3 * bs, by - 0.34 * bs, 2.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(bx + 0.26 * bs, by - 0.34 * bs, 2.4, 0, TAU); ctx.fill();
  ctx.restore();
}

function cloudScroll(ctx, x, y, s, seed, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = LINE_SOFT;
  ctx.lineWidth = 2;
  const r = mul(seed);
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    let px = k * 30, py = 0;
    ctx.moveTo(px, py);
    for (let i = 0; i < 9; i++) {
      px += 10 + r() * 6;
      py = Math.sin(i * 0.9 + k) * 10 - i * 1.4;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(k * 30 + 24, -14, 8, 0.2, 3.4);
    ctx.stroke();
  }
  ctx.restore();
}

function bird(ctx, x, y, s, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = 'rgba(236,227,206,0.42)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-13, 0);
  ctx.quadraticCurveTo(-5, -9, 0, 0);
  ctx.quadraticCurveTo(5, -9, 13, -1);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 7); ctx.stroke();
  ctx.restore();
  void seed;
}

function stoneTree(ctx, x, y, s, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const r = mul(seed);
  taper(ctx, [[0, 0], [-5, -64], [3, -126], [-3, -166]], 20, 7, LINE, seed);
  ctx.strokeStyle = LINE; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-2, -112); ctx.lineTo(-32, -142); ctx.lineTo(-48, -160); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -126); ctx.lineTo(28, -150); ctx.lineTo(42, -162); ctx.stroke();
  for (let k = 0; k < 9; k++) {
    const cx = -58 + k * 15 + r() * 8;
    const cy = -178 - Math.sin(k * 0.8) * 18 - r() * 12;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 17 + r() * 9, 10 + r() * 5, (r() - 0.5) * 0.4, 0, TAU);
    ctx.fillStyle = 'rgba(236,227,206,0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(236,227,206,0.46)'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 4);
    ctx.quadraticCurveTo(cx, cy - 4, cx + 12, cy + 4);
    ctx.strokeStyle = 'rgba(236,227,206,0.22)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  ctx.restore();
}

/* =========================================================== procession */
function processionLayer() {
  return bake('s01:proc:v2', PROC_W, H, (c) => {
    // ---- registers
    c.strokeStyle = 'rgba(236,227,206,0.34)';
    c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(0, GROUND); c.lineTo(PROC_W, GROUND + 3); c.stroke();
    c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(0, GROUND + 13); c.lineTo(PROC_W, GROUND + 15); c.stroke();
    c.strokeStyle = 'rgba(236,227,206,0.18)';
    c.lineWidth = 1.7;
    c.beginPath();
    for (let x = 0; x < PROC_W; x += 28) {
      c.moveTo(x, GROUND + 24);
      c.lineTo(x + 14, GROUND + 44);
      c.lineTo(x + 28, GROUND + 24);
    }
    c.stroke();
    // lower wave registers
    for (let band = 0; band < 2; band++) {
      const y0 = 984 + band * 42;
      c.strokeStyle = `rgba(236,227,206,${band ? 0.09 : 0.15})`;
      c.lineWidth = 2.2 - band * 0.6;
      c.beginPath();
      for (let x = 0; x <= PROC_W; x += 10) {
        const y = y0 + Math.sin(x * 0.028 + band * 1.7) * 7 + Math.sin(x * 0.011 + band) * 11;
        if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    }
    // upper register
    c.strokeStyle = 'rgba(236,227,206,0.13)';
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, 402); c.lineTo(PROC_W, 398); c.stroke();
    for (let i = 0; i < 15; i++) cloudScroll(c, 60 + i * 150, 436 + (i % 2) * 9, 0.95, i, 0.5);
    for (let i = 0; i < 7; i++) bird(c, 200 + i * 270, 356 + (i % 3) * 20, 1.15, i);
    // the moon wheel anchors the empty upper-left stone
    moonDisc(c, 318, 258, 74, 5);
    for (let i = 0; i < 3; i++) bird(c, 900 + i * 330, 232 + (i % 2) * 40, 1.7, 60 + i);

    // ---- back row
    for (let i = 0; i < 8; i++) {
      const bx = 90 + i * 268;
      if (bx > 520 && bx < 900) continue;
      hanOfficial(c, bx, GROUND - 40, 0.68, -1, 500 + i, { alpha: 0.46, sleeve: 0.8, h: 250 });
    }
    for (let i = 0; i < 4; i++) {
      hanHorse(c, 340 + i * 520, GROUND - 42, 0.66, -1, 620 + i, { alpha: 0.42 });
    }

    // ---- mid row
    stoneTree(c, 140, GROUND - 26, 1.78, 11);
    hanQue(c, 530, GROUND - 22, 1.56, 71);
    hanOfficial(c, 720, GROUND + 2, 1.52, -1, 32, { sleeve: 1.05 });
    hanHorse(c, 960, GROUND, 1.58, -1, 71);

    // gap: the child stands in the frame at x≈480 (canvas ≈648)

    hanChariot(c, 1460, GROUND + 2, 1.5, -1, 41);
    hanHorse(c, 1730, GROUND, 1.48, -1, 83);
    hanOfficial(c, 1870, GROUND + 4, 1.46, -1, 52, { sword: true });
    hanHorse(c, 2040, GROUND + 4, 1.58, -1, 91);
    hanOfficial(c, 2170, GROUND + 6, 1.5, -1, 72, { sleeve: 1.1, sword: true });
    hanChariot(c, 2380, GROUND + 4, 1.4, -1, 47);

    // ---- bottom carved band
    c.strokeStyle = 'rgba(236,227,206,0.13)';
    c.lineWidth = 1.3;
    c.beginPath();
    for (let x = 0; x < PROC_W; x += 42) {
      c.moveTo(x, 1052); c.lineTo(x + 21, 1034); c.lineTo(x + 42, 1052);
    }
    c.stroke();
  }, { seed: 71, erode: 0.30, tint: PAPER, tint2: '#b8a585' });
}

/* ============================================================ the child */
function drawChild(ctx, cx, gy, sc, opts = {}) {
  const phase = opts.phase ?? 0;
  const walk = opts.walk ?? 0;
  const brushAng = opts.brushAng ?? -2.05;
  const dark = !!opts.dark;
  const col = dark ? 'rgba(18,14,10,0.95)' : LINE;
  const colSoft = dark ? 'rgba(18,14,10,0.5)' : LINE_SOFT;
  const fill = dark ? 'rgba(18,14,10,0.9)' : 'rgba(236,227,206,0.28)';
  const fillDeep = dark ? 'rgba(18,14,10,0.92)' : 'rgba(236,227,206,0.18)';

  const bob = Math.sin(phase * 2) * 1.8 * sc;
  const step = Math.sin(phase) * 16 * walk * sc;

  ctx.save();
  ctx.translate(cx, gy + bob);
  ctx.scale(sc, sc);

  // ground shadow
  ctx.fillStyle = dark ? 'rgba(20,16,12,0.22)' : 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(6, 2, 46, 7.5, 0, 0, TAU);
  ctx.fill();

  // legs
  for (const lg of [{ x: -10, sw: step, far: true }, { x: 10, sw: -step, far: false }]) {
    taper(ctx, [[lg.x, -74], [lg.x + lg.sw * 0.5, -40], [lg.x + lg.sw, -4]],
      lg.far ? 8 : 10, 5.5, lg.far ? colSoft : col, 3 + lg.x);
    ctx.fillStyle = lg.far ? colSoft : col;
    ctx.fillRect(lg.x + lg.sw - 5, -5, 17, 5);
  }

  // robe — small child in a wide-sleeved jacket
  const robe = [
    [-17, -84], [-24, -132], [-21, -172], [-10, -184], [11, -184],
    [23, -170], [26, -128], [18, -80], [0, -76],
  ];
  jpoly(ctx, robe, 9, 1.5);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = 2.8;
  ctx.lineJoin = 'round';
  ctx.stroke();
  strokePath(ctx, [[-22, -128], [0, -124], [23, -130]], colSoft, 2.2, 12, 0.6);
  for (let i = 0; i < 3; i++) {
    strokePath(ctx, [[-15 + i * 11, -120], [-17 + i * 12, -98], [-13 + i * 13, -78]], colSoft, 1.4, 20 + i, 0.5);
  }
  // sleeves
  const sleeveN = [[-19, -170], [-44, -158], [-50, -122], [-18, -118]];
  jpoly(ctx, sleeveN, 31, 1.2);
  ctx.fillStyle = fillDeep; ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.stroke();
  const sleeveF = [[20, -170], [38, -156], [42, -126], [20, -120]];
  jpoly(ctx, sleeveF, 33, 1.2);
  ctx.fillStyle = fillDeep; ctx.fill();
  ctx.strokeStyle = colSoft; ctx.lineWidth = 2.2; ctx.stroke();

  // head
  ctx.beginPath();
  ctx.arc(2, -202, 17.5, 0, TAU);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.stroke();
  // two small buns
  ctx.fillStyle = fillDeep;
  for (const b of [[-7, -224], [8, -224]]) {
    ctx.beginPath(); ctx.arc(b[0], b[1], 6.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.9; ctx.stroke();
  }
  // face
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(10, -204, 1.9, 0, TAU); ctx.fill();
  strokePath(ctx, [[4, -193], [13, -192]], colSoft, 1.7, 33, 0.4);
  strokePath(ctx, [[-10, -186], [2, -172], [14, -186]], col, 2.4, 34, 0.4);
  ctx.restore();

  // ---- giant brush over the shoulder
  ctx.save();
  ctx.translate(cx, gy + bob);
  ctx.scale(sc, sc);
  const bx = -34, by = -104;
  const ang = brushAng;
  const L = 396;
  const dxu = Math.cos(ang), dyu = Math.sin(ang);
  const tipX = bx + dxu * L;
  const tipY = by + dyu * L;
  const buttX = bx - dxu * 66;
  const buttY = by - dyu * 66;

  // shaft
  const shaft = [];
  const shaftEnd = 0.74;
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    shaft.push([
      lerp(buttX, bx + dxu * L * shaftEnd, t) + Math.cos(ang + 1.57) * Math.sin(t * 3 + 0.5) * 2.6,
      lerp(buttY, by + dyu * L * shaftEnd, t) + Math.sin(ang + 1.57) * Math.cos(t * 2.6) * 2.4,
    ]);
  }
  taper(ctx, shaft, 19, 13, dark ? 'rgba(18,14,10,0.92)' : 'rgba(236,227,206,0.62)', 71);
  ctx.strokeStyle = col; ctx.lineWidth = 3.2; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < shaft.length; i++) {
    if (i === 0) ctx.moveTo(shaft[i][0], shaft[i][1]); else ctx.lineTo(shaft[i][0], shaft[i][1]);
  }
  ctx.stroke();
  // bamboo nodes
  const nx = Math.cos(ang + 1.5708), ny = Math.sin(ang + 1.5708);
  for (let i = 1; i < 5; i++) {
    const t = i / 5 * shaftEnd;
    const px = bx + dxu * L * t, py = by + dyu * L * t;
    ctx.beginPath();
    ctx.moveTo(px + nx * 9.5, py + ny * 9.5);
    ctx.lineTo(px - nx * 9.5, py - ny * 9.5);
    ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.stroke();
  }
  // wolf-hair tip
  const tA = [bx + dxu * L * shaftEnd, by + dyu * L * shaftEnd];
  // the head: a fat belly that narrows to a wolf-hair point
  ctx.beginPath();
  const N = 14;
  const headPts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const wide = 21 * Math.pow(1 - t, 0.55) * (0.72 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.06)));
    headPts.push([lerp(tA[0], tipX, t), lerp(tA[1], tipY, t), Math.max(0.7, wide)]);
  }
  for (let i = 0; i < headPts.length; i++) {
    const q = headPts[i];
    if (i === 0) ctx.moveTo(q[0] + nx * q[2], q[1] + ny * q[2]);
    else ctx.lineTo(q[0] + nx * q[2], q[1] + ny * q[2]);
  }
  for (let i = headPts.length - 1; i >= 0; i--) {
    const q = headPts[i];
    ctx.lineTo(q[0] - nx * q[2], q[1] - ny * q[2]);
  }
  ctx.closePath();
  ctx.fillStyle = dark ? 'rgba(18,14,10,0.92)' : 'rgba(240,233,214,0.96)';
  ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
  // bristle grooves
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const t0 = 0.02 + i * 0.02;
    const off = (i - 3) * 5.4;
    ctx.strokeStyle = dark ? 'rgba(40,30,20,0.5)' : 'rgba(24,19,13,0.50)';
    ctx.lineWidth = 1.1 + (i % 3) * 0.6;
    const t1 = Math.min(0.94, t0 + 0.52);
    ctx.beginPath();
    ctx.moveTo(lerp(tA[0], tipX, t0) + nx * off, lerp(tA[1], tipY, t0) + ny * off);
    ctx.lineTo(lerp(tA[0], tipX, t1) + nx * off * 0.35, lerp(tA[1], tipY, t1) + ny * off * 0.35);
    ctx.stroke();
  }
  // ferrule: a bound metal collar
  ctx.beginPath();
  ctx.moveTo(tA[0] + nx * 11, tA[1] + ny * 11);
  ctx.lineTo(tA[0] - nx * 11, tA[1] - ny * 11);
  ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tA[0] + dxu * 7 + nx * 11, tA[1] + dyu * 7 + ny * 11);
  ctx.lineTo(tA[0] + dxu * 7 - nx * 11, tA[1] + dyu * 7 - ny * 11);
  ctx.lineWidth = 2.4; ctx.stroke();
  // loose hairs past the point
  ctx.strokeStyle = dark ? 'rgba(18,14,10,0.7)' : 'rgba(238,230,210,0.8)';
  for (let i = 0; i < 5; i++) {
    const sw = (i - 2) * 0.14;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tipX - dxu * 8, tipY - dyu * 8);
    ctx.quadraticCurveTo(tipX + dxu * 16 - nx * sw * 3, tipY + dyu * 16 - ny * sw * 3,
      tipX + dxu * 30 - nx * sw * 8, tipY + dyu * 30 - ny * sw * 8);
    ctx.stroke();
  }
  // hand
  ctx.beginPath(); ctx.arc(bx, by, 7.5, 0, TAU);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.restore();
}

/* ============================================================= key line */
const KEY = '七岁属辞，开口咏凤凰';
const KEY_SIZE = 112;
const KEY_SPACING = 20;
const KEY_X = 262;
const KEY_Y = 288;
const KEY_CW = KEY_SIZE + KEY_SPACING;

function keyLayer() {
  return bake('s01:key:v2', 1440, 200, (c) => {
    c.font = `900 ${KEY_SIZE}px ${KIT.FONT.display}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = 'rgba(240,232,212,1)';
    const chars = [...KEY];
    const r = mulberry32(hash('s01key', 5));
    for (let i = 0; i < chars.length; i++) {
      const jy = (r() - 0.5) * 10;
      const jr = (r() - 0.5) * 0.035;
      c.save();
      c.translate(i * KEY_CW + KEY_CW / 2, 100 + jy);
      c.rotate(jr);
      c.fillText(chars[i], 0, 0);
      c.restore();
    }
    const rr = mulberry32(2024);
    for (let i = 0; i < 520; i++) {
      const px = rr() * 1440, py = 20 + rr() * 164;
      c.fillStyle = `rgba(240,232,212,${(0.12 + rr() * 0.55).toFixed(3)})`;
      c.fillRect(px, py, 1 + rr() * 2.6, 1 + rr() * 2);
    }
  }, { seed: 33, erode: 0.44, tint: '#f0e6ca', tint2: '#c6b490' });
}

/* ================================================================ crack */
function crackEdge() {
  const pts = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = -14 + t * (H + 28);
    const wob = (KIT.noise2(t * 3.1, 0.7, 812) - 0.5) * 54
      + (KIT.noise2(t * 10.7, 2.1, 813) - 0.5) * 18
      + (KIT.noise2(t * 27.3, 4.4, 814) - 0.5) * 7;
    pts.push([1798 + wob, y]);
  }
  return pts;
}

function drawPortalWedge(ctx, u) {
  const open = smoothstep(1.99, 2.86, u);
  if (open <= 0.002) return 0;
  const edge = crackEdge();
  const wmax = 176 * open;

  // ---- interior: a sliver of the next medium (sized silk)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(edge[0][0] + wmax, edge[0][1]);
  for (let i = 0; i < edge.length; i++) {
    ctx.lineTo(edge[i][0] + wmax * (0.05 + 0.95 * (i / (edge.length - 1))), edge[i][1]);
  }
  ctx.lineTo(W + 20, H + 20);
  ctx.lineTo(W + 20, -20);
  ctx.closePath();
  ctx.clip();
  const g = ctx.createLinearGradient(1780, 0, W, 0);
  g.addColorStop(0, '#efe7d4');
  g.addColorStop(0.28, '#fbf8f0');
  g.addColorStop(1, '#e4dac2');
  ctx.fillStyle = g;
  ctx.fillRect(1740, -20, W - 1740, H + 40);
  const r = mulberry32(hash('s01next', 3));
  ctx.strokeStyle = 'rgba(120,108,86,0.14)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 70; i++) {
    const y = r() * H;
    ctx.beginPath(); ctx.moveTo(1800, y); ctx.lineTo(W, y + (r() - 0.5) * 2); ctx.stroke();
  }
  // one ribbon of era 02 crossing the slit
  ctx.strokeStyle = 'rgba(34,28,20,0.62)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = 1822 + t * 150;
    const y = 180 + t * 600 + Math.sin(t * 5.2 + u * 1.2) * 46;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(165,42,34,0.55)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = 1852 + t * 100;
    const y = 300 + t * 460 + Math.sin(t * 4.1 + 2 + u) * 34;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // ---- seal paste bleeding out of the crack
  ctx.save();
  const bleed = smoothstep(2.02, 2.9, u);
  const bx = edge[Math.floor(edge.length * 0.44)][0];
  const rg = ctx.createLinearGradient(bx - 132, 0, bx + 4, 0);
  rg.addColorStop(0, 'rgba(165,42,34,0)');
  rg.addColorStop(0.45, `rgba(146,32,26,${0.10 * bleed})`);
  rg.addColorStop(0.92, `rgba(178,46,34,${0.34 * bleed})`);
  rg.addColorStop(1, `rgba(120,22,16,${0.55 * bleed})`);
  ctx.fillStyle = rg;
  ctx.fillRect(bx - 132, 0, 138, H);
  const dr = mulberry32(hash('s01drip', 7));
  for (let i = 0; i < 22; i++) {
    const y = 60 + dr() * 920;
    const len = 40 + dr() * 230;
    const x = bx - 10 - dr() * 70;
    const w = 2 + dr() * 7;
    const gg = ctx.createLinearGradient(x, y, x, y + len);
    gg.addColorStop(0, `rgba(158,36,28,${(0.34 + dr() * 0.3) * bleed})`);
    gg.addColorStop(1, 'rgba(158,36,28,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(x, y, w, len);
  }
  // pooled paste blots
  for (let i = 0; i < 9; i++) {
    const y = 100 + dr() * 860;
    const x = bx - 20 - dr() * 90;
    ctx.fillStyle = `rgba(150,34,26,${(0.14 + dr() * 0.24) * bleed})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 12 + dr() * 26, 8 + dr() * 22, dr() * 3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // ---- chipped lip of the split
  ctx.save();
  ctx.strokeStyle = 'rgba(250,244,226,0.9)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(edge[0][0], edge[0][1]);
  for (let i = 1; i < edge.length; i++) ctx.lineTo(edge[i][0], edge[i][1]);
  ctx.stroke();
  // dark inner shadow falling left off the lip
  ctx.strokeStyle = 'rgba(6,5,4,0.62)';
  ctx.lineWidth = 16;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(edge[0][0] - 7, edge[0][1]);
  for (let i = 1; i < edge.length; i++) ctx.lineTo(edge[i][0] - 7, edge[i][1]);
  ctx.stroke();
  // spall chips either side of the lip
  const cr = mulberry32(hash('s01chip', 3));
  ctx.globalAlpha = 1;
  for (let i = 0; i < 90; i++) {
    const t = cr();
    const idx = Math.min(edge.length - 1, Math.floor(t * edge.length));
    const px = edge[idx][0] - 6 - cr() * 26;
    const py = edge[idx][1] + (cr() - 0.5) * 18;
    ctx.fillStyle = `rgba(240,232,210,${(0.05 + cr() * 0.28).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 3 + cr() * 8, py + (cr() - 0.5) * 6);
    ctx.lineTo(px, py + 2 + cr() * 7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  return open;
}

/* ============================================================== particles */
const DUST = [];
const CHASE = [];
let PARTICLES_READY = false;
function initParticles() {
  if (PARTICLES_READY) return;
  const r = mulberry32(hash('s01dust', 991));
  for (let i = 0; i < 640; i++) {
    DUST.push({
      x: r() * W, y: 80 + r() * 940, vx: (r() - 0.5) * 90, vy: -20 - r() * 110,
      s: 0.9 + Math.pow(r(), 2) * 3.8, a: 0.16 + r() * 0.68,
    });
  }
  for (let i = 0; i < 190; i++) {
    CHASE.push({
      x: 700 + r() * 1100, y: 380 + r() * 580, s: 0.8 + r() * 3.8,
      a: 0.18 + r() * 0.66, sp: 0.4 + r() * 1.5, dy: (r() - 0.5) * 130,
    });
  }
  PARTICLES_READY = true;
}

function drawImpactDust(ctx, u) {
  const t = u - 2.0;
  if (t < 0 || t > 2.4) return;
  ctx.save();
  const k = Math.exp(-t * 1.1);
  for (const d of DUST) {
    const x = d.x + d.vx * t;
    const y = d.y + d.vy * t + 42 * t * t;
    if (y > H + 10) continue;
    const a = d.a * k * clamp01(t / 0.05);
    ctx.fillStyle = `rgba(234,224,200,${a.toFixed(3)})`;
    ctx.fillRect(x, y, d.s, d.s);
    if (d.s > 2.6) {
      ctx.fillStyle = `rgba(234,224,200,${(a * 0.35).toFixed(3)})`;
      ctx.fillRect(x - 2, y + d.s * 0.3, d.s + 4, 1);
    }
  }
  ctx.restore();
}

function drawChase(ctx, u, targetX) {
  const p = smoothstep(4.1, 4.9, u);
  if (p <= 0) return;
  ctx.save();
  for (const c of CHASE) {
    const t = (u - 4.1) * c.sp;
    const x = c.x + t * 500 + Math.sin(t * 2 + c.s) * 16;
    const y = c.y + c.dy * t * 0.3 - t * 44;
    if (x > targetX + 70) continue;
    const a = c.a * p * (0.3 + 0.7 * Math.abs(Math.sin(t * 3 + c.s)));
    ctx.strokeStyle = `rgba(228,218,196,${a.toFixed(3)})`;
    ctx.lineWidth = 1 + c.s * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - (30 + c.s * 16), y + 3);
    ctx.stroke();
  }
  ctx.restore();
}

/* =============================================================== render */
export function renderAt(ctx, u, beat, env = {}) {
  initParticles();
  const granite = graniteLayer();
  const proc = processionLayer();
  const keyL = keyLayer();

  // impact shudder
  const impact = u >= 2.0 ? Math.exp(-(u - 2.0) * 6.5) : 0;
  const shakeAmp = 7.6 * impact;
  const shx = Math.sin((u - 2.0) * 96) * shakeAmp;
  const shy = Math.cos((u - 2.0) * 74) * shakeAmp * 0.7;

  ctx.save();
  ctx.translate(shx, shy);

  ctx.drawImage(granite, -4, -4, W + 8, H + 8);

  // procession, drifting slowly right-to-left
  const drift = PROC_OFF - easeInOut(smoothstep(0, 6, u)) * 30;
  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.drawImage(proc, drift, 0, PROC_W, H);
  ctx.globalAlpha = 0.14;
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(proc, drift + 2.6, -2.2, PROC_W, H);
  ctx.restore();

  drawPortalWedge(ctx, u);

  // ---- key line carved into the stone
  if (u > 1.96) {
    // the inscription register itself: a shallow incised frame
    const panelP = smoothstep(1.97, 2.42, u);
    ctx.save();
    ctx.globalAlpha = panelP;
    const px0 = 236, py0 = 192, px1 = 1712, py1 = 392;
    ctx.strokeStyle = 'rgba(236,227,206,0.30)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px0, py0); ctx.lineTo(px1, py0 - 3); ctx.lineTo(px1 + 2, py1); ctx.lineTo(px0 - 2, py1 + 3);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(236,227,206,0.14)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px0 + 9, py0 + 9); ctx.lineTo(px1 - 9, py0 + 6);
    ctx.lineTo(px1 - 7, py1 - 9); ctx.lineTo(px0 + 7, py1 - 6);
    ctx.closePath();
    ctx.stroke();
    const cr = mulberry32(hash('s01panel', 2));
    for (let i = 0; i < 30; i++) {
      const edge = i % 4;
      const t = cr();
      let cx2, cy2;
      if (edge === 0) { cx2 = lerp(px0, px1, t); cy2 = py0; }
      else if (edge === 1) { cx2 = px1; cy2 = lerp(py0, py1, t); }
      else if (edge === 2) { cx2 = lerp(px1, px0, t); cy2 = py1; }
      else { cx2 = px0; cy2 = lerp(py1, py0, t); }
      ctx.fillStyle = `rgba(236,227,206,${(0.08 + cr() * 0.3).toFixed(3)})`;
      ctx.fillRect(cx2 + (cr() - 0.5) * 9, cy2 + (cr() - 0.5) * 9, 2 + cr() * 6, 1.5 + cr() * 4);
    }
    ctx.restore();

    const cellY = KEY_Y - 100;
    let revealed = 0;
    for (let i = 0; i < [...KEY].length; i++) {
      const ti = 2.0 + i * 0.082;
      const p = clamp01((u - ti) / 0.24);
      if (p <= 0) break;
      revealed = i + 1;
      const sx = i * KEY_CW;
      const revealH = 200 * easeOut(p);
      // bevel light: a copy of the glyph offset, clipped to the reveal
      ctx.save();
      ctx.beginPath();
      ctx.rect(KEY_X + sx - 10, cellY - 6, KEY_CW + 6, revealH + 6);
      ctx.clip();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.24;
      ctx.drawImage(keyL, 0, 0, 1440, 200, KEY_X + 2.6, cellY + 2.6, 1440, 200);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(keyL, 0, 0, 1440, 200, KEY_X, cellY, 1440, 200);
      // a faint chisel scar under the newest character
      if (p < 0.96) {
        const ey = cellY + revealH;
        ctx.globalCompositeOperation = 'lighter';
        const eg = ctx.createLinearGradient(0, ey - 16, 0, ey + 6);
        eg.addColorStop(0, 'rgba(255,250,232,0)');
        eg.addColorStop(0.7, `rgba(255,250,230,${0.16 * (1 - p)})`);
        eg.addColorStop(1, 'rgba(255,250,230,0)');
        ctx.fillStyle = eg;
        ctx.fillRect(KEY_X + sx + 8, ey - 16, KEY_CW - 18, 24);
      }
      ctx.restore();
    }
    void revealed;
  }

  // ---- the child
  const doorX = 1816;
  const walkP = smoothstep(4.05, 6.0, u);
  const cx = lerp(478, 1902, easeInOut(walkP));
  const gy = lerp(898, 872, walkP);
  const sc = lerp(0.94, 0.86, walkP);
  const phase = (u / 1.0) * TAU;
  const brushAng = lerp(-2.06, -1.86, walkP) + Math.sin(phase) * 0.015;

  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, doorX - 4, H); ctx.clip();
  drawChild(ctx, cx, gy, sc, { phase, walk: smoothstep(4.0, 4.6, u), brushAng });
  ctx.restore();
  if (cx + 150 > doorX) {
    ctx.save();
    ctx.beginPath(); ctx.rect(doorX - 4, 0, W - doorX + 24, H); ctx.clip();
    drawChild(ctx, cx, gy, sc, { phase, walk: smoothstep(4.0, 4.6, u), brushAng, dark: true });
    ctx.restore();
  }

  drawChase(ctx, u, cx);
  drawImpactDust(ctx, u);
  ctx.restore(); // shake

  // ---- faint red inscription at the top (brightened cinnabar, ivory backing
  // plate + 1px ivory edge so it survives the black stone rubbing below)
  ctx.save();
  const topA = smoothstep(0.15, 0.85, u);
  ctx.globalAlpha = topA;
  ctx.font = `600 28px ${KIT.FONT.display}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
  const insW = ctx.measureText('巩县 · 景云三年').width;
  const bx = 588 - 22, by = 118 - 27, bw = insW + 44, bh = 54;
  const backing = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  backing.addColorStop(0, 'rgba(18,16,12,0)');
  backing.addColorStop(0.12, 'rgba(18,16,12,0.62)');
  backing.addColorStop(0.88, 'rgba(18,16,12,0.62)');
  backing.addColorStop(1, 'rgba(18,16,12,0)');
  ctx.fillStyle = backing;
  ctx.fillRect(bx, by, bw, bh);
  KIT.ink.roughText(ctx, '巩县 · 景云三年', 588, 118, {
    size: 28, font: KIT.FONT.display, weight: 700, color: '#f04e37',
    stroke: 'rgba(246,240,224,0.82)', strokeWidth: 1, seed: 3, letterSpacing: 8,
  });
  ctx.restore();

  // partial red seal
  ctx.save();
  ctx.globalAlpha = 0.66 * smoothstep(0.4, 1.2, u);
  KIT.ink.sealStamp(ctx, 1578, 620, 96, '少陵', { seed: 71, color: '#a52a22', rotate: -0.05, vertical: true, h: 100 });
  ctx.restore();

  // carved caption bottom-left
  ctx.save();
  ctx.globalAlpha = smoothstep(0.6, 1.3, u) * 0.92;
  KIT.ink.roughText(ctx, '第一石 · 车马出行', 116, 1002, {
    size: 27, font: KIT.FONT.display, weight: 500, color: 'rgba(216,204,180,0.80)', seed: 9, letterSpacing: 3,
  });
  KIT.ink.roughText(ctx, 'RUBBING № 01  ·  712 CE  ·  巩县', 116, 1038, {
    size: 15, font: KIT.FONT.mono, weight: 500, color: 'rgba(206,194,170,0.46)', seed: 11, letterSpacing: 2.6,
  });
  ctx.restore();

  // ---- carved gate frame at the right edge by u≈5.2
  const gateP = smoothstep(5.05, 5.6, u);
  if (gateP > 0) {
    ctx.save();
    ctx.globalAlpha = gateP;
    const gx = 1742, gw = 182, gyTop = 112, gh = 848;
    ctx.strokeStyle = 'rgba(232,222,200,0.86)';
    ctx.lineWidth = 5;
    ctx.strokeRect(gx, gyTop, gw, gh);
    ctx.strokeStyle = 'rgba(232,222,200,0.34)';
    ctx.lineWidth = 2;
    ctx.strokeRect(gx - 13, gyTop - 13, gw + 26, gh + 26);
    ctx.fillStyle = 'rgba(232,222,200,0.14)';
    ctx.fillRect(gx - 13, gyTop - 48, gw + 26, 32);
    ctx.strokeStyle = 'rgba(232,222,200,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(gx - 13, gyTop - 48, gw + 26, 32);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const px = gx - 6 + i * (gw / 8);
      ctx.moveTo(px, gyTop - 48);
      ctx.lineTo(px + 11, gyTop - 28);
      ctx.lineTo(px + 22, gyTop - 48);
    }
    ctx.stroke();
    const r = mulberry32(hash('s01gate', 5));
    for (let i = 0; i < 50; i++) {
      const y = gyTop + r() * gh;
      const w = 2 + r() * 10;
      ctx.fillStyle = `rgba(232,222,200,${(0.05 + r() * 0.22).toFixed(3)})`;
      ctx.fillRect(r() < 0.5 ? gx - 2 - w : gx + gw + 2, y, w, 2 + r() * 9);
    }
    // carved 云纹 on the jambs
    for (let i = 0; i < 5; i++) {
      cloudScroll(ctx, gx + 12, gyTop + 120 + i * 150, 0.5, 300 + i, gateP * 0.55);
      cloudScroll(ctx, gx + gw - 58, gyTop + 180 + i * 150, 0.5, 400 + i, gateP * 0.55);
    }
    ctx.restore();
  }

  // film grain
  const grain = KIT.layer('s01:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 12, { amp: 0.14 }));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.19;
  ctx.drawImage(grain, 0, 0, W, H);
  ctx.restore();

  if (impact > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = impact * 0.13;
    ctx.fillStyle = '#efe7cf';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  const shown = Math.min(10, Math.max(0, Math.floor((u - 2.0) / 0.082) + 1));
  markText('s01-caption', shown > 0 ? [...KEY].slice(0, shown).join('') : KEY, KEY_X, KEY_Y - 62,
    Math.max(1, shown) * KEY_CW, KEY_SIZE * 1.2,
    { size: KEY_SIZE, align: 'left', color: '#f0e6ca' });
  void beat; void env;
}

export default { renderAt };
