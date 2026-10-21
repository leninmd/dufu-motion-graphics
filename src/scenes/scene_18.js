/**
 * 18 · 现代代码美学 · 大模型时代 / Dark IDE & Live SVG/Shader Coding · 2026
 *
 * The film ends where it began: at a description. A dark editor on the left
 * types the poet at a sixteenth-note rhythm; on the right a live preview holds
 * the Xiang river and one boat. On the bar-2 downbeat Enter lands, the boat
 * shatters into 1,455 gold stars, and the last line of the film arrives.
 * In bar 3 the editor fades to a strip and the camera pushes into the stars
 * toward the gate on the right — the outro's history wall.
 *
 * Everything is procedural: the code is a token scanner, the river is a set of
 * deterministic beziers, and the star field is 1,455 seeded particles.
 */
import KIT from '../kit/index.js';
import { clamp01, lerp, smoothstep, easeOut, easeInOut, easeOutCubic, hash, unit, mulberry32, TAU } from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
const MONO = '"Cascadia Mono", "Consolas", "Noto Serif SC", monospace';
const SERIF = KIT.FONT.serif;

const ED = { x: 64, y: 196, w: 1022, h: 754 };
const PV0 = { x: 1100, y: 196, w: 748, h: 754 };
// LINE_H is an INTEGER on purpose: a 25.5 px leading put every other code line
// on a half-pixel boundary, and the green number tokens (4739 / 1455) rasterised
// with a visible second, blurrier copy of themselves. Integer leading + integer
// glyph origins below kill that ghosting completely.
const LINE_H = 26;
const CODE_TOP = 274;
const FONT_CODE = 15;

const QUOTE = ['他没能致君尧舜上，', '却把整个时代，写成了诗。'];

const SYN = {
  kw: '#7ec8ff',
  str: '#f1d58a',
  num: '#7bdc9a',
  fn: '#cfe6ff',
  ident: '#c3cfdb',
  punct: '#7d8fa1',
  comment: '#5b6b7c',
  plain: '#c3cfdb',
};

/* --------------------------------------------------------------------- code */
const CODE = [
  'import { Immortal } from "poetry/core";',
  'import { stars, shader } from "@gl/sky";',
  'import { measure } from "./metrics.js";',
  '',
  '// 少陵测试 · 一个人，一支笔，一千四百五十五首诗',
  'const poet = new Immortal("Du Fu", { distanceKm: 4739, poems: 1455, forSelf: 0 });',
  'const era = { dynasty: "Tang", medium: "language", forSelf: 0 };',
  '',
  'shader.stars(1455).over(xiangRiver);',
  '',
  'for (const star of stars) {',
  '  star.from(poet.words);',
  '  star.gold = true;',
  '}',
  '',
  'render(poet, {',
  '  stars: 1455,',
  '  seed: 770',
  '});',
  '',
  'export default poet.render({ lens: "history" });',
  'export const verdict = measure(poet, { century: 8 });',
  '',
  '// 「他没能致君尧舜上，却把整个时代，写成了诗。」',
  '// 0 for self — every line was for someone else.',
];
const TYPE_FIRST = 15; // 0-based index of `render(poet, {`
const TYPE_LAST = 18;  // index of `});`
const TYPE_T0 = 0.45;
const TYPE_RATE = 4;   // characters per sixteenth

/** A deliberately small JS/GLSL token scanner. Deterministic, runs at build. */
function tokenize(line) {
  const out = [];
  if (!line) return out;
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|(\b(?:import|from|const|new|for|of|let|export|default|return|true|false)\b)|([A-Za-z_$][\w$]*(?=\())|([A-Za-z_$][\w$]*)|([{}()[\];,.:=+\-*/<>?])|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(line))) {
    const t = m[0];
    let style = 'plain';
    if (m[1]) style = 'comment';
    else if (m[2]) style = 'str';
    else if (m[3]) style = 'num';
    else if (m[4]) style = 'kw';
    else if (m[5]) style = 'fn';
    else if (m[6]) style = 'ident';
    else if (m[7]) style = 'punct';
    else if (m[8]) style = 'plain';
    out.push([t, style]);
  }
  return out;
}

/* ------------------------------------------------------------------ preview */
const CUV = [
  [[0.02, 0.70], [0.30, 0.60], [0.58, 0.76], [1.00, 0.58]],
  [[0.05, 0.77], [0.34, 0.68], [0.62, 0.84], [1.02, 0.65]],
  [[0.00, 0.64], [0.26, 0.56], [0.55, 0.68], [0.98, 0.53]],
  [[0.08, 0.84], [0.40, 0.75], [0.70, 0.90], [1.05, 0.71]],
  [[0.03, 0.58], [0.30, 0.52], [0.60, 0.62], [0.96, 0.48]],
];

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}
function cubicTan(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]),
    3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]),
  ];
}

let DATA = null;

