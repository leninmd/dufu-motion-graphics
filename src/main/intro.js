/**
 * intro.js — 00:00 – 00:06
 * A frontispiece from a (fictional) Tang stress-test report: Xuan paper, a
 * geometric stress diagram, three typographic hammer blows, then a vermilion
 * seal that cracks open and lets the traveller walk into the first era.
 */
import KIT from '../kit/index.js';
import { clamp, clamp01, lerp, smoothstep, smootherstep, easeOut, easeOutCubic, easeInOutCubic, spring } from '../kit/math.js';
import { rgba, linear, radial, drawLayer, withClip } from '../kit/canvas.js';
import { roughRect } from '../kit/ink-engine.js';
import { markText } from '../kit/debug.js';
import { FONT } from '../kit/type.js';

const W = 1920, H = 1080;
const INK = '#221c13';
const PAPER = '#f1e6cf';
const RED = '#a62a22';

function arrowHead(ctx, x, y, ang, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.34);
  ctx.lineTo(-size * 0.78, 0);
  ctx.lineTo(-size, size * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function dimension(ctx, x0, y0, x1, y1, label, opts = {}) {
  const color = opts.color || RED;
  const alpha = opts.alpha ?? 0.8;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash(opts.dash || [4, 6]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.setLineDash([]);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  arrowHead(ctx, x1, y1, ang, 9, color);
  arrowHead(ctx, x0, y0, ang + Math.PI, 9, color);
  if (label) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    ctx.translate(mx, my);
    ctx.rotate(opts.rotate ?? -Math.PI / 2);
    ctx.font = `500 ${opts.size || 13}px ${FONT.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = opts.paper || PAPER;
    ctx.fillRect(-tw / 2 - 4, -9, tw + 8, 18);
    ctx.fillStyle = color;
    ctx.fillText(label, 0, 0);
  }
  ctx.restore();
}

function callout(ctx, x, y, tx, ty, label, sub, opts = {}) {
  const color = opts.color || 'rgba(37,29,19,0.78)';
  const alpha = opts.alpha ?? 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = opts.line || 'rgba(43,32,20,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 2.2, 0, KIT.TAU); ctx.fill();
  ctx.font = `600 ${opts.size || 15}px ${FONT.serif}`;
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(label, tx + (opts.align === 'right' ? -8 : 8), ty);
  if (sub) {
    ctx.font = `500 ${opts.subSize || 10}px ${FONT.mono}`;
    ctx.fillStyle = 'rgba(70,52,30,0.55)';
    ctx.fillText(sub, tx + (opts.align === 'right' ? -8 : 8), ty + 17);
  }
  ctx.restore();
}

export function drawDiagram(ctx, u) {
  const x0 = 68, y0 = 170, w = 602, h = 770;
  ctx.save();
  ctx.strokeStyle = 'rgba(50,38,24,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w, h);
  // printed plate furniture
  ctx.fillStyle = 'rgba(240,230,210,0.36)';
  ctx.fillRect(x0 + 1, y0 + 1, w - 1, 44);
  ctx.fillStyle = INK;
  ctx.font = `600 17px ${FONT.serif}`;
  ctx.textAlign = 'left';
  ctx.fillText('图一　少陵野老受力分析图', x0 + 18, y0 + 28);
  ctx.font = `500 9.5px ${FONT.mono}`;
  ctx.fillStyle = 'rgba(60,44,26,0.6)';
  ctx.textAlign = 'right';
  ctx.fillText('PLATE I · STRESS DIAGRAM (DALI 770 RUBBING)', x0 + w - 16, y0 + 27);
  ctx.strokeStyle = 'rgba(43,31,18,0.28)';
  ctx.beginPath(); ctx.moveTo(x0, y0 + 45); ctx.lineTo(x0 + w, y0 + 45); ctx.stroke();

  // faint construction field
  ctx.strokeStyle = 'rgba(72,55,34,0.08)';
  for (let gx = x0 + 40; gx < x0 + w; gx += 34) {
    ctx.beginPath(); ctx.moveTo(gx, y0 + 50); ctx.lineTo(gx, y0 + h - 10); ctx.stroke();
  }
  for (let gy = y0 + 90; gy < y0 + h; gy += 34) {
    ctx.beginPath(); ctx.moveTo(x0 + 8, gy); ctx.lineTo(x0 + w - 8, gy); ctx.stroke();
  }

  const P = KIT.rig.pose({ t: 1.1, phase: 0.8, wind: 0.23, look: 0.1, staff: true, lean: -0.02 });
  const pos = KIT.rig.placed(P, { x: x0 + 300, y: y0 + 665, scale: 1.22, rot: 0 });
  // geometric construction circles
  ctx.strokeStyle = 'rgba(147,43,34,0.18)';
  ctx.setLineDash([3, 7]);
  ctx.beginPath(); ctx.arc(pos.head.c[0], pos.head.c[1], 84, 0, KIT.TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(pos.bodyC[0], pos.bodyC[1], 150, 0, KIT.TAU); ctx.stroke();
  ctx.setLineDash([]);
  // the figure as an engineering wire drawing
  KIT.rig.drawWire(ctx, pos, { color: 'rgba(31,25,17,0.92)', width: 1.25, alpha: 0.92 });
  // cross-section hatching at torso
  ctx.save();
  ctx.translate(x0 + 300, y0 + 490);
  ctx.strokeStyle = 'rgba(155,52,41,0.36)';
  ctx.lineWidth = 1;
  for (let i = -20; i <= 20; i += 5) {
    ctx.beginPath(); ctx.moveTo(i - 14, 38); ctx.lineTo(i + 14, -38); ctx.stroke();
  }
  ctx.restore();

  // load arrows / dimensions
  dimension(ctx, x0 + 528, y0 + 150, x0 + 528, y0 + 640, 'H = 7.4 尺', { alpha: 0.62 });
  dimension(ctx, x0 + 178, y0 + 700, x0 + 468, y0 + 700, 'B = 2.1 尺', { rotate: 0, alpha: 0.58, dash: [3, 5] });
  const loadA = smoothstep(0.2, 1.1, u);
  ctx.save();
  ctx.globalAlpha = loadA;
  ctx.strokeStyle = 'rgba(164,39,31,0.88)';
  ctx.fillStyle = 'rgba(164,39,31,0.88)';
  ctx.lineWidth = 2;
  const lx = x0 + 303, ly = y0 + 197;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 145 + Math.sin(u * 8) * 4); ctx.stroke();
  arrowHead(ctx, lx, ly + 155, Math.PI / 2, 11, 'rgba(164,39,31,0.88)');
  ctx.font = `700 15px ${FONT.mono}`;
  ctx.textAlign = 'center';
  ctx.fillText('P(t) = 时代的灰尘 · g', lx, ly - 12);
  ctx.font = `500 10px ${FONT.mono}`;
  ctx.fillStyle = 'rgba(100,53,37,0.7)';
  ctx.fillText('LOAD CASE: AN LUSHAN + 10 YRS + 1 CIVIL WAR', lx, ly - 32);
  ctx.restore();

  callout(ctx, x0 + 468, y0 + 380, x0 + 548, y0 + 335, '诗卷自重', 'SCROLL PACK · 12.7 JIN', { align: 'left', size: 13, subSize: 8.5 });
  callout(ctx, x0 + 212, y0 + 260, x0 + 48, y0 + 222, '理想主义截面', 'IDEALIST CROSS-SECTION A—A', { size: 13, subSize: 8.5 });
  callout(ctx, x0 + 410, y0 + 586, x0 + 558, y0 + 596, '杖端支点', 'STAFF REACTION R=mg', { align: 'left', size: 13, subSize: 8.5 });

  // small stress curve
  ctx.save();
  ctx.translate(x0 + 376, y0 + 88);
  ctx.strokeStyle = 'rgba(47,35,21,0.45)';
  ctx.strokeRect(0, 0, 194, 78);
  ctx.font = `500 8px ${FONT.mono}`;
  ctx.fillStyle = 'rgba(52,38,22,0.58)';
  ctx.textAlign = 'left';
  ctx.fillText('σ(t) / COMPRESSIVE STRESS', 8, 13);
  ctx.strokeStyle = 'rgba(150,40,32,0.75)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const p = i / 120;
    const y = 58 - Math.pow(p, 2.2) * 34 - Math.sin(p * 24) * 4;
    if (i === 0) ctx.moveTo(8 + p * 178, y); else ctx.lineTo(8 + p * 178, y);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(50,38,23,0.2)';
  ctx.setLineDash([2, 3]);
  ctx.beginPath(); ctx.moveTo(8, 24); ctx.lineTo(186, 24); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // plate caption
  ctx.fillStyle = 'rgba(43,32,19,0.64)';
  ctx.font = `500 12px ${FONT.serif}`;
  ctx.textAlign = 'center';
  ctx.fillText('图一　少陵野老受力分析图（大历五年拓本）', x0 + w / 2, y0 + h - 24);
  ctx.font = `500 9px ${FONT.mono}`;
  ctx.fillStyle = 'rgba(60,43,24,0.45)';
  ctx.fillText('FIG. 1 — LOAD ANALYSIS OF THE POET DU FU · FICTIONAL ARCHIVE', x0 + w / 2, y0 + h - 8);
  ctx.restore();
}

export function drawSealImpact(ctx, u) {
  if (u < 4.0) return;
  const p = clamp01((u - 4.0) / 0.5);
  const impact = 1 - Math.abs(u - 4.0) / 0.2;
  const cx = 1180, cy = 545;
  ctx.save();
  // shock ring, ink dust
  const ringP = clamp01((u - 4.0) / 0.52);
  if (ringP > 0 && ringP < 1) {
    ctx.strokeStyle = `rgba(165,42,34,${0.38 * (1 - ringP)})`;
    ctx.lineWidth = 3 * (1 - ringP) + 0.5;
    ctx.beginPath(); ctx.arc(cx, cy, 90 + ringP * 460, 0, KIT.TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(38,28,18,${0.2 * (1 - ringP)})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 100 + ringP * 310, 0, KIT.TAU); ctx.stroke();
  }
  if (u < 4.25) {
    KIT.ink.inkSplatter(ctx, cx + 240, cy + 80, { n: 48, radius: 330, seed: 77, color: '#241b11', alpha: 0.55, pow: 2.4 });
    KIT.ink.inkSplatter(ctx, cx - 260, cy - 50, { n: 22, radius: 160, seed: 78, color: '#a62a22', alpha: 0.35, pow: 2.1 });
  }
  // the seal drops in a step, overshoots, and settles
  const sc = u < 4.04 ? 1.38 : 1 + 0.15 * spring((u - 4.04) * 3.0, { zeta: 0.42, freq: 2.2 });
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);
  ctx.rotate(-0.015);
  ctx.translate(-cx, -cy);
  ctx.save();
  ctx.globalAlpha = smoothstep(4.0, 4.04, u);
  // craggy vermilion block
  ctx.fillStyle = RED;
  roughRect(ctx, cx - 322, cy - 105, 644, 210, { seed: 704, jitter: 2.6, steps: 18 });
  ctx.fill();
  ctx.strokeStyle = 'rgba(248,229,195,0.9)';
  ctx.lineWidth = 4;
  roughRect(ctx, cx - 302, cy - 87, 604, 174, { seed: 705, jitter: 1.6, steps: 14 });
  ctx.stroke();
  KIT.drawText(ctx, '[ 杜甫 · 712—770 ]', cx, cy - 2, {
    size: 70, font: FONT.display, weight: 900, color: '#f3e5ca', align: 'center',
    letterSpacing: 4, mark: 'intro-seal', shadow: { color: 'rgba(64,16,10,0.4)', blur: 2, x: 1, y: 3 },
  });
  ctx.font = `500 11px ${FONT.mono}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(250,235,209,0.66)';
  ctx.fillText('TANG DYNASTY · STRESS TEST SUBJECT No. 001', cx, cy + 61);
  ctx.restore();
  // cracks running down and out of the seal
  const crack = smoothstep(4.02, 4.5, u);
  ctx.strokeStyle = `rgba(32,24,15,${0.7 * crack})`;
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.moveTo(cx - 210, cy + 102);
  const crackPts = [[-186, 128], [-168, 178], [-146, 206], [-152, 268], [-118, 310], [-104, 380], [-71, 424], [-77, 493], [-58, 528]];
  for (const [dx, dy] of crackPts) ctx.lineTo(cx + dx * (0.2 + 0.8 * crack), cy + dy * (0.2 + 0.8 * crack));
  ctx.stroke();
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(cx + 190, cy + 101);
  ctx.lineTo(cx + 213, cy + 158); ctx.lineTo(cx + 185, cy + 194); ctx.lineTo(cx + 201, cy + 255);
  ctx.stroke();
  ctx.restore();
  void p; void impact;
}

export function drawGateAndTraveller(ctx, u) {
  if (u < 4.32) return;
  const appear = smoothstep(4.32, 4.7, u);
  const walkP = smoothstep(4.5, 5.95, u);
  const x = lerp(1110, 1738, easeInOutCubic(walkP));
  const groundY = 1000;
  const scale = lerp(0.78, 0.92, smoothstep(4.4, 5.2, u));
  const phase = (u - 4.3) * Math.PI * 2;
  const P = KIT.rig.pose({ t: u, phase, wind: 0.25, look: 1, staff: true, lean: 0.03 });
  const pos = KIT.rig.placed(P, { x, y: groundY, scale, rot: 0 });
  // soft ink shadow
  ctx.save();
  ctx.globalAlpha = appear * 0.22;
  ctx.fillStyle = '#241c12';
  ctx.beginPath();
  ctx.ellipse(x, groundY + 2, 65 * scale, 9 * scale, 0, 0, KIT.TAU);
  ctx.fill();
  ctx.restore();
  // paint the figure with a free hand: black silhouette, white collar, red sash
  ctx.save();
  ctx.globalAlpha = appear;
  // A clean ink silhouette: no scroll ribbons or sash tendrils that would read
  // as extra limbs at this small scale.
  const silhouette = {
    ...pos,
    parts: pos.parts.filter((p) => ['body', 'sleeve-near', 'sleeve-far', 'skin', 'cap', 'leg-near', 'leg-far', 'beard', 'hair', 'staff'].includes(p.role)),
  };
  KIT.rig.drawSilhouette(ctx, silhouette, { color: 'rgba(30,23,15,0.96)' });
  ctx.strokeStyle = 'rgba(232,218,191,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(pos.robe[0][0], pos.robe[0][1]);
  for (let i = 1; i < pos.robe.length; i += 2) ctx.lineTo(pos.robe[i][0], pos.robe[i][1]);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(166,42,34,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pos.sash[0][0], pos.sash[0][1]);
  for (let i = 1; i < pos.sash.length; i++) ctx.lineTo(pos.sash[i][0], pos.sash[i][1]);
  ctx.stroke();
  ctx.restore();

  // a gate at the right edge, cropped by the frame: first crossing
  const gateX = 1725, gateY = 145, gateW = 186, gateH = 790;
  const gateP = smoothstep(5.05, 5.35, u);
  if (gateP > 0) {
    ctx.save();
    ctx.globalAlpha = gateP;
    // the next era's dark stone shows in the gate
    const inside = ctx.createLinearGradient(gateX, 0, gateX + gateW, 0);
    inside.addColorStop(0, '#201b14');
    inside.addColorStop(0.3, '#15120e');
    inside.addColorStop(1, '#0c0b09');
    ctx.fillStyle = inside;
    ctx.fillRect(gateX, gateY, gateW, gateH);
    // rubbing-like fragments of the next world: a horse, a wheel, a broken seal
    ctx.strokeStyle = 'rgba(225,213,190,0.56)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(gateX + 19, gateY + 565); ctx.lineTo(gateX + 95, gateY + 520); ctx.lineTo(gateX + 162, gateY + 582); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gateX + 24, gateY + 620); ctx.lineTo(gateX + 90, gateY + 650); ctx.lineTo(gateX + 156, gateY + 600); ctx.stroke();
    ctx.beginPath(); ctx.arc(gateX + 115, gateY + 690, 23, 0, KIT.TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * KIT.TAU;
      ctx.beginPath();
      ctx.moveTo(gateX + 115 + Math.cos(a) * 25, gateY + 690 + Math.sin(a) * 25);
      ctx.lineTo(gateX + 115 + Math.cos(a) * 43, gateY + 690 + Math.sin(a) * 43);
      ctx.stroke();
    }
    KIT.drawText(ctx, '石', gateX + 74, gateY + 705, { size: 18, font: FONT.display, weight: 700, color: 'rgba(226,215,191,0.22)', align: 'center' });
    // a bright stone lintel and left jamb make this read as a doorway, not a black cut
    ctx.fillStyle = '#29231a';
    ctx.fillRect(gateX - 14, gateY - 10, gateW + 14, 16);
    ctx.fillRect(gateX - 14, gateY + gateH - 6, gateW + 14, 16);
    ctx.fillRect(gateX - 14, gateY - 10, 16, gateH + 20);
    ctx.strokeStyle = 'rgba(210,177,111,0.72)';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(gateX - 13, gateY + gateH); ctx.lineTo(gateX - 13, gateY); ctx.lineTo(gateX + gateW + 2, gateY); ctx.stroke();
    ctx.strokeStyle = 'rgba(165,42,34,0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(gateX - 5, gateY + gateH); ctx.lineTo(gateX - 5, gateY + 5); ctx.stroke();
    // warm spill from the next world
    const spill = ctx.createLinearGradient(gateX - 30, 0, gateX + 100, 0);
    spill.addColorStop(0, 'rgba(212,175,55,0)');
    spill.addColorStop(0.5, 'rgba(212,175,55,0.10)');
    spill.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.fillStyle = spill;
    ctx.fillRect(gateX - 30, gateY, 140, gateH);
    KIT.frames.drawPortal(ctx, gateX, gateY, gateW, gateH, { style: 'stone', accent: '#b8342a', alpha: 0.42, seed: 711, t: u });
    // etched jamb label, a small print-shop flourish
    ctx.save();
    ctx.translate(gateX + 12, gateY + 88);
    ctx.rotate(Math.PI / 2);
    KIT.drawText(ctx, '第 一 道 畫 框', 0, 0, {
      size: 9.5, font: FONT.mono, weight: 500, color: 'rgba(238,224,194,0.72)', letterSpacing: 3.2,
    });
    ctx.restore();
    ctx.restore();
    // dust kicked up
    KIT.ink.inkSplatter(ctx, gateX + 10, 960, { n: 18, radius: 95, seed: 99, color: '#3d2d1c', alpha: 0.25, pow: 2 });
  }
}

export function drawIntroText(ctx, u) {
  // ---------- bar 1: black slab, paper-coloured Song type
  const p1 = smoothstep(0.0, 0.32, u);
  const fade1 = 1 - 0.86 * smoothstep(3.88, 4.12, u);
  if (p1 > 0.001) {
    const slide = (1 - easeOutCubic(p1)) * -82;
    ctx.save();
    ctx.globalAlpha = 0.96 * fade1;
    ctx.translate(slide, 0);
    ctx.fillStyle = '#1d1811';
    roughRect(ctx, 690, 288, 1128, 194, { seed: 701, jitter: 2.4, steps: 18 });
    ctx.fill();
    // print bite marks and ink pooling
    ctx.fillStyle = 'rgba(237,226,204,0.07)';
    for (let i = 0; i < 110; i++) {
      const rx = 700 + KIT.unit(701, i, 1) * 1100;
      const ry = 296 + KIT.unit(701, i, 2) * 178;
      ctx.fillRect(rx, ry, 1 + KIT.unit(701, i, 3) * 4, 1);
    }
    withClip(ctx, 700, 296, 1104, 178, () => {
      const line = '人类自古以来就试图测试：一个理想主义者';
      const line2 = '能承受多少吨时代的灰尘。';
      KIT.drawText(ctx, line, 760, 350, { size: 45, font: FONT.display, weight: 800, color: '#efe3ca', letterSpacing: 1.5, mark: 'intro-line-1' });
      KIT.drawText(ctx, line2, 760, 420, { size: 45, font: FONT.display, weight: 800, color: '#efe3ca', letterSpacing: 1.5, mark: 'intro-line-1b' });
      KIT.drawText(ctx, '01 /  HUMANITY HAS ALWAYS TESTED THE LOAD-BEARING CAPACITY OF AN IDEALIST.', 760, 465, { size: 9.4, font: FONT.mono, color: 'rgba(239,227,202,0.52)', letterSpacing: 1.25 });
    });
    ctx.restore();
  }

  // ---------- bar 2: line + attribution
  const p2 = smoothstep(2.0, 2.28, u);
  const fade2 = 1 - 0.78 * smoothstep(3.9, 4.18, u);
  if (p2 > 0.001) {
    const a = p2 * fade2;
    ctx.save();
    ctx.globalAlpha = a;
    // red bar grows on the downbeat
    ctx.fillStyle = RED;
    ctx.fillRect(736, 578, 6, 84 * easeOut(p2));
    KIT.drawText(ctx, '——早在『精神内耗』这个词', 764, 600, {
      size: 35, font: FONT.display, weight: 700, color: '#251e14', letterSpacing: 2, mark: 'intro-line-2',
    });
    KIT.drawText(ctx, '被发明之前的一千二百年。', 764, 652, {
      size: 35, font: FONT.display, weight: 700, color: '#251e14', letterSpacing: 2,
    });
    KIT.drawText(ctx, '——《大唐诗史压力测试报告》，卷一（虚构书名）', 766, 724, {
      size: 15, font: FONT.serif, weight: 500, color: 'rgba(56,43,27,0.66)', letterSpacing: 1.1, mark: 'intro-source',
    });
    ctx.restore();
  }

  // ---------- top masthead
  ctx.save();
  ctx.fillStyle = RED;
  ctx.fillRect(70, 58, 10, 10);
  KIT.drawText(ctx, '大唐詩史壓力測試報告', 94, 63, { size: 19, font: FONT.display, weight: 700, color: 'rgba(38,29,18,0.88)', letterSpacing: 3 });
  KIT.drawText(ctx, 'TANG POETRY STRESS-TEST REPORT · VOL. I', 94, 85, { size: 9, font: FONT.mono, weight: 500, color: 'rgba(64,48,29,0.48)', letterSpacing: 1.3 });
  KIT.drawText(ctx, '檔案 No. 少陵—770　/　機密', 1454, 64, { size: 11, font: FONT.serif, weight: 500, color: 'rgba(51,38,23,0.65)', align: 'right', letterSpacing: 1.2 });
  KIT.drawText(ctx, 'FACSIMILE · NOT FOR CIRCULATION', 1454, 84, { size: 8.5, font: FONT.mono, color: 'rgba(70,52,32,0.4)', align: 'right', letterSpacing: 1 });
  ctx.strokeStyle = 'rgba(52,38,23,0.42)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(70, 108); ctx.lineTo(1850, 108); ctx.stroke();
  ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(70, 113); ctx.lineTo(1850, 113); ctx.stroke();
  // vertical edition label at far right
  ctx.save();
  ctx.translate(1872, 232);
  ctx.font = `500 12px ${FONT.serif}`;
  ctx.fillStyle = 'rgba(61,45,26,0.44)';
  ctx.textAlign = 'center';
  const chars = [...'少陵野老詩史卷一'];
  for (let i = 0; i < chars.length; i++) ctx.fillText(chars[i], 0, i * 22);
  ctx.restore();
  ctx.restore();
}

export function renderIntro(ctx, t, env = {}) {
  const W = 1920, H = 1080;
  const u = clamp(t, 0, 6);
  // paper ground
  const paper = KIT.paper.ricePaper(W, H, { seed: 712, tone: '#efe4cc', fibers: 2100, stains: 14, deckle: 1, edgeBurn: 0.2 });
  ctx.drawImage(paper, 0, 0);
  // warm top light
  const light = ctx.createRadialGradient(W * 0.42, H * 0.16, 80, W * 0.46, H * 0.28, W * 0.7);
  light.addColorStop(0, 'rgba(255,247,224,0.32)');
  light.addColorStop(1, 'rgba(255,247,224,0)');
  ctx.fillStyle = light; ctx.fillRect(0, 0, W, H);

  // red rules and a folio, deliberate print apparatus
  ctx.strokeStyle = 'rgba(151,52,41,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(70, 936); ctx.lineTo(1850, 936); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(660, 170); ctx.lineTo(660, 936); ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.5;
  KIT.drawText(ctx, '— 序 —', 1880, 930, { size: 12, font: FONT.serif, color: 'rgba(67,48,28,0.7)', align: 'right', letterSpacing: 4 });
  ctx.restore();

  drawDiagram(ctx, u);
  drawIntroText(ctx, u);
  drawSealImpact(ctx, u);
  drawGateAndTraveller(ctx, u);

  // final dust / camera breath
  KIT.particles.floatMotes(ctx, t, { n: 34, seed: 712, color: 'rgba(53,38,22,0.4)', alpha: 0.35, w: W, h: H });
  // edge vignette and a very light grain
  ctx.save();
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, W * 0.72);
  v.addColorStop(0, 'rgba(38,25,12,0)');
  v.addColorStop(1, 'rgba(38,25,12,0.22)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  KIT.frames.registrationMarks(ctx, 40, 40, W - 80, H - 80, { color: 'rgba(77,55,30,0.2)', len: 16, inset: 0 });

  markText('intro-caption', '人类自古以来就试图测试：一个理想主义者能承受多少吨时代的灰尘。', 700, 300, 1100, 180, { size: 45 });
  if (u >= 4.0) {
    KIT.debug.markEraCard(null);
  }
  void env;
}

