/**
 * 15 · 像素闯关与 3D 翻牌 · 人生烂牌局 / Retro Pixel & 3D Card Flip · modern
 *
 * Split frame. The upper band is a 10 fps 8-bit life-support screen: a dithered
 * night, pixel mountains, a small boat, and a HP bar pinned at 1 %, flickering
 * at 10 fps. Below, on black felt, four bad cards (落第 / 陷贼 / 破屋 / 孤舟) are
 * dealt face down; on the bar-2 downbeat they flip 180° in true perspective —
 * gold sparks, specular sweep — into 春望 / 三吏三别 / 茅屋 / 登高. A gold +9999
 * lands, and the line closes the hand.
 *
 * The pixel band is rendered into a 480×93 buffer and blown up 4× with nearest
 * neighbour; the cards are projected through a real 3D camera at 60 fps.
 */
import KIT from '../kit/index.js';
import {
  clamp01, lerp, smoothstep, easeOut, easeInOutSine, easeOutBack, hash, unit, mulberry32, TAU,
} from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
const BAND = { y: 168, h: 372, lw: 480, lh: 93 };
const SEAM = BAND.y + BAND.h;              // 540
const GOLD = '#e9c86a';
const BONE = '#f4eee1';
const RED = '#e8413a';
const INK = '#0b0b12';
const CYAN = '#5ac8fa';
const MAGENTA = '#d75bc4';

const BAD = ['落第', '陷贼', '破屋', '孤舟'];
const GOOD = ['春望', '三吏三别', '茅屋', '登高'];
const FLIP_AT = [2.06, 2.22, 2.38, 2.54];
const FLIP_DUR = 0.23;

const CARD = { w: 292, h: 318 };
const CARD_X = [-570, -190, 190, 570];
const CARD_YAW = [-0.085, -0.028, 0.028, 0.085];
const CARD_Z = [-20, 26, 26, -20];

let S = null;

/* ------------------------------------------------------------- pixel band */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const lerpC = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

function px(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(x | 0, y | 0, w | 0, h | 0);
}