function bakePreviewBg() {
  const bw = 1400, bh = 900;
  return KIT.layer('scene18:bake:preview', bw, bh, (c) => {
    const sky = c.createLinearGradient(0, 0, 0, bh);
    sky.addColorStop(0, '#04161b');
    sky.addColorStop(0.34, '#082227');
    sky.addColorStop(0.56, '#0b2a2d');
    sky.addColorStop(0.72, '#061c20');
    sky.addColorStop(1, '#031214');
    c.fillStyle = sky;
    c.fillRect(0, 0, bw, bh);
    // a low moon, the only warm source in the picture
    const mx = bw * 0.66, my = bh * 0.23;
    const halo = c.createRadialGradient(mx, my, 4, mx, my, 210);
    halo.addColorStop(0, 'rgba(255,240,205,0.85)');
    halo.addColorStop(0.05, 'rgba(255,226,168,0.55)');
    halo.addColorStop(0.24, 'rgba(214,176,110,0.13)');
    halo.addColorStop(0.6, 'rgba(140,170,170,0.04)');
    halo.addColorStop(1, 'rgba(120,160,160,0)');
    c.fillStyle = halo;
    c.fillRect(0, 0, bw, bh);
    c.fillStyle = 'rgba(255,247,222,0.94)';
    c.beginPath(); c.arc(mx, my, 24, 0, TAU); c.fill();
    // cloud filaments
    for (let i = 0; i < 7; i++) {
      const y = 120 + i * 34 + KIT.noise2(i * 3.7, 0.2, 18) * 30;
      c.strokeStyle = `rgba(168,198,198,${0.02 + i * 0.006})`;
      c.lineWidth = 8 + i * 4;
      c.beginPath();
      for (let x = -40; x <= bw + 40; x += 28) {
        c.lineTo(x, y + Math.sin(x * 0.004 + i * 1.9) * 9 + (KIT.noise2(x * 0.006, i, 12) - 0.5) * 22);
      }
      c.stroke();
    }
    // three ridge silhouettes
    for (let l = 0; l < 3; l++) {
      const baseY = 430 + l * 46;
      const g = c.createLinearGradient(0, baseY - 200, 0, bh);
      g.addColorStop(0, `rgba(${8 + l * 4},${28 + l * 5},${30 + l * 5},${0.86 - l * 0.12})`);
      g.addColorStop(1, `rgba(${2 + l * 3},${14 + l * 4},${16 + l * 4},0.95)`);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, baseY + 120);
      for (let x = 0; x <= bw; x += 16) {
        const nx = x / bw;
        let yy = baseY - 40;
        yy -= 120 * (1 - l * 0.25) * (KIT.fbm1(nx * 3.4 + l * 5.1, 4, 27 + l * 9) - 0.2);
        yy -= 60 * (1 - l * 0.3) * Math.exp(-Math.pow((nx - (0.2 + l * 0.12)) / 0.1, 2));
        c.lineTo(x, yy);
      }
      c.lineTo(bw, bh);
      c.lineTo(0, bh);
      c.closePath();
      c.fill();
    }
    // the river
    const waterY = 0.60 * bh;
    const water = c.createLinearGradient(0, waterY, 0, bh);
    water.addColorStop(0, '#0c2b2c');
    water.addColorStop(0.4, '#082224');
    water.addColorStop(1, '#031416');
    c.fillStyle = water;
    c.fillRect(0, waterY, bw, bh - waterY);
    // reflected moon path
    for (let i = 0; i < 80; i++) {
      const yy = waterY + 10 + i * 5.4;
      const ww = 30 + i * 3.6;
      const a = 0.16 * Math.pow(1 - i / 80, 1.3);
      c.fillStyle = `rgba(241,213,138,${a.toFixed(3)})`;
      c.fillRect(mx - ww / 2 + Math.sin(i * 1.7) * 10, yy, ww, 1.4);
    }
    // horizontal current lines
    for (let i = 0; i < 34; i++) {
      const yy = waterY + 14 + i * 12.5;
      c.strokeStyle = `rgba(150,205,200,${0.03 + KIT.unit(18, i, 2) * 0.035})`;
      c.lineWidth = 1;
      c.beginPath();
      const off = Math.sin(i * 0.8) * 40;
      c.moveTo(-20, yy);
      for (let x = -20; x <= bw + 20; x += 24) c.lineTo(x, yy + Math.sin(x * 0.01 + i) * 2.2);
      c.stroke();
      void off;
    }
    // mist banks
    for (let i = 0; i < 5; i++) {
      const yy = waterY - 40 + i * 62;
      const g = c.createLinearGradient(0, yy - 50, 0, yy + 60);
      g.addColorStop(0, 'rgba(176,214,208,0)');
      g.addColorStop(0.5, `rgba(176,214,208,${0.05 - i * 0.006})`);
      g.addColorStop(1, 'rgba(176,214,208,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(-40, yy + 60);
      for (let x = -40; x <= bw + 40; x += 40) {
        c.lineTo(x, yy + Math.sin(x * 0.005 + i * 2.1) * 14 + (KIT.noise2(x * 0.003, i, 9) - 0.5) * 26);
      }
      c.lineTo(bw + 40, yy + 80);
      c.closePath();
      c.fill();
    }
    // vignette + grain
    const v = c.createRadialGradient(bw * 0.52, bh * 0.46, 120, bw * 0.5, bh * 0.5, bw * 0.82);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.62, 'rgba(0,8,10,0.16)');
    v.addColorStop(1, 'rgba(0,5,7,0.6)');
    c.fillStyle = v;
    c.fillRect(0, 0, bw, bh);
    const grain = KIT.grainLayer(480, 300, 1818, { amp: 0.10 });
    c.globalCompositeOperation = 'screen';
    c.globalAlpha = 0.12;
    c.drawImage(grain, 0, 0, bw, bh);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
  });
}

function build() {
  if (DATA) return DATA;
  const D = { lines: [], stars: [], boatPts: [], bg: bakePreviewBg(), digits: [] };
  for (let i = 0; i < CODE.length; i++) {
    const toks = tokenize(CODE[i]);
    D.lines.push({ text: CODE[i], toks, chars: [...CODE[i]] });
  }
  // ---- star field ---------------------------------------------------------
  const r = mulberry32(1455);
  const nStars = 1455;
  for (let i = 0; i < nStars; i++) {
    const ci = i % CUV.length;
    const cv = CUV[ci];
    const t = (i * 0.61803398875 + 0.137) % 1;
    const wide = r() < 0.16;
    const lat = (r() * 2 - 1) * (wide ? 0.075 : 0.026);
    const p = cubic(cv[0], cv[1], cv[2], cv[3], t);
    const tan = cubicTan(cv[0], cv[1], cv[2], cv[3], t);
    const len = Math.hypot(tan[0], tan[1]) || 1;
    const nx = -tan[1] / len, ny = tan[0] / len;
    const px = p[0] + nx * lat;
    const py = p[1] + ny * lat;
    const tw = r() * TAU;
    const bright = r();
    D.stars.push({
      ci, t0: t, px, py, lat,
      sx: px, sy: py,
      size: 0.9 + Math.pow(r(), 3) * 2.1 + (bright > 0.985 ? 1.6 : 0),
      tone: bright,
      ph: tw,
      delay: r(),
      hero: bright > 0.972,
      depth: r(),
    });
  }
  // ---- boat dissolve origins ---------------------------------------------
  const base = KIT.rig.boatPose({ t: 0, phase: 0 });
  const placed = KIT.rig.placed(base, { x: 0.33 * 1000, y: 0.70 * 1000, scale: 0.62, rot: -0.02 });
  const pts = KIT.rig.sampleRig(placed, { edgeStep: 5, fill: false, seed: 18 });
  D.boatPts = pts.map((p) => [p[0] / 1000, p[1] / 1000]);
  for (const st of D.stars) {
    const bp = D.boatPts[Math.floor((st.t0 * 7919 + st.size * 131) % D.boatPts.length)];
    st.ox = bp[0] + (r() - 0.5) * 0.012;
    st.oy = bp[1] + (r() - 0.5) * 0.012;
  }  // ---- typing schedule + digit pulse events -------------------------------
  let idx = TYPE_FIRST, n = 0;
  const typed = [];
  for (let li = TYPE_FIRST; li <= TYPE_LAST; li++) {
    const chars = [...CODE[li]];
    for (let k = 0; k < chars.length; k++) typed.push({ li, ch: chars[k], n: n++ });
  }
  D.typed = typed;
  for (const t of typed) {
    if (/\d/.test(t.ch)) D.digits.push(TYPE_T0 + (t.n / TYPE_RATE) * 0.125);
  }
  void idx; void n;
  DATA = D;
  return D;
}

