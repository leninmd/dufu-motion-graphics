/**
 * hud.js — the two fixed pieces of film furniture:
 *   · a period-correct era label at top-left
 *   · a strictly monotone travel odometer at top-right
 * Both are drawn after the scene, so they survive every transition and every
 * medium. Their styles change with the era; their position never does.
 */
import {
  clamp, clamp01, lerp, smoothstep, easeOut, hash, TAU, mulberry32,
} from './math.js';
import { drawText, measure, FONT } from './type.js';
import { rgba, linear, radial, makeCanvas, layer, drawLayer, roundedBox } from './canvas.js';
import { roughRect, sealStamp } from './ink-engine.js';
import { markEraCard, markHud } from './debug.js';
import { formatKm, MAX_KM } from '../beat/clock.js';

const CARD = Object.freeze({ x: 50, y: 38, w: 486, h: 126 });
const HUD = Object.freeze({ right: 1870, y: 48, w: 330, h: 112 });

const LIGHT_STYLES = new Set(['baimiao', 'ledger', 'minimal', 'monument', 'rubbing', 'shadow']);
const styleInk = (style) => LIGHT_STYLES.has(style) ? '#1b1711' : '#f4edd9';
const stylePaper = (style) => LIGHT_STYLES.has(style) ? 'rgba(244,236,217,0.94)' : 'rgba(12,12,11,0.74)';
const styleAccent = (style, meta) => meta.accent || ({
  rubbing: '#a52a22', baimiao: '#a52a22', pointcloud: '#8ec6bd', gold: '#d4af37',
  ledger: '#9d3024', construct: '#df382b', woodcut: '#b52a22', pbr: '#d8aa4f',
  shadow: '#d7973b', bullet: '#c53227', monument: '#3c3529', minimal: '#a52a22',
  crt: '#00ff66', black: '#f1e7d2', pixel: '#f4d03f', y2k: '#103e79',
  shorts: '#ff2b4d', code: '#7ec8ff',
}[style] || '#d4af37');

function panel(ctx, x, y, w, h, { fill, stroke, radius = 2, alpha = 1, shadow = true }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, radius) : ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function phase(u) {
  return { a: smoothstep(0.02, 0.3, u), slide: (1 - smoothstep(0, 0.38, u)) * 20 };
}