function paintBand(c, qp) {
  const lw = BAND.lw, lh = BAND.lh;
  c.clearRect(0, 0, lw, lh);
  const skyH = 56;
  const img = c.createImageData(lw, skyH);
  const d = img.data;
  const top = [6, 8, 26], mid = [36, 15, 54], low = [72, 24, 56];
  for (let y = 0; y < skyH; y++) {
    const t = y / (skyH - 1);
    const col = t < 0.55 ? lerpC(top, mid, t / 0.55) : lerpC(mid, low, (t - 0.55) / 0.45);
    for (let x = 0; x < lw; x++) {
      const b = BAYER[((y & 3) << 2) + (x & 3)] / 16 - 0.5;
      const i = (y * lw + x) * 4;
      d[i] = Math.max(0, Math.min(255, col[0] + b * 16));
      d[i + 1] = Math.max(0, Math.min(255, col[1] + b * 16));
      d[i + 2] = Math.max(0, Math.min(255, col[2] + b * 18));
      d[i + 3] = 255;
    }
  }
  const r = mulberry32(1501);
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(r() * lw), y = Math.floor(r() * 48);
    const tw = (i % 11 === 0 && Math.round(qp * 10) % 2 === 0) ? 2 : 1;
    const i2 = (y * lw + x) * 4;
    d[i2] = 220; d[i2 + 1] = 230; d[i2 + 2] = 245;
    if (i % 17 === 0) { d[i2] = 245; d[i2 + 1] = 215; d[i2 + 2] = 160; }
    if (tw === 2 && x + 1 < lw) {
      const j = i2 + 4;
      d[j] = 180; d[j + 1] = 200; d[j + 2] = 230;
    }
  }
  c.putImageData(img, 0, 0);

  // moon: a stepped disc with a dithered halo
  const mx = 386, my = 16, mr = 9;
  for (let dy = -mr; dy <= mr; dy++) {
    const half = Math.floor(Math.sqrt(mr * mr - dy * dy));
    for (let dx = -half; dx <= half; dx++) {
      const edge = dx * dx + dy * dy > (mr - 1) * (mr - 1);
      px(c, mx + dx, my + dy, 1, 1, edge ? '#d8c8a8' : '#f0e2c2');
    }
  }
  for (let dy = -mr - 8; dy <= mr + 8; dy++) {
    for (let dx = -mr - 8; dx <= mr + 8; dx++) {
      const dd = dx * dx + dy * dy;
      if (dd > (mr + 2) * (mr + 2) && dd < (mr + 9) * (mr + 9) && ((mx + dx + my + dy) & 1) === 0) {
        px(c, mx + dx, my + dy, 1, 1, 'rgba(240,226,194,0.16)');
      }
    }
  }

  // three pixel ridges, stepped every 2 px
  const layers = [
    { base: 34, amp: 16, seed: 1511, col: '#1d3550', rim: '#3f7390', step: 2 },
    { base: 42, amp: 12, seed: 1512, col: '#14293f', rim: '#2c546d', step: 2 },
    { base: 50, amp: 8, seed: 1513, col: '#0b1a2b', rim: '#1b3a4e', step: 2 },
  ];
  for (const L of layers) {
    for (let x = 0; x < lw; x += L.step) {
      const n = KIT.fbm1(x * 0.014 + L.seed * 0.13, 3, L.seed);
      const y = Math.round((L.base - n * L.amp) / 2) * 2;
      px(c, x, y, L.step, skyH - y, L.col);
      px(c, x, y, L.step, 1, L.rim);
    }
  }
  // pixel clouds, birds, and a far pagoda on the horizon
  const cloudBands = [[15, 74, 0.10], [21, 116, 0.07], [31, 52, 0.09], [38, 96, 0.05]];
  for (let b = 0; b < cloudBands.length; b++) {
    const cy = cloudBands[b][0], cw = cloudBands[b][1], ca = cloudBands[b][2];
    const cx0 = 30 + ((b * 133 + Math.round(qp * 2)) % 260);
    for (let xx = 0; xx < cw; xx += 2) {
      if ((xx + b) % 6 < 2) px(c, cx0 + xx, cy, 3, 1, `rgba(215,91,196,${ca})`);
      else if ((xx + b) % 6 === 3) px(c, cx0 + xx, cy + 1, 2, 1, `rgba(120,150,210,${ca * 0.8})`);
    }
  }
  px(c, 176, 27, 2, 1, 'rgba(8,10,16,0.9)'); px(c, 178, 26, 2, 1, 'rgba(8,10,16,0.9)');
  px(c, 186, 22, 2, 1, 'rgba(8,10,16,0.8)'); px(c, 188, 21, 2, 1, 'rgba(8,10,16,0.8)');
  px(c, 197, 30, 2, 1, 'rgba(8,10,16,0.75)'); px(c, 199, 29, 2, 1, 'rgba(8,10,16,0.75)');
  // a small pagoda silhouette on the far shore
  px(c, 248, 52, 30, 4, '#0a1420');
  px(c, 251, 47, 24, 5, '#0a1420');
  px(c, 254, 42, 18, 5, '#0a1420');
  px(c, 257, 37, 12, 5, '#0a1420');
  px(c, 259, 32, 8, 5, '#0a1420');
  px(c, 246, 51, 34, 1, '#0a1420');
  px(c, 249, 46, 28, 1, '#0a1420');
  px(c, 252, 41, 22, 1, '#0a1420');
  px(c, 255, 36, 16, 1, '#0a1420');
  px(c, 262, 30, 2, 2, '#f0c674');

  // water
  px(c, 0, 56, lw, lh - 56, '#08131c');
  for (let y = 56; y < lh; y += 2) {
    for (let x = (y % 4) - 2; x < lw; x += 4) {
      if (((x + y) & 7) === 0) px(c, x, y, 2, 1, 'rgba(90,200,250,0.20)');
      if (((x * 3 + y) & 15) === 0) px(c, x, y, 1, 1, 'rgba(233,200,106,0.22)');
    }
  }
  // moon reflection
  for (let y = 56; y < 72; y++) {
    const wdt = 14 - (y - 56) * 0.8;
    for (let x = -wdt; x <= wdt; x += 2) {
      if (((x + y) & 3) === 0) px(c, mx + x + Math.sin(y) * 2, y, 2, 1, 'rgba(240,226,194,0.32)');
    }
  }
  // tiny boat, bobbing at 10 fps
  const bx = Math.round(74 + Math.sin(qp * 1.7) * 5);
  const by = Math.round(61 + Math.sin(qp * 2.3) * 1);
  px(c, bx, by, 16, 1, '#050a0e');
  px(c, bx + 1, by + 1, 14, 1, '#050a0e');
  px(c, bx + 3, by + 2, 10, 1, '#050a0e');
  px(c, bx + 2, by - 4, 1, 4, '#050a0e');
  px(c, bx + 11, by - 5, 1, 5, '#050a0e');
  px(c, bx + 5, by - 3, 5, 3, 'rgba(5,10,14,0.9)');
  px(c, bx + 12, by - 2, 1, 1, '#f0c674');
  px(c, bx + 13, by - 3, 2, 1, 'rgba(240,198,116,0.35)');
  px(c, bx + 2, by - 2, 1, 2, '#0b1418');

  // bottom HUD strip
  const stripY = 79;
  px(c, 0, stripY, lw, lh - stripY, 'rgba(3,6,10,0.86)');
  px(c, 0, stripY, lw, 1, 'rgba(233,200,106,0.55)');
  // labels
  c.font = '600 6px "Cascadia Mono", monospace';
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  c.fillStyle = GOLD;
  c.fillText('LIFE 59', 22, 84);
  c.fillStyle = 'rgba(244,238,225,0.4)';
  c.font = '600 5px "Cascadia Mono", monospace';
  c.fillText('8-BIT · 10FPS', 22, 90);
  c.textAlign = 'right';
  c.fillStyle = CYAN;
  c.font = '600 6px "Cascadia Mono", monospace';
  c.fillText('STAGE 08', lw - 22, 84);
  c.fillStyle = 'rgba(244,238,225,0.35)';
  c.font = '600 5px "Cascadia Mono", monospace';
  c.fillText('ROUND 3 / 3', lw - 22, 90);

  // HP bar
  const hx = 60, hy = 82, hw = 76, hh = 7;
  px(c, hx - 1, hy - 1, hw + 2, hh + 2, 'rgba(233,200,106,0.85)');
  px(c, hx, hy, hw, hh, '#1a0808');
  const starved = qp < 4.62;
  const hp = starved ? 0.01 : smoothstep(4.62, 4.95, qp);
  const flash = starved ? (Math.floor(qp * 10) % 2 === 0) : true;
  if (hp > 0) {
    const fw = Math.max(2, (hw - 4) * hp);
    const col = starved ? (flash ? '#ff5b45' : '#8f1e18') : (hp > 0.99 ? '#f2d270' : '#e9a93c');
    px(c, hx + 2, hy + 2, fw, hh - 4, col);
    px(c, hx + 2, hy + 2, fw, 1, starved ? '#ffd9c8' : '#fff0c4');
  }
  for (let i = 1; i < 8; i++) {
    px(c, hx + (hw / 8) * i, hy + 2, 1, hh - 4, 'rgba(0,0,0,0.5)');
  }
  c.textAlign = 'left';
  c.font = '600 6px "Cascadia Mono", monospace';
  c.fillStyle = starved ? (flash ? '#ff7b66' : '#a12b21') : GOLD;
  c.fillText(starved ? '1%' : `${Math.round(hp * 100)}%`, hx + hw + 4, hy + 3);
  c.fillStyle = 'rgba(244,238,225,0.32)';
  c.font = '600 5px "Cascadia Mono", monospace';
  c.fillText('NO CONTINUES', hx + hw + 28, hy + 3);

  // damage border + damage vignette
  if (starved) {
    const a = flash ? 0.5 : 0.16;
    px(c, 0, 0, lw, 1, `rgba(232,65,58,${a})`);
    px(c, 0, lh - 1, lw, 1, `rgba(232,65,58,${a})`);
    px(c, 0, 0, 1, lh, `rgba(232,65,58,${a})`);
    px(c, lw - 1, 0, 1, lh, `rgba(232,65,58,${a})`);
    if (flash) {
      for (let i = 0; i < 14; i++) {
        const x = Math.floor(hash(1502, i) % lw);
        const y = Math.floor(hash(1503, i) % 50);
        px(c, x, y, 1, 1, 'rgba(232,65,58,0.4)');
      }
    }
  }
  // the "1UP" moment when the bar refills
  if (!starved && qp < 5.35) {
    const t = smoothstep(4.62, 4.9, qp) * (1 - smoothstep(5.05, 5.35, qp));
    c.fillStyle = `rgba(255,240,196,${0.75 * t})`;
    c.font = '700 10px "Cascadia Mono", monospace';
    c.textAlign = 'right';
    c.fillText('MAX!', hx + hw + 28, 90);
  }
}