/* ------------------------------------------------------------------ helpers */
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function mono(ctx, text, x, y, size, color, weight = 500, align = 'left') {
  ctx.font = `${weight} ${size}px ${MONO}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillText(text, x, y);
}

function codeFont(ctx, size = FONT_CODE) {
  ctx.font = `500 ${size}px ${MONO}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

/** Reveal count for the typed block at time u (sixteenth-note quantised). */
function typedCount(u) {
  if (u < TYPE_T0) return 0;
  const steps = Math.floor((u - TYPE_T0) / 0.125 + 1e-7) + 1;
  return Math.max(0, Math.min(44, steps * TYPE_RATE));
}

function revealForLine(li, count) {
  let start = 0;
  for (let i = TYPE_FIRST; i < li; i++) start += [...CODE[i]].length;
  return Math.max(0, Math.min([...CODE[li]].length, count - start));
}

function activeLineAt(count) {
  let left = count;
  for (let li = TYPE_FIRST; li <= TYPE_LAST; li++) {
    const len = [...CODE[li]].length;
    if (left < len) return li;
    left -= len;
  }
  return TYPE_LAST;
}

function digitPulse(u) {
  let p = 0;
  for (const t of DATA.digits) {
    if (u < t) continue;
    p += Math.exp(-(u - t) * 7);
  }
  return Math.min(1.4, p);
}

/* ------------------------------------------------------------------- editor */
function drawEditor(ctx, u, alpha, collapse) {
  const x = ED.x, y = ED.y, w = ED.w, h = ED.h;
  const stripW = 88;
  const ww = lerp(w, stripW, collapse);
  ctx.save();
  ctx.globalAlpha = alpha;
  // panel
  const bg = ctx.createLinearGradient(x, y, x + 200, y + h);
  bg.addColorStop(0, '#0b1016');
  bg.addColorStop(0.55, '#0a0e14');
  bg.addColorStop(1, '#080c11');
  roundRectPath(ctx, x, y, ww, h, 9);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(126,200,255,0.10)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.save();
  roundRectPath(ctx, x, y, ww, h, 9);
  ctx.clip();
  if (collapse < 0.55) {
    drawEditorFull(ctx, u, x, y, w, h, collapse);
  } else {
    drawEditorStrip(ctx, u, x, y, stripW, h);
  }
  ctx.restore();
  // grounding: the panels sit on the stage, not in it
  const sh = ctx.createLinearGradient(0, y + h, 0, y + h + 34);
  sh.addColorStop(0, 'rgba(0,0,0,0.55)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(x + 12, y + h, Math.max(0, ww - 24), 34);
  ctx.restore();
}

function drawEditorFull(ctx, u, x, y, w, h, collapse) {
  // ---- activity rail
  ctx.fillStyle = '#080c11';
  ctx.fillRect(x, y, 44, h);
  const railIcons = ['files', 'search', 'git', 'play'];
  for (let i = 0; i < railIcons.length; i++) {
    const iy = y + 34 + i * 46;
    if (i === 0) {
      ctx.fillStyle = 'rgba(126,200,255,0.14)';
      ctx.fillRect(x, iy - 14, 2, 28);
    }
    ctx.strokeStyle = i === 0 ? '#9fd4f2' : 'rgba(150,176,198,0.45)';
    ctx.lineWidth = 1.3;
    ctx.strokeRect(x + 16.5, iy - 7.5, 11, 15);
    if (i === 1) {
      ctx.beginPath(); ctx.arc(x + 23, iy - 2, 4, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 26, iy + 2); ctx.lineTo(x + 29, iy + 5); ctx.stroke();
    } else if (i === 2) {
      ctx.beginPath(); ctx.arc(x + 21, iy - 4, 2.4, 0, TAU); ctx.moveTo(x + 25.5, iy - 2); ctx.arc(x + 21, iy + 2, 2.4, -0.5, 1.2); ctx.stroke();
    } else if (i === 3) {
      ctx.fillStyle = i === 3 ? 'rgba(160,215,238,0.8)' : 'rgba(150,176,198,0.45)';
      ctx.beginPath();
      ctx.moveTo(x + 20, iy - 5); ctx.lineTo(x + 27, iy); ctx.lineTo(x + 20, iy + 5); ctx.closePath(); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(150,176,198,0.45)';
      ctx.beginPath(); ctx.moveTo(x + 17, iy - 6); ctx.lineTo(x + 27, iy - 6); ctx.lineTo(x + 27, iy + 7); ctx.lineTo(x + 17, iy + 7); ctx.closePath(); ctx.stroke();
    }
  }
  // ---- tab strip
  const tabY = y + 0, tabH = 34;
  ctx.fillStyle = '#0a0f15';
  ctx.fillRect(x + 44, tabY, w - 44, tabH);
  const tabs = [
    ['scene_18.js', true, '#7ec8ff'],
    ['poet.js', false, '#f1d58a'],
    ['stars.glsl', false, '#7bdc9a'],
  ];
  let tx = x + 52;
  for (const [name, active, col] of tabs) {
    const tw = 8 + name.length * 8.2 + 26;
    if (active) {
      ctx.fillStyle = '#0b1016';
      ctx.fillRect(tx, tabY + 6, tw, tabH - 6);
      ctx.fillStyle = col;
      ctx.fillRect(tx, tabY + 6, tw, 1.5);
    }
    mono(ctx, name, tx + 12, tabY + 21, 11.5, active ? '#dbe8f5' : 'rgba(150,170,188,0.55)', active ? 700 : 500);
    if (active) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(tx + tw - 12, tabY + 21, 2.4, 0, TAU); ctx.fill();
    }
    tx += tw + 2;
  }
  // window dots
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = ['rgba(230,192,120,0.55)', 'rgba(120,190,160,0.45)', 'rgba(160,170,184,0.35)'][i];
    ctx.beginPath(); ctx.arc(x + w - 26 - i * 16, tabY + 17, 4, 0, TAU); ctx.fill();
  }
  // ---- breadcrumb
  const bcY = tabY + tabH;
  ctx.fillStyle = 'rgba(255,255,255,0.018)';
  ctx.fillRect(x + 44, bcY, w - 44, 24);
  mono(ctx, 'src  ›  scenes  ›  scene_18.js', x + 56, bcY + 12, 10.5, 'rgba(158,178,196,0.62)');
  mono(ctx, '0 errors', x + w - 60, bcY + 12, 10, 'rgba(123,220,154,0.7)', 600, 'right');
  mono(ctx, 'UTF-8', x + w - 112, bcY + 12, 10, 'rgba(140,160,178,0.45)', 500, 'right');
  // ---- code
  const codeY = CODE_TOP;
  const gutterW = 52;
  const codeX = x + 44 + gutterW + 14;
  // current line highlight
  const count = typedCount(u);
  const activeLine = activeLineAt(count);
  const focusLine = u < 1.86 ? activeLine : 19;
  ctx.fillStyle = 'rgba(126,200,255,0.045)';
  ctx.fillRect(x + 44, codeY + focusLine * LINE_H - LINE_H / 2, w - 44 - 46, LINE_H);
  ctx.fillStyle = 'rgba(126,200,255,0.55)';
  ctx.fillRect(x + 44, codeY + focusLine * LINE_H - LINE_H / 2, 2, LINE_H);
  // gutter
  ctx.save();
  ctx.beginPath();
  const gutterTop = codeY - LINE_H / 2;
  ctx.rect(x + 44, gutterTop, gutterW, (y + h - 56) - gutterTop);
  ctx.clip();
  for (let i = 0; i < CODE.length; i++) {
    const ly = codeY + i * LINE_H;
    const cur = i === focusLine;
    mono(ctx, String(i + 1).padStart(2, ' '), x + 44 + gutterW - 10, ly, 11, cur ? 'rgba(190,225,245,0.92)' : 'rgba(110,132,150,0.42)', 500, 'right');
  }
  ctx.restore();
  // text
  codeFont(ctx, FONT_CODE);
  for (let i = 0; i < CODE.length; i++) {
    const ly = codeY + i * LINE_H;
    if (ly > y + h - 70) break;
    const reveal = i >= TYPE_FIRST && i <= TYPE_LAST ? revealForLine(i, count) : null;
    drawCodeLine(ctx, DATA.lines[i], codeX, ly, reveal);
  }
  // caret
  if (u < 2.0) {
    const li = activeLine;
    const vis = revealForLine(li, count);
    const lx = codeX + measurePrefix(ctx, DATA.lines[li], vis);
    const blink = Math.floor(u * 8) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#bfe4ff';
      ctx.fillRect(lx + 1, codeY + li * LINE_H - 9, 2, 18);
    }
  }
  // minimap
  const mmX = x + w - 52;
  ctx.fillStyle = 'rgba(255,255,255,0.012)';
  ctx.fillRect(mmX, bcY + 24, 40, h - (bcY - y) - 24 - 46);
  for (let i = 0; i < CODE.length; i++) {
    const ly = bcY + 34 + i * 6.4;
    const line = CODE[i];
    let len = Math.min(34, line.length);
    for (let k = 0; k < len; k += 2) {
      const ch = line[k];
      let col = 'rgba(120,150,175,0.30)';
      if (ch === '/' ) col = 'rgba(96,118,136,0.34)';
      else if (ch === '"') col = 'rgba(241,213,138,0.38)';
      else if (/\d/.test(ch)) col = 'rgba(123,220,154,0.34)';
      else if (line.startsWith('const') || line.startsWith('import') || line.startsWith('for') || line.startsWith('export')) col = 'rgba(126,200,255,0.36)';
      ctx.fillStyle = col;
      ctx.fillRect(mmX + 4 + k * 1.15, ly, 1.15, 2.6);
    }
  }
  const viewTop = bcY + 30 + focusLine * 6.4;
  ctx.strokeStyle = 'rgba(180,210,230,0.20)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mmX + 2.5, viewTop - 7, 37, 62);
  // compile scan sweep
  if (u >= 2.0 && u < 2.34) {
    const p = (u - 2.0) / 0.34;
    const sy = y + 34 + (h - 90) * easeOut(p);
    const g = ctx.createLinearGradient(0, sy - 80, 0, sy + 6);
    g.addColorStop(0, 'rgba(126,200,255,0)');
    g.addColorStop(0.85, 'rgba(126,200,255,0.10)');
    g.addColorStop(1, 'rgba(190,235,255,0.24)');
    ctx.fillStyle = g;
    ctx.fillRect(x + 44, sy - 80, w - 44, 86);
    ctx.fillStyle = 'rgba(210,240,255,0.55)';
    ctx.fillRect(x + 44, sy, w - 44, 1.2);
  }
  // ---- enter key, bottom right of the code area
  const kx = x + w - 148, ky = y + h - 118;
  const press = smoothstep(1.86, 1.985, u) * (1 - smoothstep(2.0, 2.08, u));
  const kOff = press * 3.4;
  ctx.save();
  ctx.translate(0, kOff);
  const kg = ctx.createLinearGradient(0, ky, 0, ky + 28);
  kg.addColorStop(0, press > 0.2 ? '#1a2733' : '#22303d');
  kg.addColorStop(1, '#141d27');
  roundRectPath(ctx, kx, ky, 74, 28, 5);
  ctx.fillStyle = kg;
  ctx.fill();
  ctx.strokeStyle = press > 0.2 ? 'rgba(126,200,255,0.5)' : 'rgba(150,180,200,0.24)';
  ctx.lineWidth = 1;
  ctx.stroke();
  mono(ctx, '↵ Enter', kx + 37, ky + 15, 10.5, press > 0.2 ? '#cfeaff' : 'rgba(190,210,225,0.7)', 600, 'center');
  ctx.restore();
  // key travel ripple
  if (u >= 2.0 && u < 2.3) {
    const p = (u - 2.0) / 0.3;
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.5;
    ctx.strokeStyle = '#bfe6ff';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 2; i++) {
      const r = 8 + (p + i * 0.18) * 46;
      ctx.beginPath(); ctx.arc(kx + 37, ky + 14, r, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  // ---- status bar
  const sbY = y + h - 44;
  ctx.fillStyle = '#0a1a22';
  ctx.fillRect(x + 44, sbY, w - 44, 44);
  ctx.fillStyle = 'rgba(126,200,255,0.22)';
  ctx.fillRect(x + 44, sbY, w - 44, 1);
  const compiled = u >= 2.0;
  mono(ctx, '⎇ main', x + 62, sbY + 22, 10.5, 'rgba(158,185,205,0.75)');
  mono(ctx, compiled ? '✓ 0 errors' : '◌ compiling', x + 146, sbY + 22, 10.5, compiled ? '#8fe0ad' : 'rgba(158,185,205,0.55)', 600);
  mono(ctx, 'UTF-8', x + 240, sbY + 22, 10.5, 'rgba(158,185,205,0.55)');
  mono(ctx, 'LF', x + 292, sbY + 22, 10.5, 'rgba(158,185,205,0.55)');
  mono(ctx, 'JavaScript', x + 326, sbY + 22, 10.5, 'rgba(158,185,205,0.55)');
  mono(ctx, 'deterministic', x + 412, sbY + 22, 10.5, 'rgba(126,200,255,0.55)');
  // sixteenth-note metronome
  const step = Math.floor(u / 0.125) % 16;
  for (let i = 0; i < 16; i++) {
    const mx = x + 530 + i * 13;
    const on = i === step;
    ctx.fillStyle = on ? 'rgba(126,200,255,0.9)' : (i % 4 === 0 ? 'rgba(126,200,255,0.28)' : 'rgba(126,200,255,0.12)');
    ctx.fillRect(mx, sbY + 18, 7, 7);
  }
  mono(ctx, `Ln ${focusLine + 1}, Col ${(revealForLine(Math.min(focusLine, TYPE_LAST), count) || 1) + 1}`, x + w - 54, sbY + 22, 10.5, 'rgba(158,185,205,0.6)', 500, 'right');
  void collapse;
}

function drawEditorStrip(ctx, u, x, y, w, h) {
  ctx.fillStyle = '#080c11';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(126,200,255,0.5)';
  ctx.fillRect(x + w - 1, y, 1, h);
  // rotated filename
  ctx.save();
  ctx.translate(x + 30, y + h - 40);
  ctx.rotate(-Math.PI / 2);
  mono(ctx, 'scene_18.js', 0, 0, 11, 'rgba(190,220,240,0.7)', 600);
  ctx.restore();
  // line-number tick column
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = i === 19 ? 'rgba(126,200,255,0.8)' : 'rgba(150,180,200,0.18)';
    ctx.fillRect(x + w - 26, y + 30 + i * 26, i === 19 ? 12 : 6, 1.6);
  }
  ctx.fillStyle = 'rgba(126,200,255,0.7)';
  ctx.fillRect(x + w - 30, y + 30 + 19 * 26 - 8, 2, 20);
  // tiny compile badge
  const on = u >= 2.0;
  ctx.fillStyle = on ? 'rgba(123,220,154,0.16)' : 'rgba(255,255,255,0.05)';
  ctx.fillRect(x + 16, y + 16, 56, 18);
  mono(ctx, on ? '✓ 0' : '…', x + 44, y + 25, 9, on ? '#8fe0ad' : 'rgba(160,180,195,0.6)', 700, 'center');
}