/* --------------------------------------------------------------- era card */
export function drawEraCard(ctx, meta, u, opts = {}) {
  if (!meta) return;
  const style = meta.style || 'black';
  const accent = styleAccent(style, meta);
  const ink = styleInk(style);
  const { a, slide } = phase(u);
  const x = CARD.x, y = CARD.y + (opts.offsetY || 0);
  const w = CARD.w, h = CARD.h;
  const r = mulberry32(hash('eracard', meta.index, style));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(-slide, 0);

  if (style === 'rubbing') {
    // a torn paper rubbing glued onto the stone
    const paper = '#e3d6bd';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.006);
    ctx.fillStyle = 'rgba(233,222,197,0.94)';
    roughRect(ctx, 0, 0, w, h, { seed: 121 + meta.index, jitter: 2.2, steps: 12 });
    ctx.fill();
    ctx.strokeStyle = 'rgba(42,32,22,0.55)'; ctx.lineWidth = 1.3;
    roughRect(ctx, 9, 9, w - 18, h - 18, { seed: 122, jitter: 1.4, steps: 8 }); ctx.stroke();
    ctx.restore();
    drawText(ctx, meta.no, x + 24, y + 66, { size: 48, font: FONT.display, weight: 900, color: '#241d14', align: 'left', letterSpacing: -3 });
    drawText(ctx, meta.zh, x + 92, y + 45, { size: 31, font: FONT.display, weight: 800, color: '#221b12', letterSpacing: 2, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 93, y + 78, { size: 11.5, font: FONT.mono, weight: 600, color: 'rgba(42,32,20,0.72)', letterSpacing: 1.45, maxWidth: w - 120 });
    drawText(ctx, meta.year, x + 24, y + 108, { size: 13, font: FONT.serif, weight: 500, color: 'rgba(42,32,20,0.8)', letterSpacing: 1 });
    drawText(ctx, 'RUBBING PLATE · 原石拓本', x + w - 23, y + 108, { size: 9.5, font: FONT.mono, weight: 500, color: 'rgba(85,44,31,0.65)', align: 'right', letterSpacing: 1.2 });
    ctx.save();
    ctx.translate(x + w - 45, y + 56);
    sealStamp(ctx, -17, -17, 34, String(meta.index + 1), { seed: 61 + meta.index, font: FONT.display, border: true, inset: 4 });
    ctx.restore();
  } else if (style === 'baimiao') {
    ctx.fillStyle = 'rgba(249,246,236,0.82)';
    ctx.fillRect(x, y + h - 1, w, 1.2);
    ctx.strokeStyle = 'rgba(30,25,17,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x + 70, y + 14); ctx.stroke();
    drawText(ctx, meta.no, x + 4, y + 55, { size: 35, font: FONT.serif, weight: 400, color: accent, letterSpacing: 2 });
    drawText(ctx, meta.zh, x + 74, y + 47, { size: 34, font: FONT.display, weight: 600, color: '#1c1812', letterSpacing: 5, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 76, y + 80, { size: 10.5, font: FONT.mono, weight: 500, color: 'rgba(38,32,22,0.64)', letterSpacing: 1.75, maxWidth: w - 90 });
    drawText(ctx, `${meta.year}　·　WU DAOZI LINE STUDY`, x + 76, y + 105, { size: 10.5, font: FONT.mono, weight: 500, color: 'rgba(38,32,22,0.7)', letterSpacing: 0.9 });
    ctx.strokeStyle = 'rgba(165,41,34,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + 62, y + h); ctx.stroke();
  } else if (style === 'pointcloud') {
    panel(ctx, x, y, w, h, { fill: 'rgba(10,15,13,0.72)', stroke: 'rgba(158,207,195,0.32)', radius: 0 });
    // dot-matrix index
    for (let j = 0; j < 5; j++) for (let i = 0; i < 4; i++) {
      ctx.fillStyle = `rgba(150,205,191,${0.15 + r() * 0.6})`;
      ctx.fillRect(x + 20 + i * 7, y + 20 + j * 7, 2.2, 2.2);
    }
    drawText(ctx, meta.no, x + 22, y + 74, { size: 43, font: FONT.mono, weight: 300, color: '#b8ddd0', letterSpacing: 2 });
    drawText(ctx, meta.zh, x + 92, y + 48, { size: 30, font: FONT.display, weight: 700, color: '#edf7ee', letterSpacing: 7, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 94, y + 80, { size: 10.5, font: FONT.mono, weight: 500, color: 'rgba(177,218,205,0.75)', letterSpacing: 1.35, maxWidth: w - 110 });
    drawText(ctx, `${meta.year}  /  ${meta.number === '03' ? '35,000 PTS' : '3D PROJECTION'}`, x + 24, y + 106, { size: 10, font: FONT.mono, color: 'rgba(177,218,205,0.68)', letterSpacing: 1.1 });
    drawText(ctx, 'XYZ ▸ PERSPECTIVE', x + w - 22, y + 106, { size: 9.5, font: FONT.mono, color: 'rgba(177,218,205,0.55)', align: 'right', letterSpacing: 1 });
  } else if (style === 'gold') {
    const g = linear(ctx, x, y, x + w, y + h, [[0, 'rgba(7,33,27,0.92)'], [1, 'rgba(10,18,15,0.9)']]);
    panel(ctx, x, y, w, h, { fill: g, stroke: 'rgba(212,175,55,0.65)', radius: 0 });
    ctx.strokeStyle = 'rgba(212,175,55,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
    ctx.fillStyle = 'rgba(212,175,55,0.9)';
    ctx.fillRect(x, y, 4, h);
    drawText(ctx, meta.no, x + 24, y + 62, { size: 42, font: FONT.display, weight: 700, color: '#d4af37', letterSpacing: 1 });
    drawText(ctx, meta.zh, x + 92, y + 46, { size: 31, font: FONT.display, weight: 800, color: '#f5e8c5', letterSpacing: 4, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 94, y + 78, { size: 10.5, font: FONT.mono, weight: 500, color: 'rgba(217,188,111,0.83)', letterSpacing: 1.4, maxWidth: w - 120 });
    drawText(ctx, meta.year, x + 26, y + 108, { size: 12.5, font: FONT.serif, weight: 500, color: 'rgba(235,205,127,0.85)', letterSpacing: 1.2 });
    drawText(ctx, 'JIEHUA · 泥金界画', x + w - 24, y + 108, { size: 9.5, font: FONT.mono, color: 'rgba(217,188,111,0.62)', align: 'right', letterSpacing: 0.9 });
  } else if (style === 'ledger') {
    const g = linear(ctx, x, y, x, y + h, [[0, '#ece2c9'], [1, '#ded0b2']]);
    panel(ctx, x, y, w, h, { fill: g, stroke: 'rgba(91,64,37,0.35)', radius: 1 });
    ctx.strokeStyle = 'rgba(126,35,28,0.35)'; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x, y + i * 28); ctx.lineTo(x + w, y + i * 28); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(41,30,19,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 75, y); ctx.lineTo(x + 75, y + h); ctx.stroke();
    drawText(ctx, meta.no, x + 32, y + 66, { size: 38, font: FONT.serif, weight: 600, color: '#8e2a21', letterSpacing: 2 });
    drawText(ctx, meta.zh, x + 95, y + 43, { size: 30, font: FONT.display, weight: 700, color: '#282017', letterSpacing: 3, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 96, y + 73, { size: 10.5, font: FONT.mono, weight: 500, color: 'rgba(44,33,20,0.68)', letterSpacing: 1.2, maxWidth: w - 118 });
    drawText(ctx, meta.year, x + 96, y + 103, { size: 11.5, font: FONT.serif, color: 'rgba(56,40,22,0.82)', letterSpacing: 1.5 });
    drawText(ctx, 'TONGSHENG ENTRY No.' + String(meta.index + 1).padStart(4, '0'), x + w - 20, y + 18, { size: 8.5, font: FONT.mono, color: 'rgba(84,54,28,0.55)', align: 'right', letterSpacing: 0.7 });
  } else if (style === 'construct') {
    // The title lives entirely on the vermilion plate and the index on the
    // black counter-plate, so no glyph ever lands black-on-black again.
    ctx.save();
    ctx.translate(x + 22, y + 15);
    ctx.rotate(-0.045);
    ctx.fillStyle = accent;
    ctx.fillRect(-12, -8, 318, 112);
    ctx.fillStyle = '#11100d';
    ctx.fillRect(300, -8, 186, 112);
    ctx.fillStyle = 'rgba(250,240,216,0.35)';
    ctx.fillRect(-12, -8, 318, 2);
    ctx.restore();
    drawText(ctx, meta.no, x + 300, y + 64, { size: 46, font: FONT.mono, weight: 800, color: '#f3e8cc', letterSpacing: 1, rotate: -0.045 });
    drawText(ctx, meta.zh, x + 26, y + 46, { size: 27, font: FONT.display, weight: 900, color: '#fdf6e6', letterSpacing: 2.2, mark: `era-${meta.no}`, rotate: -0.045 });
    drawText(ctx, meta.en.toUpperCase(), x + 28, y + 74, { size: 9, font: FONT.mono, weight: 700, color: 'rgba(255,248,232,0.84)', letterSpacing: 0.9, maxWidth: 268, rotate: -0.045 });
    drawText(ctx, meta.year, x + 28, y + 100, { size: 11.5, font: FONT.mono, weight: 600, color: 'rgba(255,246,228,0.9)', letterSpacing: 1, mark: 'era-year', rotate: -0.045 });
    drawText(ctx, 'СДВИГ 45°', x + 300, y + 100, { size: 9, font: FONT.mono, color: 'rgba(245,235,215,0.62)', letterSpacing: 1, rotate: -0.045 });
  } else if (style === 'woodcut') {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-0.01);
    ctx.fillStyle = 'rgba(235,225,203,0.96)';
    roughRect(ctx, 0, 0, w, h, { seed: 71 + meta.index, jitter: 3.4, steps: 14 });
    ctx.fill();
    ctx.fillStyle = 'rgba(20,17,13,0.95)';
    roughRect(ctx, 8, 8, w - 16, h - 16, { seed: 72 + meta.index, jitter: 2.2, steps: 12 });
    ctx.fill();
    // knife hatching
    ctx.save();
    roughRect(ctx, 8, 8, w - 16, h - 16, { seed: 73, jitter: 1, steps: 10 });
    ctx.clip();
    ctx.strokeStyle = 'rgba(235,225,203,0.11)'; ctx.lineWidth = 0.8;
    for (let yy = 11; yy < h; yy += 5) { ctx.beginPath(); ctx.moveTo(7, yy); ctx.lineTo(w - 7, yy + 2); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
    drawText(ctx, meta.no, x + 25, y + 63, { size: 44, font: FONT.mono, weight: 700, color: '#b72b22', letterSpacing: 2 });
    drawText(ctx, meta.zh, x + 90, y + 44, { size: 28, font: FONT.display, weight: 900, color: '#f0e4ca', letterSpacing: 2.5, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 91, y + 75, { size: 10, font: FONT.mono, weight: 500, color: 'rgba(238,225,198,0.7)', letterSpacing: 1.2, maxWidth: w - 115 });
    drawText(ctx, meta.year, x + 26, y + 108, { size: 12.5, font: FONT.serif, weight: 600, color: 'rgba(239,225,198,0.82)' });
    drawText(ctx, '刀刻 / 1 OF 1', x + w - 22, y + 108, { size: 9.5, font: FONT.mono, color: 'rgba(239,225,198,0.54)', align: 'right', letterSpacing: 1 });
  } else if (style === 'pbr') {
    const g = linear(ctx, x, y, x, y + h, [[0, 'rgba(41,34,22,0.95)'], [0.48, 'rgba(15,15,13,0.96)'], [1, 'rgba(64,47,20,0.92)']]);
    panel(ctx, x, y, w, h, { fill: g, stroke: 'rgba(208,166,75,0.55)', radius: 3 });
    const sheen = linear(ctx, x, y, x + w, y + h, [[0, 'rgba(255,230,172,0.20)'], [0.35, 'rgba(255,214,126,0.02)'], [0.52, 'rgba(255,221,140,0.14)'], [1, 'rgba(255,218,130,0.01)']]);
    ctx.fillStyle = sheen; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    drawText(ctx, meta.no, x + 23, y + 62, { size: 42, font: FONT.mono, weight: 300, color: '#d9b263', letterSpacing: 0 });
    drawText(ctx, meta.zh, x + 94, y + 45, { size: 29, font: FONT.display, weight: 600, color: '#f2e2b9', letterSpacing: 3, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 95, y + 76, { size: 10, font: FONT.mono, weight: 500, color: 'rgba(221,192,128,0.72)', letterSpacing: 1.1, maxWidth: w - 115 });
    drawText(ctx, meta.year, x + 24, y + 106, { size: 12, font: FONT.mono, color: 'rgba(217,187,126,0.8)', letterSpacing: 1.4 });
    drawText(ctx, 'Au 79 · PBR', x + w - 22, y + 106, { size: 9.5, font: FONT.mono, color: 'rgba(217,187,126,0.55)', align: 'right', letterSpacing: 1 });
  } else if (style === 'shadow') {
    const g = linear(ctx, x, y, x, y + h, [[0, 'rgba(224,177,92,0.93)'], [1, 'rgba(161,99,28,0.9)']]);
    panel(ctx, x, y, w, h, { fill: g, stroke: 'rgba(56,33,13,0.65)', radius: 0 });
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(83,43,13,${0.04 + r() * 0.12})`;
      ctx.fillRect(x + r() * w, y + r() * h, 1 + r() * 3, 1 + r() * 2);
    }
    ctx.restore();
    drawText(ctx, meta.no, x + 23, y + 63, { size: 43, font: FONT.display, weight: 700, color: '#3c210d', letterSpacing: 1 });
    drawText(ctx, meta.zh, x + 93, y + 44, { size: 29, font: FONT.display, weight: 800, color: '#321d0c', letterSpacing: 3, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 94, y + 75, { size: 10, font: FONT.mono, weight: 600, color: 'rgba(53,31,12,0.7)', letterSpacing: 1.15, maxWidth: w - 116 });
    drawText(ctx, meta.year, x + 24, y + 107, { size: 12, font: FONT.serif, weight: 600, color: 'rgba(49,29,12,0.82)' });
    drawText(ctx, '牛皮 / 10 FPS', x + w - 23, y + 107, { size: 9.5, font: FONT.mono, color: 'rgba(49,29,12,0.55)', align: 'right', letterSpacing: 1 });
  } else if (style === 'bullet') {
    panel(ctx, x, y, w, h, { fill: 'rgba(9,14,14,0.38)', stroke: 'rgba(255,240,209,0.18)', radius: 0, shadow: false });
    ctx.fillStyle = accent; ctx.fillRect(x, y, 3, h);
    drawText(ctx, meta.no, x + 22, y + 63, { size: 43, font: FONT.mono, weight: 300, color: '#f1e7d1', letterSpacing: 2 });
    drawText(ctx, meta.zh, x + 91, y + 44, { size: 29, font: FONT.display, weight: 700, color: '#f3ebd9', letterSpacing: 3, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 93, y + 75, { size: 10, font: FONT.mono, weight: 500, color: 'rgba(240,231,210,0.64)', letterSpacing: 1.1, maxWidth: w - 115 });
    drawText(ctx, meta.year, x + 22, y + 107, { size: 11.5, font: FONT.mono, color: 'rgba(240,231,210,0.65)', letterSpacing: 1.2 });
    drawText(ctx, 'γ(t) · TIME CONTROL', x + w - 22, y + 107, { size: 9.5, font: FONT.mono, color: 'rgba(240,231,210,0.55)', align: 'right', letterSpacing: 0.7 });
  } else if (style === 'monument') {
    // a vertical ink label, like a collector's inscription on a hanging scroll
    const vw = 190, vh = 318;
    panel(ctx, x, y, vw, vh, { fill: 'rgba(238,231,211,0.92)', stroke: 'rgba(54,44,29,0.35)', radius: 0, shadow: true });
    // hanging thread and pin
    ctx.strokeStyle = 'rgba(91,65,32,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + vw / 2, y + 7); ctx.lineTo(x + vw / 2, y + 24); ctx.stroke();
    ctx.fillStyle = 'rgba(139,103,55,0.55)'; ctx.beginPath(); ctx.arc(x + vw / 2, y + 7, 2.5, 0, TAU); ctx.fill();
    drawText(ctx, meta.no, x + 24, y + 42, { size: 23, font: FONT.display, weight: 800, color: '#a42a22', letterSpacing: 1 });
    const rows = [...meta.zh];
    for (let i = 0; i < rows.length; i++) {
      drawText(ctx, rows[i], x + 56 + Math.floor(i / 5) * 42, y + 82 + (i % 5) * 42, { size: 31, font: FONT.display, weight: 700, color: '#241d13', align: 'center' });
    }
    drawText(ctx, meta.year.replace(' · ', '\n'), x + vw - 23, y + 48, { size: 9.5, font: FONT.serif, color: 'rgba(57,43,25,0.8)', align: 'center', lineHeight: 1.6, maxWidth: 58 });
    drawText(ctx, 'MONUMENTAL LANDSCAPE', x + 22, y + vh - 30, { size: 7.2, font: FONT.mono, color: 'rgba(57,43,25,0.6)', letterSpacing: 0.5, maxWidth: vw - 40, maxLines: 1 });
    ctx.strokeStyle = 'rgba(164,42,34,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 20, y + vh - 50); ctx.lineTo(x + 58, y + vh - 50); ctx.stroke();
    drawText(ctx, '15×', x + vw - 24, y + vh - 29, { size: 9, font: FONT.mono, color: 'rgba(140,38,30,0.65)', align: 'right', letterSpacing: 0.5 });
    markEraCard({ x, y, w: vw, h: vh, style });
    ctx.restore();
    return;
  } else if (style === 'minimal') {
    // almost no chrome: one hairline and a red index
    ctx.fillStyle = 'rgba(250,247,239,0.48)';
    ctx.fillRect(x, y + 36, 3, 66);
    drawText(ctx, meta.no, x + 18, y + 52, { size: 22, font: FONT.mono, weight: 500, color: '#a52a22', letterSpacing: 1.4 });
    drawText(ctx, meta.zh, x + 20, y + 85, { size: 34, font: FONT.display, weight: 500, color: '#1a1711', letterSpacing: 8, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 66, y + 57, { size: 9.5, font: FONT.mono, weight: 500, color: 'rgba(44,37,25,0.55)', letterSpacing: 1.1, maxWidth: w - 70 });
    drawText(ctx, meta.year, x + 66, y + 116, { size: 10, font: FONT.mono, color: 'rgba(44,37,25,0.5)', letterSpacing: 0.8 });
  } else if (style === 'crt') {
    ctx.fillStyle = 'rgba(1,10,3,0.8)';
    ctx.fillRect(x, y, 450, h);
    ctx.strokeStyle = 'rgba(0,255,102,0.42)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, 449, h - 1);
    ctx.fillStyle = 'rgba(0,255,102,0.08)';
    for (let yy = y + 2; yy < y + h; yy += 3) ctx.fillRect(x + 2, yy, 446, 1);
    drawText(ctx, 'CH-01', x + 17, y + 17, { size: 9, font: FONT.mono, color: 'rgba(0,255,102,0.55)', letterSpacing: 1.3 });
    drawText(ctx, meta.no, x + 18, y + 61, { size: 42, font: FONT.mono, weight: 400, color: '#00ff66', letterSpacing: 2, shadow: { color: '#00ff66', blur: 12, x: 0, y: 0 } });
    drawText(ctx, meta.zh, x + 91, y + 43, { size: 28, font: FONT.mono, weight: 400, color: '#74ffab', letterSpacing: 2, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 92, y + 73, { size: 9.5, font: FONT.mono, color: 'rgba(110,255,164,0.62)', letterSpacing: 0.8, maxWidth: 340 });
    drawText(ctx, `${meta.year}  //  CHANNEL 1`, x + 20, y + 106, { size: 10, font: FONT.mono, color: 'rgba(90,255,150,0.55)', letterSpacing: 0.8 });
    drawText(ctx, 'AC 60Hz · 20ms/DIV', x + 438, y + 106, { size: 9, font: FONT.mono, color: 'rgba(90,255,150,0.42)', align: 'right', letterSpacing: 0.5 });
  } else if (style === 'black') {
    ctx.fillStyle = 'rgba(4,4,4,0.55)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(244,236,218,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y + h + 1); ctx.lineTo(x + w, y + h + 1); ctx.stroke();
    drawText(ctx, meta.no, x + 17, y + 56, { size: 44, font: FONT.mono, weight: 300, color: '#f2ead7', letterSpacing: 3 });
    drawText(ctx, meta.zh, x + 94, y + 44, { size: 29, font: FONT.display, weight: 600, color: '#f7f1e2', letterSpacing: 4, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 95, y + 76, { size: 10, font: FONT.mono, weight: 400, color: 'rgba(242,234,215,0.53)', letterSpacing: 1.2, maxWidth: w - 110 });
    drawText(ctx, meta.year, x + 18, y + 108, { size: 11, font: FONT.mono, color: 'rgba(242,234,215,0.52)', letterSpacing: 1 });
    drawText(ctx, '跨时空叩问', x + w - 20, y + 108, { size: 11, font: FONT.serif, color: 'rgba(242,234,215,0.48)', align: 'right', letterSpacing: 2 });
  } else if (style === 'pixel') {
    // 8-bit label: hard pixels and a life bar
    ctx.fillStyle = '#0b0b12'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#f3dd7a'; ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = '#272338'; ctx.fillRect(x, y + 4, w, h - 4);
    const px = 4;
    ctx.fillStyle = '#0b0b12';
    for (let i = 0; i < 6; i++) { ctx.fillRect(x + i * px, y + 6, px, px); ctx.fillRect(x + w - (i + 1) * px, y + 6, px, px); }
    drawText(ctx, meta.no, x + 18, y + 59, { size: 38, font: FONT.mono, weight: 700, color: '#f3d24f', letterSpacing: 2 });
    drawText(ctx, meta.zh, x + 91, y + 42, { size: 26, font: FONT.mono, weight: 700, color: '#f6e7aa', letterSpacing: 1.2, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 92, y + 70, { size: 9, font: FONT.mono, weight: 700, color: 'rgba(246,231,170,0.64)', letterSpacing: 0.8, maxWidth: w - 110 });
    drawText(ctx, meta.year, x + 18, y + 102, { size: 10.5, font: FONT.mono, weight: 700, color: 'rgba(246,231,170,0.7)', letterSpacing: 0.7 });
    drawText(ctx, 'HP', x + 326, y + 26, { size: 12, font: FONT.mono, weight: 700, color: '#f4d25a' });
    ctx.fillStyle = '#461116'; ctx.fillRect(x + 326, y + 38, 132, 12);
    ctx.fillStyle = '#e63b35'; ctx.fillRect(x + 326, y + 38, 6, 12);
    ctx.strokeStyle = '#f4d25a'; ctx.lineWidth = 2; ctx.strokeRect(x + 325, y + 37, 134, 14);
    drawText(ctx, '1%', x + 452, y + 44, { size: 10, font: FONT.mono, weight: 700, color: '#e63b35' });
  } else if (style === 'y2k') {
    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h); ctx.fillRect(x, y + h - 1, w, 1);
    const title = linear(ctx, x + 2, y + 2, x + w - 2, y + 24, [[0, '#0a246a'], [1, '#4a7fd4']]);
    ctx.fillStyle = title; ctx.fillRect(x + 2, y + 2, w - 4, 22);
    drawText(ctx, '历史检索系统 2000 — ' + meta.no + '.EXE', x + 8, y + 13, { size: 12, font: FONT.mono, weight: 700, color: '#f1f1f1', letterSpacing: 0.2 });
    ctx.fillStyle = '#d4d0c8'; ctx.fillRect(x + w - 24, y + 5, 18, 16);
    ctx.strokeStyle = '#404040'; ctx.lineWidth = 1; ctx.strokeRect(x + w - 24, y + 5, 18, 16);
    drawText(ctx, '×', x + w - 15, y + 14, { size: 14, font: FONT.mono, weight: 700, color: '#111', align: 'center' });
    drawText(ctx, meta.no, x + 22, y + 60, { size: 38, font: FONT.mono, weight: 700, color: '#1a1a1a', letterSpacing: 1 });
    drawText(ctx, meta.zh, x + 92, y + 45, { size: 27, font: FONT.serif, weight: 700, color: '#171717', letterSpacing: 2, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 93, y + 76, { size: 9.5, font: FONT.mono, weight: 700, color: '#3a3a3a', letterSpacing: 0.5, maxWidth: w - 110 });
    drawText(ctx, meta.year, x + 23, y + 107, { size: 11, font: FONT.mono, weight: 500, color: '#2c2c2c' });
    ctx.fillStyle = '#fff'; ctx.fillRect(x + w - 84, y + 94, 58, 18);
    ctx.strokeStyle = '#808080'; ctx.lineWidth = 1; ctx.strokeRect(x + w - 84, y + 94, 58, 18);
    drawText(ctx, '确定', x + w - 55, y + 103, { size: 11, font: FONT.serif, weight: 500, color: '#111', align: 'center' });
  } else if (style === 'shorts') {
    // compact pill over frosted background
    ctx.fillStyle = 'rgba(8,10,16,0.55)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, 450, 104, 18); else ctx.rect(x, y, 450, 104);
    ctx.fill();
    ctx.fillStyle = '#ff2b4d';
    ctx.beginPath(); ctx.arc(x + 24, y + 29, 4.5, 0, TAU); ctx.fill();
    drawText(ctx, 'FOR YOU  ·  2020s', x + 37, y + 29, { size: 10, font: FONT.mono, weight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: 1.4 });
    drawText(ctx, meta.zh, x + 24, y + 63, { size: 29, font: FONT.wenkai, weight: 500, color: '#f8f8f8', letterSpacing: 1.5, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 25, y + 88, { size: 9, font: FONT.mono, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.9, maxWidth: 390 });
    drawText(ctx, meta.no, x + 418, y + 32, { size: 17, font: FONT.mono, weight: 700, color: 'rgba(255,255,255,0.78)', align: 'right' });
  } else if (style === 'code') {
    ctx.fillStyle = 'rgba(11,16,22,0.92)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#19212c'; ctx.fillRect(x, y, w, 30);
    const tabs = ['scene_18.js', 'poet.js', 'stars.glsl'];
    let tx = x + 10;
    for (let i = 0; i < tabs.length; i++) {
      const tw = measure(ctx, tabs[i], { size: 11.5, font: FONT.mono }) + 20;
      if (i === 0) { ctx.fillStyle = '#0b1016'; ctx.fillRect(tx, y + 8, tw, 22); }
      drawText(ctx, tabs[i], tx + 10, y + 19, { size: 11.5, font: FONT.mono, color: i === 0 ? '#8ecbff' : 'rgba(143,163,186,0.5)' });
      tx += tw + 2;
    }
    drawText(ctx, meta.no, x + 18, y + 61, { size: 32, font: FONT.mono, weight: 600, color: '#7ec8ff', letterSpacing: 1 });
    drawText(ctx, meta.zh, x + 88, y + 45, { size: 26, font: FONT.wenkai, weight: 500, color: '#e5edf7', letterSpacing: 2, mark: `era-${meta.no}` });
    drawText(ctx, meta.en.toUpperCase(), x + 89, y + 75, { size: 9, font: FONT.mono, color: 'rgba(144,174,205,0.6)', letterSpacing: 0.9, maxWidth: w - 110 });
    drawText(ctx, meta.year, x + 19, y + 107, { size: 10.5, font: FONT.mono, color: 'rgba(144,174,205,0.66)', letterSpacing: 0.8 });
    drawText(ctx, 'DETERMINISTIC BUILD ✓', x + w - 18, y + 107, { size: 8.5, font: FONT.mono, color: 'rgba(112,220,150,0.68)', align: 'right', letterSpacing: 0.6 });
  }

  // registration ticks common to all variants except the ones that returned
  ctx.strokeStyle = style === 'crt' ? 'rgba(0,255,102,0.25)' : style === 'minimal' ? 'rgba(40,32,20,0.28)' : 'rgba(240,228,198,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w + 11, y); ctx.lineTo(x + w + 11, y + 9);
  ctx.moveTo(x + w + 11, y); ctx.lineTo(x + w + 2, y);
  ctx.stroke();
  ctx.restore();
  markEraCard({ x, y, w, h, style });
}

/* ------------------------------------------------------------------- HUD */
export function drawHud(ctx, data) {
  const { distance, section, meta, u, beat, style, dark = true } = data;
  const accent = styleAccent(style, meta || {});
  const light = !dark;
  const ink = light ? 'rgba(27,22,14,0.82)' : 'rgba(244,236,220,0.9)';
  const dim = light ? 'rgba(49,40,27,0.46)' : 'rgba(239,229,208,0.42)';
  const x = HUD.right, y = HUD.y;
  const progress = clamp01(distance / MAX_KM);
  ctx.save();
  // scrim only where needed
  if (style === 'minimal' || style === 'baimiao' || style === 'rubbing') {
    const sc = ctx.createLinearGradient(x - 320, 0, x + 6, 0);
    sc.addColorStop(0, 'rgba(248,241,226,0)');
    sc.addColorStop(0.55, 'rgba(248,241,226,0.38)');
    sc.addColorStop(1, 'rgba(248,241,226,0.72)');
    ctx.fillStyle = sc;
    ctx.fillRect(x - 330, y - 16, 344, 116);
  } else if (style === 'pointcloud' || style === 'gold' || style === 'bullet' || style === 'black' || style === 'construct') {
    const sc = ctx.createLinearGradient(x - 330, 0, x + 10, 0);
    sc.addColorStop(0, 'rgba(4,6,5,0)');
    sc.addColorStop(0.5, 'rgba(4,6,5,0.30)');
    sc.addColorStop(1, 'rgba(4,6,5,0.54)');
    ctx.fillStyle = sc;
    ctx.fillRect(x - 336, y - 16, 350, 116);
  } else if (style === 'y2k') {
    const sc = ctx.createLinearGradient(x - 330, 0, x + 10, 0);
    sc.addColorStop(0, 'rgba(248,244,232,0)');
    sc.addColorStop(1, 'rgba(248,244,232,0.62)');
    ctx.fillStyle = sc;
    ctx.fillRect(x - 336, y - 16, 350, 116);
  }
  drawText(ctx, 'TRAVEL LOG / 漂泊里程', x, y + 2, { size: 9.5, font: FONT.mono, weight: 600, color: dim, align: 'right', letterSpacing: 1.25 });
  const km = formatKm(distance);
  // Numbers are the one thing allowed to be loud.
  const numSize = km.length >= 5 ? 44 : 50;
  const numW = measure(ctx, km, { size: numSize, font: FONT.mono, weight: 300, letterSpacing: 0.5 });
  drawText(ctx, km, x - 46, y + 42, { size: numSize, font: FONT.mono, weight: 300, color: ink, align: 'right', letterSpacing: 0.5 });
  drawText(ctx, 'km', x, y + 46, { size: 14, font: FONT.mono, weight: 500, color: accent, align: 'right', letterSpacing: 0.6 });
  // progress hairline
  ctx.strokeStyle = dim;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 306, y + 66); ctx.lineTo(x, y + 66); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 306, y + 66); ctx.lineTo(x - 306 + 306 * progress, y + 66); ctx.stroke();
  // ticks at the 18 era boundaries
  ctx.strokeStyle = dim;
  ctx.lineWidth = 1;
  for (let i = 1; i < 18; i++) {
    const px = x - 306 + (306 * [0, 420, 705, 1037, 1037, 1150, 1420, 1880, 2600, 3100, 3880, 4350, 4739, 4739, 4739, 4739, 4739, 4739][i]) / MAX_KM;
    ctx.beginPath(); ctx.moveTo(px, y + 63); ctx.lineTo(px, y + 69); ctx.stroke();
  }
  const sectionLabel = section < 0 ? 'PROLOGUE / 序' : section >= 18 ? 'FINALE / 终' : `第 ${String(section + 1).padStart(2, '0')} / 18 帧`;
  drawText(ctx, sectionLabel, x - 304, y + 82, { size: 9.5, font: FONT.mono, weight: 500, color: dim, letterSpacing: 0.7 });
  if (meta) drawText(ctx, meta.year, x, y + 82, { size: 10, font: FONT.serif, weight: 500, color: dim, align: 'right', letterSpacing: 0.7 });
  // beat lamp: a small red square that breathes exactly with the score
  const pulse = 0.35 + 0.65 * Math.pow(1 - (beat?.beatPhase ?? 0), 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = accent;
  ctx.fillRect(x - 6, y + 87, 6, 6);
  ctx.globalAlpha = 1;
  if (style === 'crt') {
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#00ff66';
    for (let yy = y; yy < y + 92; yy += 3) ctx.fillRect(x - 310, yy, 316, 1);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  markHud({ x: x - 310, y: y - 14, w: 316, h: 110, distance, style, text: km });
}

export { CARD, HUD };