/* ------------------------------------------------------------ card faces */
function cardPaper(w, h, seed) {
  return KIT.paper.silk(w, h, { seed, tone: '#f4eee1' });
}

function goldBorder(c, w, h, seed) {
  c.save();
  c.strokeStyle = 'rgba(180,142,66,0.85)';
  c.lineWidth = 3;
  c.strokeRect(12.5, 12.5, w - 25, h - 25);
  c.strokeStyle = 'rgba(200,166,92,0.45)';
  c.lineWidth = 1;
  c.strokeRect(21.5, 21.5, w - 43, h - 43);
  const r = mulberry32(seed);
  // foil mottling on the border
  for (let i = 0; i < 90; i++) {
    const side = Math.floor(r() * 4);
    let x, y;
    if (side === 0) { x = 14 + r() * (w - 28); y = 12 + r() * 3; }
    else if (side === 1) { x = 14 + r() * (w - 28); y = h - 15 + r() * 3; }
    else if (side === 2) { x = 12 + r() * 3; y = 14 + r() * (h - 28); }
    else { x = w - 15 + r() * 3; y = 14 + r() * (h - 28); }
    c.fillStyle = `rgba(233,200,106,${0.1 + r() * 0.5})`;
    c.fillRect(x, y, 1 + r() * 3, 1 + r() * 2);
  }
  c.restore();
}