function measurePrefix(ctx, line, nChars) {
  if (nChars <= 0) return 0;
  codeFont(ctx, FONT_CODE);
  let left = nChars;
  let w = 0;
  for (const [text] of line.toks) {
    if (left <= 0) break;
    const chars = [...text];
    if (chars.length <= left) { w += ctx.measureText(text).width; left -= chars.length; }
    else {
      w += ctx.measureText(chars.slice(0, left).join('')).width;
      left = 0;
    }
  }
  return w;
}

function drawCodeLine(ctx, line, x, y, reveal) {
  codeFont(ctx, FONT_CODE);
  let left = reveal;
  // one integer origin for the whole line: every token is stamped at a whole
  // pixel so a number can never be drawn twice through sub-pixel AA
  let cx = Math.round(x);
  const yy = Math.round(y);
  for (const [text, style] of line.toks) {
    if (reveal != null) {
      if (left <= 0) break;
      const chars = [...text];
      const shown = chars.length <= left ? text : chars.slice(0, left).join('');
      left -= chars.length;
      if (shown) {
        ctx.fillStyle = SYN[style] || SYN.plain;
        ctx.fillText(shown, Math.round(cx), yy);
        cx += ctx.measureText(shown).width;
      }
    } else {
      ctx.fillStyle = SYN[style] || SYN.plain;
      ctx.fillText(text, Math.round(cx), yy);
      cx += ctx.measureText(text).width;
    }
  }
}

/* ------------------------------------------------------------------ preview */
function previewRect(u) {
  const grow = smoothstep(3.95, 4.9, u);
  const x = lerp(PV0.x, 300, grow);
  const y = lerp(PV0.y, 174, grow);
  const w = lerp(PV0.w, 1548, grow);
  const h = lerp(PV0.h, 796, grow);
  return { x, y, w, h, header: 30, grow };
}

function drawPreview(ctx, u, R) {
  const px = R.x, py = R.y, pw = R.w, ph = R.h;
  // ---- panel
  const bg = ctx.createLinearGradient(px, py, px, py + ph);
  bg.addColorStop(0, '#071a1e');
  bg.addColorStop(1, '#031012');
  roundRectPath(ctx, px, py, pw, ph, 9);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(126,200,255,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  {
    const sh = ctx.createLinearGradient(0, py + ph, 0, py + ph + 34);
    sh.addColorStop(0, 'rgba(0,0,0,0.5)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(px + 12, py + ph, pw - 24, 34);
  }
  // ---- header
  const headA = 1 - 0.82 * smoothstep(4.1, 4.7, u);
  ctx.save();
  ctx.globalAlpha = headA;
  ctx.fillStyle = 'rgba(8,22,26,0.9)';
  ctx.fillRect(px + 1, py + 1, pw - 2, R.header);
  ctx.fillStyle = 'rgba(126,200,255,0.10)';
  ctx.fillRect(px + 1, py + R.header, pw - 2, 1);
  mono(ctx, 'PREVIEW', px + 16, py + 16, 9.5, 'rgba(160,225,225,0.7)', 700);
  mono(ctx, 'live · svg / glsl', px + 76, py + 16, 9.5, 'rgba(140,180,190,0.45)');
  const compiled = u >= 2.0;
  mono(ctx, compiled ? '1,455 stars' : '1 boat', px + pw - 16, py + 16, 9.5, compiled ? 'rgba(241,213,138,0.8)' : 'rgba(160,190,200,0.5)', 600, 'right');
  // window dots
  for (let i = 0; i < 2; i++) {
    ctx.strokeStyle = 'rgba(150,190,200,0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + pw - 44 - i * 16, py + 11, 10, 10);
  }
  ctx.restore();
  // ---- canvas
  const cx = px + 1, cy = py + R.header + 1, cw = pw - 2, ch = ph - R.header - 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx, cy, cw, ch);
  ctx.clip();
  // baked river plate
  ctx.drawImage(DATA.bg, cx, cy, cw, ch);
  // camera push in bar 3
  const camP = smoothstep(4.55, 6.0, u);
  const cs = 1 + 0.135 * camP;
  const fx = cx + cw * 0.55, fy = cy + ch * 0.52;
  ctx.translate(fx, fy);
  ctx.scale(cs, cs);
  ctx.translate(-fx, -fy);
  const rect = { x: cx, y: cy, w: cw, h: ch };
  drawRiverLines(ctx, u, rect);
  drawGate(ctx, u, rect);
  drawBoatAndStars(ctx, u, rect);
  drawPreviewHud(ctx, u, rect);
  // compile sweep across the preview
  if (u >= 2.0 && u < 2.34) {
    const p = (u - 2.0) / 0.34;
    const sy = cy + ch * easeOut(p);
    const g = ctx.createLinearGradient(0, sy - 110, 0, sy + 4);
    g.addColorStop(0, 'rgba(241,213,138,0)');
    g.addColorStop(0.9, 'rgba(241,213,138,0.10)');
    g.addColorStop(1, 'rgba(255,240,200,0.30)');
    ctx.fillStyle = g;
    ctx.fillRect(cx, sy - 110, cw, 116);
  }
  // explosion flash
  if (u >= 2.0 && u < 2.35) {
    const a = Math.exp(-(u - 2.0) * 16) * 0.11;
    ctx.fillStyle = `rgba(255,238,196,${a.toFixed(3)})`;
    ctx.fillRect(cx, cy, cw, ch);
  }
  ctx.restore();
  // panel inner edge
  ctx.strokeStyle = 'rgba(140,200,210,0.10)';
  ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1);
}