function makeFace(i) {
  const w = 400, h = 520;
  const c = KIT.makeCanvas(w, h);
  const x = c.getContext('2d');
  x.drawImage(cardPaper(w, h, 1530 + i), 0, 0);
  // the paper catches a little warm light from the table
  const warm = x.createRadialGradient(w * 0.42, h * 0.3, 20, w * 0.42, h * 0.35, w * 0.85);
  warm.addColorStop(0, 'rgba(255,248,228,0.35)');
  warm.addColorStop(1, 'rgba(120,98,58,0.14)');
  x.fillStyle = warm;
  x.fillRect(0, 0, w, h);
  goldBorder(x, w, h, 1550 + i);
  x.textAlign = 'left';
  x.textBaseline = 'middle';

  if (i === 0) {
    // 春望 — red sun, vertical title, gold rule
    const sx = 300, sy = 150;
    x.fillStyle = 'rgba(178,43,34,0.9)';
    x.beginPath(); x.arc(sx, sy, 48, 0, TAU); x.fill();
    x.fillStyle = 'rgba(178,43,34,0.18)';
    x.beginPath(); x.arc(sx, sy, 62, 0, TAU); x.fill();
    KIT.drawText(x, '春望', 330, 250, {
      size: 68, font: KIT.FONT.brush, weight: 400, color: 'rgba(30,24,16,0.92)', align: 'center', letterSpacing: 4,
    });
    KIT.drawText(x, '国破山河在', 58, 330, {
      size: 26, font: KIT.FONT.display, weight: 500, color: 'rgba(38,30,18,0.86)', letterSpacing: 5,
    });
    KIT.drawText(x, '城春草木深', 58, 372, {
      size: 26, font: KIT.FONT.display, weight: 500, color: 'rgba(38,30,18,0.7)', letterSpacing: 5,
    });
    x.strokeStyle = 'rgba(180,142,66,0.8)';
    x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(56, 410); x.lineTo(196, 410); x.stroke();
    KIT.drawText(x, '757 · 长安', 58, 438, {
      size: 15, font: KIT.FONT.mono, weight: 500, color: 'rgba(60,48,30,0.62)', letterSpacing: 1.6,
    });
    KIT.ink.sealStamp(x, 286, 408, 46, '杜', { seed: 1531, font: KIT.FONT.display });
    KIT.drawText(x, 'SPRING VIEW', 34, 62, {
      size: 12, font: KIT.FONT.mono, weight: 600, color: 'rgba(74,58,32,0.55)', letterSpacing: 2.2,
    });
  } else if (i === 1) {
    // 三吏三别 — a grid of small seals
    const chars = ['吏', '别', '新', '安', '石', '壕', '潼', '关', '婚'];
    for (let k = 0; k < 9; k++) {
      const gx = 92 + (k % 3) * 74, gy = 62 + Math.floor(k / 3) * 60;
      KIT.ink.sealStamp(x, gx, gy, 42, chars[k], { seed: 1540 + k, font: KIT.FONT.display });
    }
    KIT.drawText(x, '三吏三别', 200, 316, {
      size: 56, font: KIT.FONT.display, weight: 700, color: 'rgba(28,22,14,0.92)', align: 'center', letterSpacing: 8,
    });
    x.strokeStyle = 'rgba(180,142,66,0.7)';
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(70, 356); x.lineTo(330, 356); x.stroke();
    KIT.drawText(x, '石壕吏 · 新安吏 · 潼关吏', 200, 386, {
      size: 16, font: KIT.FONT.display, weight: 500, color: 'rgba(48,38,22,0.72)', align: 'center', letterSpacing: 1.5,
    });
    KIT.drawText(x, '新婚别 · 垂老别 · 无家别', 200, 412, {
      size: 16, font: KIT.FONT.display, weight: 500, color: 'rgba(48,38,22,0.55)', align: 'center', letterSpacing: 1.5,
    });
    KIT.drawText(x, '759 · 六首', 30, 484, {
      size: 13, font: KIT.FONT.mono, weight: 500, color: 'rgba(74,58,32,0.55)', letterSpacing: 1.6,
    });
  } else if (i === 2) {
    // 茅屋 — thatch and rain
    x.save();
    x.strokeStyle = 'rgba(44,34,20,0.75)';
    x.lineWidth = 2;
    for (let k = 0; k < 26; k++) {
      const xx = 72 + k * 8;
      x.beginPath();
      x.moveTo(xx, 192);
      x.lineTo(xx + 44 - k * 1.2, 96);
      x.stroke();
    }
    x.lineWidth = 1;
    x.strokeStyle = 'rgba(44,34,20,0.42)';
    for (let k = 0; k < 16; k++) {
      const xx = 96 + k * 9;
      x.beginPath(); x.moveTo(xx, 176); x.lineTo(xx + 26, 118); x.stroke();
    }
    x.beginPath(); x.moveTo(62, 194); x.lineTo(352, 194); x.strokeStyle = 'rgba(44,34,20,0.8)'; x.lineWidth = 3; x.stroke();
    x.fillStyle = 'rgba(44,34,20,0.14)';
    x.fillRect(108, 200, 184, 96);
    x.strokeStyle = 'rgba(44,34,20,0.6)';
    x.lineWidth = 2;
    x.strokeRect(108, 200, 184, 96);
    x.beginPath(); x.moveTo(200, 200); x.lineTo(200, 296); x.stroke();
    // rain
    x.strokeStyle = 'rgba(90,120,120,0.35)';
    x.lineWidth = 1;
    for (let k = 0; k < 30; k++) {
      const xx = 40 + k * 12, yy = 90 + (k * 37) % 180;
      x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx - 7, yy + 22); x.stroke();
    }
    x.restore();
    KIT.drawText(x, '茅屋', 200, 372, {
      size: 66, font: KIT.FONT.brush, weight: 400, color: 'rgba(32,26,16,0.94)', align: 'center', letterSpacing: 10,
    });
    KIT.drawText(x, '茅屋为秋风所破歌', 200, 424, {
      size: 18, font: KIT.FONT.display, weight: 500, color: 'rgba(48,38,22,0.7)', align: 'center', letterSpacing: 2,
    });
    KIT.drawText(x, '761 · 成都', 30, 484, {
      size: 13, font: KIT.FONT.mono, weight: 500, color: 'rgba(74,58,32,0.55)', letterSpacing: 1.6,
    });
  } else {
    // 登高 — mountain line
    x.save();
    x.fillStyle = 'rgba(218,206,178,0.9)';
    x.beginPath(); x.arc(300, 108, 34, 0, TAU); x.fill();
    x.fillStyle = 'rgba(120,112,92,0.18)';
    x.beginPath(); x.arc(300, 108, 46, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(36,30,20,0.72)';
    x.lineWidth = 2;
    for (let layer = 0; layer < 2; layer++) {
      x.beginPath();
      x.moveTo(40, 300 - layer * 36);
      for (let xx = 40; xx <= 360; xx += 8) {
        const yy = 292 - layer * 36 - KIT.fbm1(xx * 0.018 + layer * 4, 4, 1560 + layer) * (90 - layer * 40);
        x.lineTo(xx, yy);
      }
      x.strokeStyle = layer ? 'rgba(36,30,20,0.35)' : 'rgba(36,30,20,0.7)';
      x.stroke();
    }
    // a walker on the ridge
    x.fillStyle = 'rgba(30,24,16,0.85)';
    x.beginPath(); x.arc(272, 258, 5, 0, TAU); x.fill();
    x.fillRect(269, 263, 7, 20);
    x.fillRect(276, 258, 2, 28);
    x.restore();
    KIT.drawText(x, '登高', 200, 146, {
      size: 66, font: KIT.FONT.brush, weight: 400, color: 'rgba(30,24,16,0.94)', align: 'center', letterSpacing: 10,
    });
    KIT.drawText(x, '无边落木萧萧下', 200, 380, {
      size: 20, font: KIT.FONT.display, weight: 500, color: 'rgba(48,38,22,0.74)', align: 'center', letterSpacing: 2,
    });
    KIT.drawText(x, '不尽长江滚滚来', 200, 410, {
      size: 20, font: KIT.FONT.display, weight: 500, color: 'rgba(48,38,22,0.55)', align: 'center', letterSpacing: 2,
    });
    KIT.drawText(x, '767 · 夔州', 30, 484, {
      size: 13, font: KIT.FONT.mono, weight: 500, color: 'rgba(74,58,32,0.55)', letterSpacing: 1.6,
    });
  }
  return c;
}

function makeBack(i) {
  const w = 400, h = 520;
  const c = KIT.makeCanvas(w, h);
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#121018');
  g.addColorStop(0.45, '#0b0b12');
  g.addColorStop(1, '#151019');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  // woven black silk
  const r = mulberry32(1570 + i);
  for (let k = 0; k < 260; k++) {
    const yy = r() * h;
    x.strokeStyle = `rgba(233,200,106,${0.012 + r() * 0.03})`;
    x.lineWidth = 0.6;
    x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy + (r() - 0.5) * 2); x.stroke();
  }
  // gold frame + corners
  x.strokeStyle = 'rgba(233,200,106,0.72)';
  x.lineWidth = 2;
  x.strokeRect(14.5, 14.5, w - 29, h - 29);
  x.strokeStyle = 'rgba(233,200,106,0.25)';
  x.lineWidth = 1;
  x.strokeRect(24.5, 24.5, w - 49, h - 49);
  for (const [cx, cy] of [[14, 14], [w - 30, 14], [14, h - 30], [w - 30, h - 30]]) {
    x.fillStyle = 'rgba(233,200,106,0.85)';
    x.fillRect(cx, cy, 16, 2);
    x.fillRect(cx, cy, 2, 16);
  }
  // central seal
  KIT.ink.sealStamp(x, 150, 96, 100, '局', { seed: 1580 + i, font: KIT.FONT.display });
  // bad name
  KIT.drawText(x, BAD[i], 200, 330, {
    size: 76, font: KIT.FONT.brush, weight: 400, color: 'rgba(226,72,58,0.95)', align: 'center', letterSpacing: 12,
    shadow: { color: 'rgba(226,72,58,0.35)', blur: 18, x: 0, y: 0 },
  });
  x.strokeStyle = 'rgba(233,200,106,0.35)';
  x.lineWidth = 1;
  x.beginPath(); x.moveTo(120, 380); x.lineTo(280, 380); x.stroke();
  KIT.drawText(x, `BAD HAND 0${i + 1} / 04`, 200, 410, {
    size: 13, font: KIT.FONT.mono, weight: 600, color: 'rgba(233,200,106,0.55)', align: 'center', letterSpacing: 2.4,
  });
  KIT.drawText(x, 'FATE DEALS · YOU PLAY', 200, 438, {
    size: 10, font: KIT.FONT.mono, weight: 500, color: 'rgba(244,238,225,0.28)', align: 'center', letterSpacing: 1.6,
  });
  return c;
}