function drawRiverLines(ctx, u, R) {
  const t = u - 2.0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < CUV.length; i++) {
    const cv = CUV[i];
    const pts = [];
    for (let k = 0; k <= 40; k++) {
      const tt = k / 40;
      const p = cubic(cv[0], cv[1], cv[2], cv[3], tt);
      pts.push([R.x + p[0] * R.w, R.y + p[1] * R.h + Math.sin(tt * 9 + u * 1.2 + i) * 2.2]);
    }
    const grad = ctx.createLinearGradient(R.x, 0, R.x + R.w, 0);
    const a = 0.05 + i * 0.008;
    grad.addColorStop(0, 'rgba(150,215,210,0)');
    grad.addColorStop(0.35, `rgba(160,220,212,${a})`);
    grad.addColorStop(0.7, `rgba(241,213,138,${a * 1.1})`);
    grad.addColorStop(1, 'rgba(241,213,138,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    // a second, brighter filament that travels along the current
    if (i % 2 === 0) {
      const off = ((t * 0.10 + i * 0.17) % 1);
      ctx.strokeStyle = `rgba(255,240,190,${0.14 + 0.05 * Math.sin(u * 2 + i)})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const tt = (k / 40) * 0.22 + off;
        if (tt > 1) break;
        const p = cubic(cv[0], cv[1], cv[2], cv[3], tt);
        const xx = R.x + p[0] * R.w, yy = R.y + p[1] * R.h;
        if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawGate(ctx, u, R) {
  const p = smoothstep(4.05, 5.0, u);
  if (p <= 0.01) return;
  const gx = R.x + R.w * 0.858, gy = R.y + R.h * 0.52;
  const gw = R.w * 0.092, gh = R.h * 0.56;
  const left = gx - gw / 2, top = gy - gh / 2;
  ctx.save();
  ctx.globalAlpha = p;
  // the light behind the doorway: a wall of warm air, not a slab
  const glow = ctx.createRadialGradient(gx, top + gh * 0.82, 4, gx, top + gh * 0.82, gh * 0.85);
  glow.addColorStop(0, 'rgba(255,232,176,0.16)');
  glow.addColorStop(0.4, 'rgba(230,200,140,0.055)');
  glow.addColorStop(1, 'rgba(200,190,140,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(gx - gh, top - 60, gh * 2, gh + 200);
  ctx.globalCompositeOperation = 'lighter';
  // vertical veil inside the aperture, strongest at the threshold
  const veil = ctx.createLinearGradient(0, top, 0, top + gh);
  veil.addColorStop(0, 'rgba(255,236,190,0)');
  veil.addColorStop(0.66, 'rgba(255,236,190,0.02)');
  veil.addColorStop(1, 'rgba(255,240,200,0.10)');
  ctx.fillStyle = veil;
  ctx.fillRect(left + 3, top, gw - 6, gh);
  // frame: two posts, a lintel with a slight overhang, and an inner hairline
  const grad = ctx.createLinearGradient(left, 0, left + gw, 0);
  grad.addColorStop(0, 'rgba(241,213,138,0.78)');
  grad.addColorStop(0.5, 'rgba(255,242,206,0.45)');
  grad.addColorStop(1, 'rgba(241,213,138,0.78)');
  ctx.fillStyle = grad;
  ctx.fillRect(left, top, 3, gh);
  ctx.fillRect(left + gw - 3, top, 3, gh);
  ctx.fillRect(left - 14, top - 3, gw + 28, 3.4);
  ctx.fillRect(left - 6, top + 8, gw + 12, 1.2);
  ctx.strokeStyle = 'rgba(241,213,138,0.22)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(left + 9, top + 18, gw - 18, gh - 28);
  // threshold: where the river of stars becomes a wall
  const th = ctx.createLinearGradient(left, 0, left + gw, 0);
  th.addColorStop(0, 'rgba(255,244,210,0)');
  th.addColorStop(0.5, 'rgba(255,248,222,0.75)');
  th.addColorStop(1, 'rgba(255,244,210,0)');
  ctx.fillStyle = th;
  ctx.fillRect(left + 1, top + gh - 2, gw - 2, 2);
  // rising motes in the doorway
  for (let i = 0; i < 16; i++) {
    const t = ((u * 0.42 + i * 0.137) % 1);
    const mx = left + 6 + unit(1818, i, 3) * (gw - 12);
    const my = top + gh - 4 - t * gh * 0.94;
    ctx.fillStyle = `rgba(255,241,200,${(0.55 * (1 - t)).toFixed(3)})`;
    ctx.fillRect(mx, my, 1.6, 1.6);
  }
  ctx.restore();
}

function drawBoatAndStars(ctx, u, R) {
  const dissolve = smoothstep(2.0, 2.34, u);
  const boatA = 1 - smoothstep(2.0, 2.2, u);
  // ---- ambient sky: a handful of quiet stars that were always there
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 68; i++) {
    const x = R.x + unit(181, i, 1) * R.w;
    const y = R.y + unit(181, i, 2) * R.h * 0.42;
    const tw = 0.45 + 0.55 * Math.sin(u * 1.7 + i * 2.1);
    const a = (0.08 + unit(181, i, 3) * 0.2) * tw;
    ctx.fillStyle = `rgba(226,238,226,${a.toFixed(3)})`;
    const s = 0.8 + unit(181, i, 4) * 1.2;
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
  // ---- boat
  if (boatA > 0.01) {
    const pose = KIT.rig.boatPose({ t: u, phase: u * Math.PI * 2 });
    const placed = KIT.rig.placed(pose, {
      x: R.x + R.w * 0.335, y: R.y + R.h * 0.70, scale: (R.w / 1000) * 0.62, rot: -0.02,
    });
    ctx.save();
    ctx.globalAlpha = boatA;
    KIT.rig.drawSilhouette(ctx, placed, { color: 'rgba(2,10,10,0.92)' });
    // warm rim on the hull
    ctx.globalAlpha = boatA * 0.55;
    ctx.strokeStyle = 'rgba(241,213,138,0.42)';
    ctx.lineWidth = 1;
    const hull = placed.parts.find((p) => p.role === 'boat');
    if (hull) {
      ctx.beginPath();
      hull.pts.forEach((pt, i) => (i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])));
      ctx.closePath();
      ctx.stroke();
    }
    // lantern
    const lx = placed.lantern ? placed.lantern.x : R.x + R.w * 0.5;
    const ly = placed.lantern ? placed.lantern.y : R.y + R.h * 0.6;
    const lg = ctx.createRadialGradient(lx, ly, 1, lx, ly, 46);
    lg.addColorStop(0, 'rgba(255,220,150,0.75)');
    lg.addColorStop(0.2, 'rgba(255,200,120,0.20)');
    lg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(lx, ly, 46, 0, TAU); ctx.fill();
    ctx.restore();
    // the constellation ring — reacts to the digits being typed
    const pulseAmp = u >= 2.0 ? 0 : digitPulse(u);
    const ringR = Math.min(R.w, R.h) * 0.16 + pulseAmp * 13;
    const ringX = R.x + R.w * 0.335, ringY = R.y + R.h * 0.54;
    ctx.save();
    ctx.globalAlpha = (1 - dissolve) * (0.22 + pulseAmp * 0.25);
    ctx.strokeStyle = 'rgba(241,213,138,0.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + u * 0.12;
      const rr = ringR + (i % 3 === 0 ? 5 : 0);
      ctx.fillStyle = 'rgba(241,213,138,0.7)';
      ctx.fillRect(ringX + Math.cos(a) * rr - 1, ringY + Math.sin(a) * rr - 1, 2, 2);
    }
    ctx.restore();
  }
  // ---- stars
  if (u < 1.995) return;
  const flow = Math.max(0, u - 2.0) * 0.016 + Math.max(0, u - 3.9) * 0.012;
  const pull = smoothstep(4.2, 5.8, u);
  const buckets = new Map();
  const heroes = [];
  for (let i = 0; i < DATA.stars.length; i++) {
    const s = DATA.stars[i];
    const dp = clamp01((u - 2.0 - s.delay * 0.18) / 0.42);
    if (dp <= 0) continue;
    const e = easeOut(dp);
    // target rides the current
    let tgt = (s.t0 + flow) % 1;
    const cv = CUV[s.ci];
    const p = cubic(cv[0], cv[1], cv[2], cv[3], tgt);
    const tan = cubicTan(cv[0], cv[1], cv[2], cv[3], tgt);
    const len = Math.hypot(tan[0], tan[1]) || 1;
    let nx = -tan[1] / len, ny = tan[0] / len;
    let txp = p[0] + nx * s.lat;
    let typ = p[1] + ny * s.lat;
    if (pull > 0) {
      const gx = 0.858, gy = 0.52;
      const k = pull * clamp01((txp - 0.55) / 0.45) * (0.55 + s.depth * 0.6);
      txp = lerp(txp, gx, k);
      typ = lerp(typ, gy + (typ - 0.52) * 0.25, k);
    }
    // arc from the boat to the current
    const ox = s.ox, oy = s.oy;
    const ax = lerp(ox, txp, e) + Math.sin(e * Math.PI) * (txp - ox) * 0.12;
    const ay = lerp(oy, typ, e) - Math.sin(e * Math.PI) * (0.05 + s.depth * 0.04);
    const sx = R.x + ax * R.w;
    const sy = R.y + ay * R.h;
    const tw = 0.62 + 0.38 * Math.sin(u * 2.2 + s.ph);
    const size = s.size * (0.7 + e * 0.55);
    // stars at the fringe of the current fade into the dark, so the river has
    // no hard upper edge
    const fringe = 1 - clamp01((Math.abs(s.lat) - 0.012) / 0.07) * 0.55;
    const key = `${Math.round(s.tone * 4)}`;
    let b = buckets.get(key);
    if (!b) { b = []; buckets.set(key, b); }
    b.push(sx, sy, size, tw * fringe);
    if (typ > 0.72 && i % 4 === 0) {
      let rb = buckets.get('r');
      if (!rb) { rb = []; buckets.set('r', rb); }
      rb.push(sx + 0.5, sy + 2 + (typ - 0.72) * 12, Math.max(1, size * 0.8), 0.28 * e);
    }
    if (s.hero && e > 0.6) heroes.push([sx, sy, s.size]);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cols = ['rgba(241,213,138,', 'rgba(255,240,205,', 'rgba(233,197,109,', 'rgba(210,228,214,', 'rgba(255,226,168,'];
  for (const [key, arr] of buckets) {
    const isRef = key === 'r';
    const base = isRef ? 'rgba(200,190,150,' : (cols[Number(key)] || cols[0]);
    for (let k = 0; k < arr.length; k += 4) {
      const sz = Math.max(0.85, arr[k + 2]);
      const a = isRef ? 0.05 + 0.14 * arr[k + 3] : 0.35 + 0.5 * arr[k + 3];
      ctx.fillStyle = `${base}${a.toFixed(3)})`;
      ctx.fillRect(arr[k], arr[k + 1], sz, isRef ? sz * 4 : sz);
    }
  }
  // hero stars: core + cross flare
  for (const [hx, hy, hs] of heroes) {
    ctx.fillStyle = 'rgba(255,248,220,0.92)';
    ctx.fillRect(hx - hs * 0.5, hy - hs * 0.5, hs + 0.6, hs + 0.6);
    ctx.fillStyle = 'rgba(241,213,138,0.20)';
    ctx.fillRect(hx - 7, hy, 14, 1);
    ctx.fillRect(hx, hy - 7, 1, 14);
  }
  ctx.restore();
  // constellation lines between a few neighbours (drawn once the river is whole)
  const cl = smoothstep(2.6, 3.4, u) * (1 - smoothstep(4.4, 5.2, u) * 0.6);
  if (cl > 0.01) {
    ctx.save();
    ctx.globalAlpha = cl * 0.30;
    ctx.strokeStyle = 'rgba(241,213,138,0.8)';
    ctx.lineWidth = 0.7;
    for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const idx = Math.floor(unit(183, c, k) * DATA.stars.length);
        const s = DATA.stars[idx];
        const dp = clamp01((u - 2.0 - s.delay * 0.18) / 0.42);
        if (dp <= 0) continue;
        const e = easeOut(dp);
        let tgt = (s.t0 + flow) % 1;
        const cv = CUV[s.ci];
        const p = cubic(cv[0], cv[1], cv[2], cv[3], tgt);
        const x2 = R.x + (lerp(s.ox, p[0] + s.lat, e)) * R.w;
        const y2 = R.y + (lerp(s.oy, p[1], e)) * R.h;
        if (k === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  // dissolve shockwave
  if (u >= 2.0 && u < 2.5) {
    const p = (u - 2.0) / 0.5;
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.45;
    ctx.strokeStyle = 'rgba(255,240,200,0.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(R.x + R.w * 0.335, R.y + R.h * 0.62, 20 + easeOut(p) * R.w * 0.5, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPreviewHud(ctx, u, R) {
  ctx.save();
  const compiled = u >= 2.0;
  mono(ctx, compiled ? 'results: 1,455 poems · 0 for self' : 'rendering boat · 0 stars', R.x + 16, R.y + R.h - 18, 9.5, compiled ? 'rgba(241,213,138,0.72)' : 'rgba(150,190,196,0.45)', 500);
  mono(ctx, 'seed 770 · 4739 km', R.x + R.w - 16, R.y + R.h - 18, 9.5, 'rgba(150,190,196,0.38)', 500, 'right');
  // framing ticks, the quiet SVG grid of the preview
  ctx.strokeStyle = 'rgba(180,220,225,0.10)';
  ctx.lineWidth = 1;
  const m = 12;
  for (const [cx, cy, dx, dy] of [
    [R.x + m, R.y + m, 1, 1], [R.x + R.w - m, R.y + m, -1, 1],
    [R.x + m, R.y + R.h - m, 1, -1], [R.x + R.w - m, R.y + R.h - m, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * 14, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * 14);
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------- quote */
function drawQuote(ctx, u, R) {
  const p = smoothstep(2.26, 2.62, u);
  if (p <= 0.001) return;
  const qx = 1112, qy = 500;
  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(0, (1 - easeOut(p)) * 22);
  // scrim so the words win against the star river: a soft oval, no edges
  const scrim = ctx.createRadialGradient(qx + 208, qy + 12, 24, qx + 208, qy + 12, 330);
  scrim.addColorStop(0, 'rgba(3,11,13,0.56)');
  scrim.addColorStop(0.46, 'rgba(3,11,13,0.34)');
  scrim.addColorStop(0.76, 'rgba(3,11,13,0.11)');
  scrim.addColorStop(1, 'rgba(3,11,13,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(qx - 200, qy - 300, 860, 600);
  // gold rule
  ctx.fillStyle = 'rgba(241,213,138,0.85)';
  ctx.fillRect(qx, qy - 68, 42, 2);
  KIT.drawText(ctx, 'THE DU FU TEST · 2026', qx + 54, qy - 66, {
    size: 11, font: KIT.FONT.mono, weight: 600, color: 'rgba(241,213,138,0.75)', letterSpacing: 2.4,
  });
  KIT.drawText(ctx, QUOTE[0], qx + 1.2, qy - 16.8, {
    size: 46, font: SERIF, weight: 500, color: 'rgba(0,0,0,0.45)', letterSpacing: 2,
  });
  KIT.drawText(ctx, QUOTE[1], qx + 1.2, qy + 41.2, {
    size: 46, font: SERIF, weight: 500, color: 'rgba(0,0,0,0.45)', letterSpacing: 2,
  });
  KIT.drawText(ctx, QUOTE[0], qx, qy - 18, {
    size: 46, font: SERIF, weight: 500, color: '#f6ecd2', letterSpacing: 2,
  });
  KIT.drawText(ctx, QUOTE[1], qx, qy + 40, {
    size: 46, font: SERIF, weight: 500, color: '#f6ecd2', letterSpacing: 2,
  });
  // a quiet vermilion seal, the film's signature, at the end of the line
  ctx.save();
  ctx.globalAlpha = p * 0.9;
  ctx.translate(qx + 496, qy + 40);
  ctx.rotate(0.04);
  ctx.strokeStyle = 'rgba(200,64,48,0.85)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-19, -19, 38, 38);
  ctx.fillStyle = 'rgba(214,72,54,0.92)';
  ctx.font = `700 23px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('杜', 0, 1);
  ctx.restore();
  ctx.restore();
  if (p > 0.2) {
    markText('s18-quote', `${QUOTE[0]}\n${QUOTE[1]}`, qx - 8, qy - 48, 500, 104, { size: 46 });
  }
  void R;
}

/* ------------------------------------------------------------------ screen */
function drawBackdrop(ctx, u) {
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, '#070a0e');
  g.addColorStop(0.45, '#080d13');
  g.addColorStop(1, '#05080b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // a wide, dim field of syntax glyphs behind the tools
  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.fillStyle = '#9fc6e0';
  ctx.font = `500 12px ${MONO}`;
  const rows = ['{ }', '=>', '</>', '[ ]', '1455', '杜', 'shader', '0'];
  for (let i = 0; i < 26; i++) {
    const x = 40 + ((i * 271) % 1840);
    const y = 60 + ((i * 143) % 980);
    ctx.fillText(rows[i % rows.length], x, y);
  }
  ctx.restore();
  // glow behind the preview
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const gl = ctx.createRadialGradient(1500, 520, 40, 1500, 520, 720);
  gl.addColorStop(0, 'rgba(241,213,138,0.055)');
  gl.addColorStop(0.5, 'rgba(90,160,170,0.035)');
  gl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // hairline grid
  ctx.save();
  ctx.strokeStyle = 'rgba(120,160,190,0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
  void u;
}

function drawCompileToast(ctx, u, R) {
  if (u < 2.06) return;
  const a = smoothstep(2.06, 2.2, u) * (1 - smoothstep(3.4, 3.8, u));
  if (a <= 0.01) return;
  const x = R.x + R.w - 260, y = R.y + R.h - 74;
  ctx.save();
  ctx.globalAlpha = a;
  roundRectPath(ctx, x, y, 244, 44, 7);
  ctx.fillStyle = 'rgba(6,20,18,0.92)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(123,220,154,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(123,220,154,0.16)';
  ctx.fillRect(x, y, 3, 44);
  mono(ctx, '✓ 0 errors', x + 16, y + 16, 11, '#8fe0ad', 700);
  mono(ctx, 'compiled in 12 ms', x + 16, y + 31, 9.5, 'rgba(170,210,195,0.6)');
  mono(ctx, '1,455 stars', x + 228, y + 22, 10, 'rgba(241,213,138,0.8)', 600, 'right');
  ctx.restore();
  void u;
}

export function renderAt(ctx, u, beat, env = {}) {
  const D = build();
  const R = previewRect(u);
  const grow = R.grow;
  drawBackdrop(ctx, u);
  // editor: dims to 20% while the preview takes the frame
  const editorAlpha = 1 - 0.8 * smoothstep(4.15, 4.9, u);
  const collapse = smoothstep(5.1, 5.46, u);
  drawEditor(ctx, u, editorAlpha, collapse);
  // preview grows over the editor
  drawPreview(ctx, u, R);
  // the quote is pinned in screen space, outside the camera push
  drawQuote(ctx, u, R);
  // compile toast
  drawCompileToast(ctx, u, R);
  // global film grain + a soft vignette, matching the rest of the film
  const v = ctx.createRadialGradient(960, 500, 300, 960, 540, 1180);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.7, 'rgba(2,8,11,0.12)');
  v.addColorStop(1, 'rgba(1,5,7,0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const grain = KIT.layer('scene18:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 1818, { amp: 0.09 }));
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.10;
  ctx.drawImage(grain, 0, 0, W, H);
  ctx.restore();
  // mark the exact required code line while the panel is legible
  if (editorAlpha > 0.55 && collapse < 0.2) {
    markText('s18-code', CODE[5], 166, CODE_TOP + 5 * LINE_H - 12, 820, LINE_H - 2, { size: FONT_CODE });
    // probe: integer leading + integer glyph origins are what keep the green
    // number tokens (4739 / 1455) from rasterising a second, blurrier copy
    KIT.debug.markBox('s18-code-metrics', 166, CODE_TOP + 5 * LINE_H - 12, 820, LINE_H - 2, {
      role: 'code-metrics',
      lineH: LINE_H,
      integerLeading: Number.isInteger(LINE_H) ? 1 : 0,
      originY: Math.round(CODE_TOP + 5 * LINE_H),
      integerOrigin: Number.isInteger(CODE_TOP + 5 * LINE_H) ? 1 : 0,
    });
  }
  void D; void grow; void beat; void env;
}

export default { renderAt };