/* ------------------------------------------------------------------ scene */
function paintTable(c) {
  c.fillStyle = '#050607';
  c.fillRect(0, 0, W, H);
  // felt, in perspective: narrow at the seam, full at the bottom
  const topY = SEAM - 8, botY = H;
  const g = c.createLinearGradient(0, topY, 0, botY);
  g.addColorStop(0, '#1a4a39');
  g.addColorStop(0.35, '#12352b');
  g.addColorStop(1, '#081c16');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(250, topY);
  c.lineTo(1670, topY);
  c.lineTo(W + 40, botY);
  c.lineTo(-40, botY);
  c.closePath();
  c.fill();
  // felt tooth
  const r = mulberry32(1510);
  for (let i = 0; i < 26000; i++) {
    const x = r() * W;
    const t = r();
    const y = topY + Math.pow(t, 0.8) * (botY - topY);
    const halfW = lerp(710, 1000, (y - topY) / (botY - topY));
    if (Math.abs(x - 960) > halfW) continue;
    c.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.008 + r() * 0.03})` : `rgba(0,0,0,${0.02 + r() * 0.08})`;
    c.fillRect(x, y, 1 + r() * 2, 1 + r() * 2);
  }
  // perspective guides
  c.save();
  c.strokeStyle = 'rgba(233,200,106,0.06)';
  c.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const bx = 960 + (i - 2.5) * 260;
    c.beginPath(); c.moveTo(960 + (i - 2.5) * 90, topY); c.lineTo(bx, botY); c.stroke();
  }
  c.restore();
  // gold trim on the felt edge
  c.strokeStyle = 'rgba(233,200,106,0.42)';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(250, topY); c.lineTo(1670, topY); c.stroke();
  c.strokeStyle = 'rgba(233,200,106,0.14)';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(220, topY + 10); c.lineTo(1700, topY + 10); c.stroke();
  // the table's side rails: dark wood with a gold inlay
  c.save();
  c.strokeStyle = 'rgba(233,200,106,0.22)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(250, topY); c.lineTo(-40, botY);
  c.moveTo(1670, topY); c.lineTo(W + 40, botY);
  c.stroke();
  c.strokeStyle = 'rgba(12,10,8,0.95)';
  c.lineWidth = 26;
  c.beginPath();
  c.moveTo(250 - 24, topY); c.lineTo(-40 - 30, botY);
  c.moveTo(1670 + 24, topY); c.lineTo(W + 40 + 30, botY);
  c.stroke();
  c.strokeStyle = 'rgba(233,200,106,0.10)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(250 - 12, topY); c.lineTo(-40 - 12, botY);
  c.moveTo(1670 + 12, topY); c.lineTo(W + 40 + 12, botY);
  c.stroke();
  c.restore();
  // overhead light pool
  const pool = c.createRadialGradient(960, topY + 40, 20, 960, topY + 220, 1100);
  pool.addColorStop(0, 'rgba(255,238,196,0.10)');
  pool.addColorStop(0.45, 'rgba(210,230,190,0.035)');
  pool.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = pool;
  c.fillRect(0, topY - 20, W, H - topY + 20);
  // front rail
  const rail = c.createLinearGradient(0, H - 54, 0, H);
  rail.addColorStop(0, '#0c0a08');
  rail.addColorStop(0.4, '#181410');
  rail.addColorStop(1, '#070605');
  c.fillStyle = rail;
  c.fillRect(0, H - 54, W, 54);
  c.fillStyle = 'rgba(233,200,106,0.35)';
  c.fillRect(0, H - 55, W, 1);
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.fillRect(0, H - 53, W, 2);
  // vignette
  c.drawImage(KIT.vignetteLayer(W, H, { strength: 0.7, inner: 0.3, outer: 0.9 }), 0, 0);
  // grain
  c.save();
  c.globalCompositeOperation = 'screen';
  c.globalAlpha = 0.06;
  c.drawImage(KIT.grainLayer(480, 270, 1511, { amp: 0.16 }), 0, 0, W, H);
  c.restore();
}

function ensure() {
  if (S) return S;
  const faces = [];
  const backs = [];
  for (let i = 0; i < 4; i++) { faces.push(makeFace(i)); backs.push(makeBack(i)); }
  const sparks = [];
  {
    const r = mulberry32(1515);
    for (let i = 0; i < 300; i++) {
      sparks.push({
        x: r(), z: r(), d: r(),
        s: 0.7 + Math.pow(r(), 2) * 2.6,
        ph: r() * TAU,
        sp: 0.4 + r() * 1.1,
        a: 0.15 + r() * 0.8,
        gold: r() < 0.72,
      });
    }
  }
  const band = KIT.makeCanvas(BAND.lw, BAND.lh);
  const shadow = KIT.layer('scene15:shadow', 240, 100, (c) => {
    const g = c.createRadialGradient(120, 50, 2, 120, 50, 116);
    g.addColorStop(0, 'rgba(0,0,0,0.72)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.3)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(120, 50, 116, 44, 0, 0, TAU); c.fill();
  });
  const scan = KIT.layer('scene15:scan', W, BAND.h, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < BAND.h; y += 4) c.fillRect(0, y, W, 1.4);
    c.fillStyle = 'rgba(90,200,250,0.035)';
    for (let y = 2; y < BAND.h; y += 4) c.fillRect(0, y, W, 1);
  });
  const seam = KIT.layer('scene15:seam', W, 36, (c) => {
    for (let x = 0; x < W; x += 8) {
      for (let y = 0; y < 36; y += 8) {
        if (((x + y) / 8) % 2 === 0) {
          c.fillStyle = 'rgba(4,6,8,0.55)';
          c.fillRect(x, y, 8, 8);
        }
      }
    }
  });
  S = {
    faces, backs, sparks, band, shadow, scan, seam,
    table: KIT.layer('scene15:table', W, H, paintTable),
    cam: new KIT.geometry3d.Camera3D({
      cx: 960, cy: 700, dist: 1560, focal: 1450, pitch: 0.10, target: [0, 0, 0], near: 200,
    }),
    bandQp: -1,
  };
  return S;
}

/* ---------------------------------------------------------- band drawing */
function drawBand(ctx, u) {
  const st = ensure();
  const qp = Math.floor(u * 10) / 10;
  // the band only exists inside the film frame
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, BAND.y, W, BAND.h);
  ctx.clip();
  // a dark screen bezel
  ctx.fillStyle = '#04060a';
  ctx.fillRect(0, BAND.y, W, BAND.h);
  if (st.bandQp !== qp) {
    paintBand(st.band.getContext('2d'), qp);
    st.bandQp = qp;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(st.band, 0, BAND.y, W, BAND.h);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(st.scan, 0, BAND.y);
  // slight phosphor bloom
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.10;
  ctx.drawImage(st.band, 0, BAND.y - 3, W, BAND.h + 6);
  ctx.restore();
  // glass vignette
  const vg = ctx.createRadialGradient(W / 2, BAND.y + BAND.h / 2, 300, W / 2, BAND.y + BAND.h / 2, 1320);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, BAND.y, W, BAND.h);
  ctx.restore();
  // bezel frame
  ctx.save();
  ctx.fillStyle = 'rgba(8,7,10,0.85)';
  ctx.fillRect(0, BAND.y - 8, W, 8);
  ctx.fillRect(0, BAND.y + BAND.h, W, 8);
  ctx.fillStyle = 'rgba(233,200,106,0.5)';
  ctx.fillRect(0, BAND.y - 1, W, 1.5);
  ctx.fillStyle = 'rgba(90,200,250,0.22)';
  ctx.fillRect(0, BAND.y + BAND.h - 2, W, 1);
  ctx.restore();
  ctx.drawImage(st.seam, 0, BAND.y + BAND.h + 4);
  // technical caption (kept clear of the cards)
  KIT.drawText(ctx, 'PIXEL LAYER · 10 FPS · 4× NEAREST · 64 COLOURS', 80, 992, {
    size: 11, font: KIT.FONT.mono, weight: 500, color: 'rgba(233,200,106,0.34)', letterSpacing: 1.7,
  });
}

/* -------------------------------------------------------------- 3D cards */
function quadPath(ctx, q) {
  ctx.beginPath();
  ctx.moveTo(q[0].x, q[0].y);
  ctx.lineTo(q[1].x, q[1].y);
  ctx.lineTo(q[2].x, q[2].y);
  ctx.lineTo(q[3].x, q[3].y);
  ctx.closePath();
}

function texTri(ctx, img, iw, ih, s, d) {
  // map the image triangle s (source px) onto the screen triangle d
  const den = (s[1].x - s[0].x) * (s[2].y - s[0].y) - (s[2].x - s[0].x) * (s[1].y - s[0].y);
  if (Math.abs(den) < 1e-6) return;
  const a = ((d[1].x - d[0].x) * (s[2].y - s[0].y) - (d[2].x - d[0].x) * (s[1].y - s[0].y)) / den;
  const cc = ((d[2].x - d[0].x) * (s[1].x - s[0].x) - (d[1].x - d[0].x) * (s[2].x - s[0].x)) / den;
  const b = ((d[1].y - d[0].y) * (s[2].y - s[0].y) - (d[2].y - d[0].y) * (s[1].y - s[0].y)) / den;
  const dd = ((d[2].y - d[0].y) * (s[1].x - s[0].x) - (d[1].y - d[0].y) * (s[2].x - s[0].x)) / den;
  const e = d[0].x - a * s[0].x - cc * s[0].y;
  const f = d[0].y - b * s[0].x - dd * s[0].y;
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(e) || !Number.isFinite(f)) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d[0].x, d[0].y);
  ctx.lineTo(d[1].x, d[1].y);
  ctx.lineTo(d[2].x, d[2].y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, cc, dd, e, f);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  void iw; void ih;
}

function drawFaceOnQuad(ctx, img, q) {
  const iw = img.width, ih = img.height;
  // expand the clip a hair so the diagonal seam never shows
  const grow = (tri) => {
    const cx = (tri[0].x + tri[1].x + tri[2].x) / 3;
    const cy = (tri[0].y + tri[1].y + tri[2].y) / 3;
    return tri.map((p) => {
      const dx = p.x - cx, dy = p.y - cy;
      const l = Math.hypot(dx, dy) || 1;
      return { x: p.x + (dx / l) * 0.9, y: p.y + (dy / l) * 0.9 };
    });
  };
  const s0 = { x: 0, y: 0 }, s1 = { x: iw, y: 0 }, s2 = { x: iw, y: ih }, s3 = { x: 0, y: ih };
  texTri(ctx, img, iw, ih, [s0, s1, s2], grow([q[0], q[1], q[2]]));
  texTri(ctx, img, iw, ih, [s0, s2, s3], grow([q[0], q[2], q[3]]));
}

function cardQuad(cam, cx, cy, cz, yaw, tilt) {
  const hw = CARD.w / 2, hh = CARD.h / 2;
  const cy0 = Math.cos(yaw), sy0 = Math.sin(yaw);
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const local = [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]];
  const out = [];
  for (const [lx, ly] of local) {
    const rx = lx * cy0;
    const rz = -lx * sy0;
    // tilt about z
    const tx = rx * ct - ly * st;
    const ty = rx * st + ly * ct;
    const p = cam.project([cx + tx, cy + ty, cz + rz]);
    if (!p.visible) return null;
    out.push(p);
  }
  return out;
}

function drawCards(ctx, u) {
  const st = ensure();
  const cam = st.cam;
  const cards = [];
  for (let i = 0; i < 4; i++) {
    const deal = easeOut(clamp01((u - 0.18 - i * 0.1) / 0.5));
    const fp = clamp01((u - FLIP_AT[i]) / FLIP_DUR);
    const ang = Math.PI * easeInOutSine(fp);
    const lift = Math.sin(Math.PI * fp) * 20;
    const rise = (1 - deal) * -140;
    const gather = smoothstep(4.12, 4.68, u);
    const fly = smoothstep(4.56 + i * 0.03, 5.3 + i * 0.03, u);
    const cx = lerp(lerp(CARD_X[i], CARD_X[i] * 0.22, gather), 1500 + i * 150, fly);
    const cz = lerp(CARD_Z[i], CARD_Z[i] + 60, gather) + fly * 500;
    const cy = rise - lift - gather * 18 + fly * 70;
    const yaw = CARD_YAW[i] + ang + gather * (i - 1.5) * 0.05;
    const tilt = Math.sin(Math.PI * fp) * 0.045 * (i % 2 ? 1 : -1) + gather * (i - 1.5) * 0.06;
    const q = cardQuad(cam, cx, cy, cz, yaw, tilt);
    const front = ang > Math.PI / 2;
    cards.push({
      i, deal, fp, q, front, fly, gather,
      z: cz - CARD_Z[i],
      alpha: clamp01((u - 0.18 - i * 0.1) / 0.35) * (1 - smoothstep(5.1, 5.45, u)),
      sweep: fp > 0.05 && fp < 0.98 ? Math.sin(Math.PI * fp) : 0,
    });
  }
  cards.sort((a, b) => b.z - a.z);

  for (const c of cards) {
    if (!c.q || c.alpha <= 0.01) continue;
    if (c.q.every((p, k) => k === 0 || (Math.abs(p.x - c.q[0].x) < 0.6 && Math.abs(p.y - c.q[0].y) < 0.6))) continue;
    const q = c.q;
    // shadow on the felt
    const cxS = (q[0].x + q[1].x + q[2].x + q[3].x) / 4;
    const wS = Math.abs(q[1].x - q[0].x) + 40;
    ctx.save();
    ctx.globalAlpha = c.alpha * 0.55 * (1 - c.fly * 0.7);
    ctx.drawImage(st.shadow, cxS - wS * 0.8, 862 - c.deal * 10, wS * 1.6, 74);
    ctx.restore();

    // thickness / card edge
    ctx.save();
    ctx.globalAlpha = c.alpha;
    ctx.translate(0, 3.2);
    quadPath(ctx, q);
    ctx.fillStyle = '#241d12';
    ctx.fill();
    ctx.restore();

    // face
    ctx.save();
    ctx.globalAlpha = c.alpha;
    const img = c.front ? st.faces[c.i] : st.backs[c.i];
    const order = c.front ? [q[1], q[0], q[3], q[2]] : q;
    drawFaceOnQuad(ctx, img, order);
    // gold rim
    quadPath(ctx, q);
    ctx.strokeStyle = c.front ? 'rgba(233,200,106,0.9)' : 'rgba(233,200,106,0.55)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // specular sweep during the turn
    if (c.sweep > 0.01) {
      ctx.save();
      quadPath(ctx, q);
      ctx.clip();
      const bx = lerp(q[0].x, q[1].x, 0.5);
      const by = lerp(q[0].y, q[3].y, 0.5);
      const sw = 90 + 160 * c.sweep;
      const g = ctx.createLinearGradient(bx - sw, by - 120, bx + sw, by + 120);
      g.addColorStop(0, 'rgba(255,248,224,0)');
      g.addColorStop(0.5, `rgba(255,248,224,${0.34 * c.sweep})`);
      g.addColorStop(1, 'rgba(255,248,224,0)');
      ctx.fillStyle = g;
      ctx.fillRect(bx - 420, by - 360, 840, 720);
      ctx.restore();
    }
    // thin warm light on the top edge
    ctx.strokeStyle = 'rgba(255,248,224,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(q[0].x, q[0].y);
    ctx.lineTo(q[1].x, q[1].y);
    ctx.stroke();
    ctx.restore();
  }
  return cards;
}

function drawSparks(ctx, u) {
  const st = ensure();
  const burst = smoothstep(2.0, 2.9, u);
  const out = smoothstep(5.4, 5.9, u);
  if (burst <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < st.sparks.length; i++) {
    const s = st.sparks[i];
    const start = 1.98 + s.d * 0.9;
    if (u < start) continue;
    const t = u - start;
    const rise = (t * 34 * s.sp) % 520;
    const x = 150 + s.x * 1620 + Math.sin(t * 0.9 + s.ph) * 26;
    const y = 850 - rise - s.z * 60;
    if (y < 500) continue;
    const a = s.a * burst * (1 - out) * (0.35 + 0.65 * Math.sin(Math.min(1, rise / 120) * Math.PI * 0.5));
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = s.gold ? 'rgba(233,200,106,1)' : 'rgba(255,240,206,1)';
    const r = s.s;
    ctx.fillRect(x, y, r, r);
    if (r > 1.9) {
      ctx.globalAlpha = a * 0.16;
      ctx.fillRect(x - 3, y - 3, r + 6, r + 6);
    }
  }
  ctx.restore();
}

/** Gold particle columns bursting up as each card turns. */
function drawFlipColumns(ctx, u) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const t = u - FLIP_AT[i];
    if (t < 0 || t > 0.95) continue;
    const x0 = 960 + CARD_X[i] * 0.93;
    const fade = Math.sin(clamp01(t / 0.95) * Math.PI);
    for (let k = 0; k < 30; k++) {
      const d = unit(1600 + i, k);
      const rise = (t * 1.15 + d) % 1;
      const y = 872 - rise * (210 + d * 160);
      const x = x0 + (unit(1601 + i, k) - 0.5) * (26 + rise * 52) + Math.sin(t * 4 + k) * 5;
      const a = fade * (1 - rise) * (0.3 + d * 0.7);
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = d > 0.55 ? '#ffe9b4' : '#e9c86a';
      const r = 1.2 + d * 2.2;
      ctx.fillRect(x, y, r, r);
    }
    // hot base flash on the felt
    const g = ctx.createRadialGradient(x0, 858, 2, x0, 858, 120);
    g.addColorStop(0, `rgba(255,232,170,${0.22 * fade})`);
    g.addColorStop(1, 'rgba(255,232,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 130, 728, 260, 270);
  }
  ctx.restore();
}

function drawHit(ctx, u) {
  const p = smoothstep(2.88, 3.02, u);
  if (p <= 0) return;
  const pop = 0.7 + 0.3 * easeOutBack(clamp01((u - 2.88) / 0.34), 2.4);
  const y = 890;
  ctx.save();
  ctx.translate(960, y);
  ctx.scale(pop, pop);
  ctx.globalAlpha = p;
  const w = 300, h = 46;
  ctx.fillStyle = 'rgba(8,7,5,0.6)';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = 'rgba(233,200,106,0.7)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
  ctx.fillStyle = 'rgba(233,200,106,0.9)';
  ctx.fillRect(-w / 2, -h / 2, 4, h);
  ctx.fillRect(w / 2 - 4, -h / 2, 4, h);
  KIT.drawText(ctx, '+9999', -8, 0, {
    size: 34, font: KIT.FONT.mono, weight: 700, color: '#f6dc94', align: 'right', letterSpacing: 1.5,
    shadow: { color: 'rgba(233,200,106,0.55)', blur: 16, x: 0, y: 0 },
  });
  KIT.drawText(ctx, '诗史不朽！', 12, 0, {
    size: 30, font: KIT.FONT.display, weight: 700, color: '#f7e7b8', align: 'left', letterSpacing: 3,
    shadow: { color: 'rgba(233,200,106,0.4)', blur: 14, x: 0, y: 0 },
  });
  ctx.restore();
  markText('s15-hit', '+9999 诗史不朽！', 960 - w / 2, y - h / 2, w, h, { size: 34, align: 'center' });
}

function drawLine(ctx, u) {
  const p = smoothstep(3.02, 3.42, u);
  if (p <= 0) return;
  const text = '「杜甫把最苦的一手烂牌，熬成了大唐的诗史！」';
  const chars = [...text];
  const size = 43;
  const spacing = 2 + 7 * (1 - p);
  const widths = chars.map((ch) => KIT.measure(ctx, ch, { size, font: KIT.FONT.display, weight: 600 }));
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  const y = 950;
  let x = 960 - total / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  for (let i = 0; i < chars.length; i++) {
    const cp = clamp01((p - (i / chars.length) * 0.4) / 0.6);
    if (cp > 0) {
      ctx.globalAlpha = Math.pow(cp, 1.4);
      ctx.font = `600 ${size}px ${KIT.FONT.display}`;
      const gold = i > 3 && i < 13;
      ctx.fillStyle = gold ? '#efd28a' : BONE;
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 3;
      ctx.fillText(chars[i], x + widths[i] / 2, y + 10 * (1 - cp));
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
    x += widths[i] + spacing;
  }
  ctx.restore();
  markText('s15-line', text, 960 - total / 2, y - 30, total, 60, { size, align: 'center', color: BONE });
}

function drawTraveler(ctx, u) {
  const P = KIT.rig.pose({ t: u, phase: u * 1.1, wind: 0.4, lean: 0.05, look: 0.6, staff: true });
  const pos = KIT.rig.placed(P, { x: 196, y: 900, scale: 0.44, rot: 0 });
  const parts = pos.parts.filter((p) => ['body', 'sleeve-near', 'sleeve-far', 'skin', 'cap', 'leg-near', 'leg-far', 'beard', 'hair', 'staff'].includes(p.role));
  ctx.save();
  ctx.globalAlpha = 0.9;
  KIT.rig.drawSilhouette(ctx, { ...pos, parts }, { color: 'rgba(2,8,6,0.96)' });
  KIT.rig.drawWire(ctx, { ...pos, parts }, { color: 'rgba(233,200,106,0.18)', width: 1, alpha: 0.9 });
  ctx.restore();
}

function drawSeal(ctx, u) {
  const p = smoothstep(4.74, 5.0, u);
  if (p <= 0) return;
  const pop = easeOutBack(clamp01((u - 4.74) / 0.3), 1.6);
  ctx.save();
  ctx.translate(1700, 982);
  ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
  ctx.rotate(-0.04);
  ctx.globalAlpha = p;
  const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 150);
  glow.addColorStop(0, 'rgba(233,200,106,0.16)');
  glow.addColorStop(1, 'rgba(233,200,106,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-160, -160, 320, 320);
  KIT.ink.sealStamp(ctx, -48, -48, 96, '诗史', { seed: 1590, color: '#a8802f', ink: '#fff2c9', font: KIT.FONT.display, border: true, inset: 6 });
  ctx.restore();
}

/* ---------------------------------------------------------------- render */
export function renderAt(ctx, u, beat, env) {
  void env;
  const st = ensure();
  ctx.save();
  ctx.drawImage(st.table, 0, 0);

  // a soft cool/warm light in the room, breathing on the bar pulse
  const pulse = beat && Number.isFinite(beat.barPulse) ? beat.barPulse : 0;
  const air = ctx.createRadialGradient(960, 700, 100, 960, 700, 900);
  air.addColorStop(0, `rgba(233,200,106,${0.035 + 0.03 * pulse})`);
  air.addColorStop(0.5, 'rgba(120,160,140,0.015)');
  air.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = air;
  ctx.fillRect(0, SEAM, W, H - SEAM);

  drawBand(ctx, u);
  drawSparks(ctx, u);
  drawTraveler(ctx, u);
  drawCards(ctx, u);
  drawFlipColumns(ctx, u);
  drawHit(ctx, u);
  drawLine(ctx, u);
  drawSeal(ctx, u);

  // depth grade: the lower third falls to black, the band edge is hot
  const vg = ctx.createRadialGradient(960, 700, 280, 960, 720, 1120);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(2,3,4,0.62)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export default { renderAt };
