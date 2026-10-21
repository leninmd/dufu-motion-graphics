/**
 * 09 · 关中镂空皮影 · 石壕吏 / Shadow Puppetry @ 10fps · 759 · 石壕村
 *
 * A night shadow-play lit by an oil lamp behind an amber leather screen.
 * Du Fu and the old woman of Shihao are carved openwork puppets with riveted
 * joints, bamboo control rods and a horizontal control bar. Every articulated
 * part is updated at 10 fps; the camera dolly, the lamp, the smoke and the dust
 * stay at 60 fps. On the bar-2 downbeat an abstract iron claw comes down out of
 * the dark, seizes the old woman's control bar and yanks her off the screen,
 * leaving one empty wire swaying — and the line 「夜久语声绝，如闻泣幽咽」
 * surfaces in the lamp's last light.
 */
import KIT from '../kit/index.js';
import { clamp01, clamp, lerp, smoothstep, easeOut, easeIn, hash, unit, mulberry32, TAU } from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
/** The leather screen, inset inside a carved wooden stage. */
const S = { x: 150, y: 150, w: 1620, h: 800 };
const GROUND = 700;            // screen-local ground line
const BAR_Y = 92;              // screen-local height of the puppet control bars
const CREAM = '#f4d49a';
const LAMP = '#7c2d12';
const METAL = '#9aa3a1';
const BAMBOO = '#3a2210';

/** 10 fps puppet clock: every articulated part reads this, never `u`. */
const qAt = (u) => Math.floor(u * 10 + 1e-9) / 10;

/* ---------------------------------------------------------------- helpers */
function poly(ctx, pts, close = true) {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
function fill(ctx, pts, style) {
  poly(ctx, pts, true);
  ctx.fillStyle = style;
  ctx.fill();
}
function stroke(ctx, pts, style, width, close = false) {
  poly(ctx, pts, close);
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.stroke();
}
function ridge(x, base, amp, seed) {
  return base - KIT.fbm1(x * 0.0021 + 1.7, 5, seed) * amp
    - KIT.noise2(x * 0.0082, 2.3, seed + 5) * amp * 0.15;
}

/* ------------------------------------------------------------- stage wood */
function woodLayer() {
  return KIT.layer('scene09:wood', W, H, (ctx) => {
    const r = mulberry32(75911);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d0704');
    bg.addColorStop(0.5, '#150c06');
    bg.addColorStop(1, '#040202');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const y = -30 + i * 140;
      ctx.strokeStyle = `rgba(132,82,40,${(0.015 + r() * 0.022).toFixed(3)})`;
      ctx.lineWidth = 8 + r() * 20;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y + (r() - 0.5) * 10);
      ctx.stroke();
    }

    /* --- the stage frame ------------------------------------------------ */
    const ox = S.x - 84, oy = S.y - 84, ow = S.w + 168, oh = S.h + 168;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = '#1c0f06';
    ctx.fillRect(ox, oy, ow, oh);
    ctx.restore();
    const fg = ctx.createLinearGradient(ox, oy, ox + ow * 0.35, oy + oh);
    fg.addColorStop(0, '#3c2210');
    fg.addColorStop(0.22, '#2a1709');
    fg.addColorStop(0.55, '#190d05');
    fg.addColorStop(0.82, '#271508');
    fg.addColorStop(1, '#39200f');
    ctx.fillStyle = fg;
    ctx.fillRect(ox, oy, ow, oh);

    // long grain
    for (let i = 0; i < 340; i++) {
      const y = oy + r() * oh;
      ctx.strokeStyle = `rgba(${r() < 0.4 ? '186,128,74' : '8,4,2'},${(0.02 + r() * 0.055).toFixed(3)})`;
      ctx.lineWidth = 0.6 + r() * 2.2;
      const x0 = ox + r() * ow * 0.4;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.bezierCurveTo(x0 + ow * 0.25, y + (r() - 0.5) * 12, x0 + ow * 0.55, y + (r() - 0.5) * 12, x0 + ow * 0.8, y + (r() - 0.5) * 6);
      ctx.stroke();
    }
    // chamfer highlights
    ctx.strokeStyle = 'rgba(196,146,88,0.22)';
    ctx.lineWidth = 3;
    ctx.strokeRect(ox + 5, oy + 5, ow - 10, oh - 10);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 4;
    ctx.strokeRect(ox + 16, oy + 16, ow - 32, oh - 32);

    // carved cloud scrolls on the top beam
    const carve = (cx, cy, rr, dir) => {
      for (let k = 0; k < 3; k++) {
        const rad = rr * (1 - k * 0.24);
        ctx.beginPath();
        for (let a = 0; a <= 2.1; a += 0.09) {
          const ang = a * (1 + k * 0.1) + k * 1.2;
          const x = cx + Math.cos(ang) * rad * dir;
          const y = cy + Math.sin(ang) * rad * 0.55;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(228,172,106,0.3)';
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(6,3,1,0.65)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    };
    for (let x = ox + 100; x < ox + ow - 60; x += 176) carve(x, oy + 34, 44, x % 352 < 176 ? 1 : -1);
    for (let x = ox + 180; x < ox + ow - 100; x += 176) {
      ctx.strokeStyle = 'rgba(220,164,100,0.2)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(x, oy + 58, 9, 0.2, Math.PI * 1.9);
      ctx.stroke();
    }
    // bottom sill: repeating lotus cuts
    for (let x = ox + 70; x < ox + ow - 40; x += 92) {
      ctx.beginPath();
      ctx.moveTo(x, oy + oh - 28);
      ctx.quadraticCurveTo(x + 24, oy + oh - 60, x + 48, oy + oh - 28);
      ctx.quadraticCurveTo(x + 24, oy + oh - 40, x, oy + oh - 28);
      ctx.fillStyle = 'rgba(206,152,92,0.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(4,2,1,0.6)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    // corner brackets
    for (const [cx, cy] of [[ox + 40, oy + 40], [ox + ow - 40, oy + 40], [ox + 40, oy + oh - 40], [ox + ow - 40, oy + oh - 40]]) {
      ctx.fillStyle = 'rgba(10,5,2,0.8)';
      ctx.fillRect(cx - 30, cy - 30, 60, 60);
      ctx.strokeStyle = 'rgba(212,160,100,0.24)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 25, cy - 25, 50, 50);
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, TAU);
      ctx.fillStyle = 'rgba(160,114,66,0.5)';
      ctx.fill();
    }
    // studs
    for (let i = 0; i <= 10; i++) {
      const x = ox + 74 + (i / 10) * (ow - 148);
      for (const y of [oy + 76, oy + oh - 76]) {
        ctx.beginPath();
        ctx.arc(x, y, 4.6, 0, TAU);
        ctx.fillStyle = 'rgba(158,114,66,0.6)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - 1.2, y - 1.2, 1.8, 0, TAU);
        ctx.fillStyle = 'rgba(255,224,176,0.6)';
        ctx.fill();
      }
    }
    // screen bed (content is composited over it)
    ctx.fillStyle = '#0c0603';
    ctx.fillRect(S.x, S.y, S.w, S.h);
  });
}

/* ------------------------------------------------------- amber leather screen */
function screenTexture() {
  return KIT.layer('scene09:screen', S.w, S.h, (ctx) => {
    const w = S.w, h = S.h;
    const r = mulberry32(7593);
    const g = ctx.createLinearGradient(0, 0, w * 0.2, h);
    g.addColorStop(0, '#f1c47c');
    g.addColorStop(0.18, '#e8b25e');
    g.addColorStop(0.5, '#d49440');
    g.addColorStop(0.78, '#a05f26');
    g.addColorStop(1, '#5e3212');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // silk warp / weft
    for (let i = 0; i < 520; i++) {
      const y = r() * h;
      ctx.strokeStyle = `rgba(${r() < 0.5 ? '255,238,198' : '96,52,16'},${(0.015 + r() * 0.05).toFixed(3)})`;
      ctx.lineWidth = 0.5 + r() * 1.3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (r() - 0.5) * 2.4);
      ctx.stroke();
    }
    for (let i = 0; i < 300; i++) {
      const x = r() * w;
      ctx.strokeStyle = `rgba(${r() < 0.5 ? '255,244,214' : '84,44,14'},${(0.01 + r() * 0.035).toFixed(3)})`;
      ctx.lineWidth = 0.5 + r() * 0.9;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (r() - 0.5) * 4, h);
      ctx.stroke();
    }
    // tannin patches / lamp smoke pooling upward
    for (let i = 0; i < 18; i++) {
      const x = r() * w, y = r() * h * 0.9;
      const rad = 100 + r() * 340;
      const gg = ctx.createRadialGradient(x, y, 4, x, y, rad);
      const warm = r() < 0.5;
      gg.addColorStop(0, warm ? `rgba(255,224,166,${0.05 + r() * 0.1})` : `rgba(72,32,8,${0.05 + r() * 0.1})`);
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.ellipse(x, y, rad, rad * (0.45 + r() * 0.5), r(), 0, TAU);
      ctx.fill();
    }
    // leather seams / battens
    for (const bx of [w * 0.31, w * 0.66]) {
      const lg = ctx.createLinearGradient(bx - 26, 0, bx + 26, 0);
      lg.addColorStop(0, 'rgba(52,24,6,0)');
      lg.addColorStop(0.5, 'rgba(52,24,6,0.26)');
      lg.addColorStop(1, 'rgba(52,24,6,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(bx - 26, 0, 52, h);
    }
    // heavy vignette into the frame
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.4, Math.min(w, h) * 0.16, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    vg.addColorStop(0, 'rgba(30,12,3,0)');
    vg.addColorStop(0.55, 'rgba(30,12,3,0.14)');
    vg.addColorStop(0.82, 'rgba(24,9,2,0.52)');
    vg.addColorStop(1, 'rgba(16,6,1,0.82)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    // old creases
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      let x = r() * w, y = r() * h;
      ctx.strokeStyle = `rgba(52,24,6,${(0.05 + r() * 0.08).toFixed(3)})`;
      ctx.lineWidth = 0.8 + r();
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 7; k++) {
        x += (r() - 0.5) * 50;
        y += 20 + r() * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}

/* --------------------------------------------------------- carved scenery */
function farScenery() {
  const w = S.w + 300, h = S.h;
  return KIT.layer('scene09:far', w, h, (ctx) => {
    ctx.translate(150, 0);
    const r = mulberry32(7597);
    const rows = [
      { base: 588, amp: 258, seed: 91, color: 'rgba(60,26,8,0.42)', dot: 4.0, dots: 150 },
      { base: 656, amp: 180, seed: 92, color: 'rgba(48,20,6,0.62)', dot: 4.6, dots: 170 },
      { base: 708, amp: 108, seed: 93, color: 'rgba(34,13,4,0.82)', dot: 5.2, dots: 190 },
    ];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const pts = [[-150, h]];
      for (let x = -150; x <= S.w + 150; x += 10) pts.push([x, ridge(x, row.base, row.amp, row.seed)]);
      pts.push([S.w + 150, h]);
      fill(ctx, pts, row.color);
      // a carved dark ridge line
      ctx.beginPath();
      for (let x = -150; x <= S.w + 150; x += 10) {
        const y = ridge(x, row.base, row.amp, row.seed);
        if (x === -150) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(22,8,2,0.6)';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      // structured openwork: a dotted band tucked under each ridge
      for (let x = -140; x < S.w + 140; x += 26) {
        const y = ridge(x, row.base, row.amp, row.seed) + 30 + (KIT.noise2(x * 0.02, 1.1, row.seed) * 46);
        if (y > h - 26) continue;
        const rad = row.dot * (0.55 + unit(row.seed, x, 1) * 0.7);
        ctx.beginPath();
        ctx.arc(x + (unit(row.seed, x, 2) - 0.5) * 8, y, rad, 0, TAU);
        ctx.fill();
        if (unit(row.seed, x, 3) < 0.32) {
          ctx.beginPath();
          ctx.arc(x + 13, y + 2, rad * 0.72, 0, TAU);
          ctx.fill();
        }
      }
      // crescent cuts along the slopes
      for (let k = 0; k < 30; k++) {
        const x = -140 + r() * (S.w + 280);
        const y = ridge(x, row.base, row.amp, row.seed) + 10 + r() * 150;
        if (y > h - 30) continue;
        ctx.beginPath();
        ctx.arc(x, y, 8 + r() * 12, 0.15, 2.75);
        ctx.arc(x + 11, y + 2, 7 + r() * 8, 2.9, 4.85);
        ctx.fill();
      }
    }
    // a distant pagoda on the middle ridge
    const px = 1230, py = ridge(1230, 656, 180, 92) - 4;
    ctx.fillStyle = 'rgba(26,10,3,0.72)';
    for (let t = 0; t < 3; t++) {
      const yy = py - t * 34;
      ctx.beginPath();
      ctx.moveTo(px - 44 + t * 8, yy);
      ctx.lineTo(px, yy - 22);
      ctx.lineTo(px + 44 - t * 8, yy);
      ctx.lineTo(px + 31 - t * 6, yy + 8);
      ctx.lineTo(px - 31 + t * 6, yy + 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(px - 7, py - 6, 14, 50);
  });
}

function nearScenery() {
  const w = S.w + 200, h = S.h;
  return KIT.layer('scene09:near', w, h, (ctx) => {
    ctx.translate(100, 0);
    const r = mulberry32(7599);
    // ground
    const pts = [[-100, h]];
    for (let x = -100; x <= S.w + 100; x += 10) {
      pts.push([x, GROUND + (KIT.fbm1(x * 0.011, 3, 77) - 0.5) * 13]);
    }
    pts.push([S.w + 100, h]);
    fill(ctx, pts, 'rgba(24,9,3,0.96)');
    ctx.beginPath();
    for (let x = -100; x <= S.w + 100; x += 10) {
      const y = GROUND + (KIT.fbm1(x * 0.011, 3, 77) - 0.5) * 13;
      if (x === -100) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(16,6,1,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // road stones
    for (let i = 0; i < 90; i++) {
      const x = -60 + r() * (S.w + 120);
      const y = GROUND + 18 + r() * 58;
      ctx.fillStyle = `rgba(${r() < 0.5 ? '56,24,8' : '8,3,1'},${(0.2 + r() * 0.4).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + r() * 15, 2 + r() * 5, (r() - 0.5) * 0.4, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      const x = -40 + r() * (S.w + 80);
      const hgt = 16 + r() * 56;
      ctx.strokeStyle = 'rgba(14,5,1,0.9)';
      ctx.lineWidth = 1.6 + r() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, GROUND + 16);
      ctx.quadraticCurveTo(x + (r() - 0.5) * 16, GROUND + 16 - hgt * 0.6, x + (r() - 0.5) * 36, GROUND + 12 - hgt);
      ctx.stroke();
    }

    /* --- the village gate ------------------------------------------------ */
    const gx = 186, gy = GROUND;
    fill(ctx, [[gx - 96, gy + 8], [gx - 88, gy - 158], [gx - 20, gy - 166], [gx + 82, gy - 158], [gx + 94, gy + 8]], 'rgba(20,7,2,0.95)');
    fill(ctx, [[gx - 66, gy], [gx - 62, gy - 212], [gx - 32, gy - 214], [gx - 28, gy]], 'rgba(14,5,1,0.97)');
    fill(ctx, [[gx + 28, gy], [gx + 32, gy - 212], [gx + 62, gy - 210], [gx + 66, gy]], 'rgba(14,5,1,0.97)');
    const roof = [
      [gx - 158, gy - 200], [gx - 100, gy - 238], [gx - 30, gy - 250], [gx + 42, gy - 250],
      [gx + 108, gy - 236], [gx + 166, gy - 198], [gx + 152, gy - 180], [gx + 88, gy - 212],
      [gx + 10, gy - 220], [gx - 68, gy - 210], [gx - 144, gy - 180],
    ];
    fill(ctx, roof, 'rgba(16,6,1,0.97)');
    ctx.strokeStyle = 'rgba(206,150,86,0.14)';
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const x0 = lerp(gx - 140, gx + 148, t);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, gy - 190 - Math.sin(t * Math.PI) * 34);
      ctx.lineTo(lerp(gx - 78, gx + 92, t), gy - 232 - Math.sin(t * Math.PI) * 10);
      ctx.stroke();
    }
    // plaque with carved characters
    const px = gx - 48, py = gy - 196;
    fill(ctx, [[px, py], [px + 96, py], [px + 96, py + 36], [px, py + 36]], 'rgba(12,4,1,0.98)');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    ctx.font = `700 26px ${KIT.FONT.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('石壕村', px + 48, py + 19);
    ctx.restore();
    // hanging lantern (the light comes from behind it)
    ctx.strokeStyle = 'rgba(14,5,1,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx + 58, gy - 212);
    ctx.lineTo(gx + 58, gy - 184);
    ctx.stroke();
    const lx = gx + 58, ly = gy - 164;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 18, 22, 0, 0, TAU);
    ctx.fillStyle = 'rgba(238,178,96,0.62)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,11,3,0.95)';
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx, ly - 22);
    ctx.lineTo(lx, ly + 34);
    ctx.stroke();

    /* --- willow + reeds -------------------------------------------------- */
    const wx = 1330;
    ctx.strokeStyle = 'rgba(14,5,1,0.98)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(wx, GROUND + 6);
    ctx.quadraticCurveTo(wx - 20, GROUND - 150, wx + 12, GROUND - 330);
    ctx.stroke();
    ctx.lineWidth = 6;
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const bx = wx - 6 + t * 22;
      const by = GROUND - 120 - t * 186;
      const dir = i % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + dir * 74, by - 44, bx + dir * 126, by - 30);
      ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const sx = bx + dir * (30 + k * 26);
        const sy = by - 36 + k * 6;
        ctx.strokeStyle = 'rgba(18,7,2,0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(sx + 6, sy + 60, sx - 10, sy + 130, sx + 2, sy + 196);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(14,5,1,0.98)';
      }
    }
    for (let i = 0; i < 48; i++) {
      const x = 1230 + r() * 390;
      const hh = 90 + r() * 240;
      const lean = (r() - 0.5) * 62;
      ctx.strokeStyle = `rgba(12,4,1,${(0.6 + r() * 0.4).toFixed(2)})`;
      ctx.lineWidth = 1.3 + r() * 1.9;
      ctx.beginPath();
      ctx.moveTo(x, GROUND + 12);
      ctx.quadraticCurveTo(x + lean * 0.4, GROUND - hh * 0.55, x + lean, GROUND - hh);
      ctx.stroke();
      if (r() < 0.6) {
        ctx.beginPath();
        ctx.ellipse(x + lean, GROUND - hh - 6, 3 + r() * 2.4, 9 + r() * 8, lean * 0.01, 0, TAU);
        ctx.fillStyle = 'rgba(16,6,1,0.9)';
        ctx.fill();
      }
    }
    // carved hole bands along the ground edge
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    for (let i = 0; i < 70; i++) {
      const x = -40 + i * 24 + (r() - 0.5) * 10;
      if (r() < 0.5) continue;
      ctx.beginPath();
      ctx.arc(x, GROUND + 34 + r() * 40, 2 + r() * 3.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  });
}

/* ---------------------------------------------------------- leather puppets */
function paintParts(ctx, pose, roles, color, opts = {}) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = opts.line || color;
  for (const p of pose.parts) {
    if (!roles.includes(p.role)) continue;
    if (opts.skip && opts.skip.includes(p.id)) continue;
    if (opts.only && !opts.only.includes(p.id)) continue;
    if (p.kind === 'poly') {
      poly(ctx, p.pts, p.closed);
      ctx.fill();
      if (opts.outline) {
        ctx.strokeStyle = opts.outline;
        ctx.lineWidth = opts.outlineW ?? 1.2;
        ctx.stroke();
        ctx.strokeStyle = opts.line || color;
      }
    } else if (p.kind === 'line') {
      poly(ctx, p.pts, false);
      ctx.lineWidth = (p.width || 2) * (opts.widthScale ?? 1);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else if (p.kind === 'circle') {
      ctx.beginPath();
      ctx.arc(p.c[0], p.c[1], p.r, 0, TAU);
      ctx.fill();
      if (opts.outline) {
        ctx.strokeStyle = opts.outline;
        ctx.lineWidth = opts.outlineW ?? 1.2;
        ctx.stroke();
      }
    } else if (p.kind === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(p.c[0], p.c[1], p.rx, p.ry, 0, 0, TAU);
      ctx.fill();
    } else if (p.kind === 'dot') {
      ctx.beginPath();
      ctx.arc(p.c[0], p.c[1], p.r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function rivet(ctx, x, y, r = 4.6) {
  ctx.beginPath();
  ctx.arc(x, y + 1.6, r + 1.8, 0, TAU);
  ctx.fillStyle = 'rgba(8,3,1,0.55)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = '#241006';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.strokeStyle = 'rgba(246,202,140,0.72)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.32, r * 0.3, 0, TAU);
  ctx.fillStyle = 'rgba(255,230,186,0.85)';
  ctx.fill();
}

/** Cut a leather openwork field inside `clipPts`. */
function openwork(ctx, clipPts, seed, n = 20, scale = 1) {
  ctx.save();
  poly(ctx, clipPts, true);
  ctx.clip();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  const r = mulberry32(hash('s09open', seed));
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of clipPts) {
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
    y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
  }
  let placed = 0;
  for (let i = 0; i < n * 5 && placed < n; i++) {
    const x = lerp(x0 + 6, x1 - 6, r());
    const y = lerp(y0 + 8, y1 - 8, r());
    if (!KIT.pointInPoly([x, y], clipPts)) continue;
    const kind = r();
    if (kind < 0.5) {
      ctx.beginPath();
      ctx.arc(x, y, (2.2 + r() * 4) * scale, 0, TAU);
      ctx.fill();
    } else if (kind < 0.8) {
      ctx.beginPath();
      ctx.arc(x, y, (5 + r() * 5) * scale, 0.2, Math.PI * 1.82);
      ctx.arc(x + 3.2 * scale, y + 1 * scale, (3.6 + r() * 3.4) * scale, Math.PI * 1.9, 0.24, true);
      ctx.fill();
    } else {
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + r();
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 4.4 * scale, y + Math.sin(a) * 4.4 * scale, 3.1 * scale, 1.9 * scale, a, 0, TAU);
        ctx.fill();
      }
    }
    placed++;
  }
  ctx.restore();
}

/* ---- Du Fu: the shared rig, carved as leather --------------------------- */
const DU = { canvas: null, key: '' };
function dufuLayer(q, elder) {
  const key = `${q.toFixed(1)}|${elder ? 1 : 0}`;
  if (DU.key === key && DU.canvas) return { canvas: DU.canvas, pose: DU.pose };
  if (!DU.canvas) DU.canvas = KIT.makeCanvas(460, 460);
  const ctx = DU.canvas.getContext('2d');
  ctx.clearRect(0, 0, 460, 460);
  ctx.save();
  ctx.translate(230, 390);
  const pose = KIT.rig.pose({ t: q, phase: (q / 1.15) * TAU, wind: 0.55, lean: 0.02, look: 0.3, staff: true, elder });
  // back limbs, scroll pack, robe, then the near side
  paintParts(ctx, pose, ['leg-far'], '#1c0b04');
  paintParts(ctx, pose, ['scroll'], '#261006');
  paintParts(ctx, pose, ['robe-tail', 'sleeve-tail'], '#2c1206');
  paintParts(ctx, pose, ['body'], '#3b1807', { outline: 'rgba(8,3,1,0.85)', outlineW: 2 });
  paintParts(ctx, pose, ['sash'], '#7a3c14');
  paintParts(ctx, pose, ['sleeve-far'], '#2a1105', { outline: 'rgba(8,3,1,0.8)', outlineW: 1.8 });
  paintParts(ctx, pose, ['leg-near'], '#2c1206');
  paintParts(ctx, pose, ['sleeve-near'], '#4a1f09', { outline: 'rgba(8,3,1,0.85)', outlineW: 2 });
  paintParts(ctx, pose, ['staff'], '#1e0d04');
  // pale leather face + hands
  paintParts(ctx, pose, ['skin'], '#b17647', { outline: 'rgba(14,5,1,0.9)', outlineW: 1.8, skip: ['neck'] });
  paintParts(ctx, pose, ['skin'], '#83512e', { only: ['neck'] });
  // a smaller lit face inside the head, with a carved brow
  ctx.beginPath();
  ctx.ellipse(pose.head.c[0] + 3, pose.head.c[1] + 2, 17, 20, 0.06, 0, TAU);
  ctx.fillStyle = '#c08a58';
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,11,3,0.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pose.head.c[0] - 2, pose.head.c[1] - 9);
  ctx.quadraticCurveTo(pose.head.c[0] + 12, pose.head.c[1] - 13, pose.head.c[0] + 19, pose.head.c[1] - 5);
  ctx.strokeStyle = 'rgba(26,9,2,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // ink-dark hat, hair, beard
  paintParts(ctx, pose, ['cap', 'hair'], '#140a04');
  paintParts(ctx, pose, ['beard', 'moustache'], '#2a1307');
  stroke(ctx, pose.head.beard, 'rgba(240,196,132,0.28)', 1.2, true);
  // carved grooves: folds, collar, sash line
  paintParts(ctx, pose, ['detail'], 'rgba(255,208,150,0.30)', { widthScale: 1.15 });
  // the eye is an open cut
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(pose.head.eye.c[0] + 1.5, pose.head.eye.c[1], 3.4, 0, TAU);
  ctx.fill();
  ctx.restore();
  // carved robe
  openwork(ctx, pose.robe, `du-${q.toFixed(1)}`, 30, 1);
  // leather edges
  stroke(ctx, pose.robe, 'rgba(248,204,142,0.42)', 1.5, true);
  // rivets at every joint
  rivet(ctx, pose.arms.near.shoulder[0], pose.arms.near.shoulder[1], 5);
  rivet(ctx, pose.arms.near.elbow[0], pose.arms.near.elbow[1], 4.4);
  rivet(ctx, pose.arms.near.hand[0], pose.arms.near.hand[1], 3.6);
  rivet(ctx, pose.arms.far.shoulder[0], pose.arms.far.shoulder[1], 4.6);
  rivet(ctx, pose.arms.far.elbow[0], pose.arms.far.elbow[1], 4);
  rivet(ctx, pose.legs.near.hip[0], pose.legs.near.hip[1], 4.2);
  rivet(ctx, pose.legs.near.knee[0], pose.legs.near.knee[1], 3.8);
  rivet(ctx, pose.legs.near.ankle[0], pose.legs.near.ankle[1], 3.2);
  rivet(ctx, pose.legs.far.knee[0], pose.legs.far.knee[1], 3.4);
  rivet(ctx, pose.head.c[0] - 4, pose.head.c[1] + 22, 3);
  ctx.restore();
  DU.key = key;
  DU.pose = pose;
  return { canvas: DU.canvas, pose };
}

/* ---- the old woman: a bespoke, collapsible puppet ----------------------- */
function oldWomanGeom(q, fold) {
  const ph = (q / 1.32) * TAU;
  const step = Math.sin(ph);
  const bob = -Math.abs(Math.cos(ph)) * 2.4;
  const f = fold;
  const swing = step * 3.4;
  const sh = [30 - f * 7 + swing, -152 + bob + f * 12];
  const head = [46 - f * 12 + swing, -180 + bob + f * 20];
  const elbN = [47 - f * 20, -120 + bob + f * 22];
  const handN = [55 - f * 40, -97 + bob + f * 34];
  const elbF = [2 + f * 12, -118 + bob + f * 28];
  const handF = [-16 + f * 26, -96 + bob + f * 38];
  const hipN = [7, -94 + bob * 0.6];
  const kneeN = [14 + f * 12, -50 + f * 8];
  const ankN = [18 + f * 16, -6 + f * 20];
  const hipF = [-9, -94 + bob * 0.6];
  const kneeF = [-3 + f * 4, -50 + f * 12];
  const ankF = [4 + f * 6, -6 + f * 24];
  const shN = [25 - f * 5 + swing, -147 + bob + f * 9];
  const shF = [21 - f * 5 + swing, -147 + bob + f * 9];
  const armN = KIT.ribbon(KIT.smoothPath([shN, elbN, handN], 6), (t) => lerp(17, 8, t), true);
  const armF = KIT.ribbon(KIT.smoothPath([shF, elbF, handF], 6), (t) => lerp(16, 7, t), true);
  const legN = KIT.ribbon(KIT.smoothPath([hipN, kneeN, ankN], 6), (t) => lerp(16, 8, t), true);
  const legF = KIT.ribbon(KIT.smoothPath([hipF, kneeF, ankF], 6), (t) => lerp(15, 8, t), true);
  const robePts = [
    [sh[0] - 18, sh[1] - 12], [sh[0] + 4, sh[1] - 24], [sh[0] + 22, sh[1] + 2],
    [sh[0] + 24, sh[1] + 42], [sh[0] + 14, sh[1] + 80], [32, -26], [22, -2],
    [2, 2], [-18, -3], [-30, -30], [-38, -76], [-33, -124], [-10, sh[1] + 8],
  ];
  const robe = KIT.smoothLoop(robePts, 7);
  const scarf = KIT.smoothPath([
    [head[0] - 27, head[1] - 8], [head[0] - 8, head[1] - 31], [head[0] + 18, head[1] - 26],
    [head[0] + 27, head[1] - 8], [head[0] + 8, head[1] - 3], [head[0] - 18, head[1] + 3],
  ], 6);
  const scarfTail = KIT.smoothPath([
    [head[0] - 20, head[1] - 8], [head[0] - 44 - f * 18, head[1] + 8], [head[0] - 62 - f * 30, head[1] + 38 + f * 18],
  ], 6);
  const basketC = [sh[0] - 44 - f * 8, sh[1] + 34];
  const basket = [
    [basketC[0] - 26, basketC[1] - 22], [basketC[0] + 24, basketC[1] - 24],
    [basketC[0] + 28, basketC[1] + 22], [basketC[0] - 22, basketC[1] + 26],
  ];
  return {
    sh, head, elbN, handN, elbF, handF, hipN, kneeN, ankN, hipF, kneeF, ankF,
    shN, shF, armN, armF, legN, legF, robe, scarf, scarfTail, basket, basketC,
  };
}

const OLD = { canvas: null, key: '', g: null };
function oldWomanLayer(q, fold) {
  const key = `${q.toFixed(1)}|${fold.toFixed(2)}`;
  if (OLD.key === key && OLD.canvas) return { canvas: OLD.canvas, g: OLD.g };
  const g = oldWomanGeom(q, fold);
  if (!OLD.canvas) OLD.canvas = KIT.makeCanvas(460, 460);
  const ctx = OLD.canvas.getContext('2d');
  ctx.clearRect(0, 0, 460, 460);
  ctx.save();
  ctx.translate(250, 390);
  // basket, back arm and far leg first
  fill(ctx, g.basket, '#241006');
  ctx.strokeStyle = 'rgba(248,202,138,0.34)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const y = g.basketC[1] - 20 + i * 10;
    ctx.beginPath();
    ctx.moveTo(g.basketC[0] - 28, y);
    ctx.lineTo(g.basketC[0] + 29, y - 1);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = g.basketC[0] - 24 + i * 12;
    ctx.beginPath();
    ctx.moveTo(x, g.basketC[1] - 24);
    ctx.lineTo(x + 2, g.basketC[1] + 24);
    ctx.stroke();
  }
  stroke(ctx, g.basket, 'rgba(8,3,1,0.7)', 2, true);
  fill(ctx, g.legF, '#190a03');
  fill(ctx, g.armF, '#221005');
  // robe
  fill(ctx, g.robe, '#431c08');
  stroke(ctx, g.robe, 'rgba(8,3,1,0.8)', 2.2, true);
  // apron (a second leather layer, lighter)
  fill(ctx, [
    [g.sh[0] - 12, g.sh[1] + 48], [g.sh[0] + 12, g.sh[1] + 50],
    [g.sh[0] - 2, -10], [g.sh[0] - 34, -8],
  ], '#5a2610');
  // near arm + sleeve
  fill(ctx, g.armN, '#4f2109');
  stroke(ctx, g.armN, 'rgba(8,3,1,0.8)', 2, true);
  // legs
  fill(ctx, g.legN, '#2a1206');
  // head: dark scarf, then the pale face in front of it
  fill(ctx, g.scarf, '#1e0c04');
  stroke(ctx, g.scarf, 'rgba(8,3,1,0.8)', 1.6, true);
  ctx.beginPath();
  ctx.ellipse(g.head[0] + 5, g.head[1] + 3, 14, 16, 0.08, 0, TAU);
  ctx.fillStyle = '#c08a58';
  ctx.fill();
  ctx.strokeStyle = 'rgba(14,5,1,0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // brow + mouth, carved
  ctx.strokeStyle = 'rgba(26,9,2,0.6)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(g.head[0] - 2, g.head[1] - 4);
  ctx.quadraticCurveTo(g.head[0] + 8, g.head[1] - 7, g.head[0] + 15, g.head[1] - 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(g.head[0] + 1, g.head[1] + 11);
  ctx.quadraticCurveTo(g.head[0] + 7, g.head[1] + 13, g.head[0] + 12, g.head[1] + 9);
  ctx.stroke();
  stroke(ctx, g.scarfTail, 'rgba(24,10,4,0.95)', 8);
  stroke(ctx, g.scarfTail, 'rgba(236,190,128,0.28)', 1.6);
  // basket strap over the shoulder
  ctx.strokeStyle = 'rgba(30,12,4,0.95)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(g.sh[0] - 6, g.sh[1] + 4);
  ctx.quadraticCurveTo(g.basketC[0] - 12, g.basketC[1] - 40, g.basketC[0] + 20, g.basketC[1] - 24);
  ctx.stroke();
  // openwork + edges
  openwork(ctx, g.robe, `old-${q.toFixed(1)}`, 36, 0.95);
  stroke(ctx, g.robe, 'rgba(248,204,142,0.4)', 1.4, true);
  // rivets
  rivet(ctx, g.shN[0], g.shN[1], 4.8);
  rivet(ctx, g.elbN[0], g.elbN[1], 4);
  rivet(ctx, g.handN[0], g.handN[1], 3.3);
  rivet(ctx, g.elbF[0], g.elbF[1], 3.6);
  rivet(ctx, g.hipN[0], g.hipN[1], 4.2);
  rivet(ctx, g.kneeN[0], g.kneeN[1], 3.8);
  rivet(ctx, g.ankN[0], g.ankN[1], 3.1);
  rivet(ctx, g.hipF[0], g.hipF[1], 3.8);
  rivet(ctx, g.kneeF[0], g.kneeF[1], 3.4);
  // eye cut
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(g.head[0] + 8, g.head[1] - 3, 2.6, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();
  OLD.key = key;
  OLD.g = g;
  return { canvas: OLD.canvas, g };
}

/* -------------------------------------------------------------- rods + hook */
function rod(ctx, x0, y0, x1, y1, opts = {}) {
  const w = opts.width ?? 5;
  const bow = opts.bow ?? 0;
  const mx = (x0 + x1) / 2 + bow, my = (y0 + y1) / 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(10,4,1,0.75)';
  ctx.lineWidth = w + 2.2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my, x1, y1);
  ctx.stroke();
  ctx.strokeStyle = opts.color || BAMBOO;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my, x1, y1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,226,180,0.42)';
  ctx.lineWidth = Math.max(0.9, w * 0.3);
  ctx.beginPath();
  ctx.moveTo(x0 - w * 0.24, y0);
  ctx.quadraticCurveTo(mx - w * 0.24, my, x1 - w * 0.24, y1);
  ctx.stroke();
}
function collar(ctx, x, y, r = 7, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = 'rgba(14,8,5,0.92)';
  ctx.fillRect(-r, -r * 0.58, r * 2, r * 1.16);
  ctx.fillStyle = 'rgba(140,148,146,0.9)';
  ctx.fillRect(-r, -r * 0.48, r * 2, r * 0.4);
  ctx.fillStyle = 'rgba(244,250,248,0.85)';
  ctx.fillRect(-r * 0.7, -r * 0.44, r * 0.9, 1.6);
  ctx.restore();
}
/** Control bar with hanging rods, in local puppet coordinates. */
function controlBar(ctx, cx, y, half, rods) {
  ctx.strokeStyle = 'rgba(10,4,1,0.7)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(cx - half, y + 2);
  ctx.quadraticCurveTo(cx, y - 4, cx + half, y + 2);
  ctx.stroke();
  ctx.strokeStyle = '#3d2310';
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(cx - half, y);
  ctx.quadraticCurveTo(cx, y - 5, cx + half, y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(246,208,152,0.5)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - half + 3, y - 2);
  ctx.quadraticCurveTo(cx, y - 6.6, cx + half - 3, y - 2);
  ctx.stroke();
  for (const r of rods) {
    collar(ctx, r[0], y + 1, 5.2, 0);
    rod(ctx, r[0], y + 4, r[2], r[3], { width: r[4] ?? 3.6, bow: r[5] ?? 0 });
  }
}

/** The abstract iron claw: bar + 3 prongs + a cold highlight. */
function drawHook(ctx, x, y, open, alpha) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const top = y - 640;
  // cast shadow on the screen
  ctx.strokeStyle = 'rgba(14,6,2,0.3)';
  ctx.lineWidth = 28;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 20, top);
  ctx.lineTo(x + 22, y - 26);
  ctx.stroke();
  // shaft
  const g = ctx.createLinearGradient(x - 11, 0, x + 13, 0);
  g.addColorStop(0, '#191410');
  g.addColorStop(0.4, '#080605');
  g.addColorStop(0.7, '#2c2a26');
  g.addColorStop(1, '#060403');
  ctx.strokeStyle = g;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, y - 22);
  ctx.stroke();
  // cold highlights
  ctx.strokeStyle = 'rgba(154,163,161,0.6)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x - 5.5, top);
  ctx.lineTo(x - 6, y - 32);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(232,240,238,0.36)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 7, top + 40);
  ctx.lineTo(x - 7.2, y - 90);
  ctx.stroke();
  // collar + knuckle
  collar(ctx, x, y - 36, 14, 0);
  ctx.fillStyle = '#0b0705';
  ctx.beginPath();
  ctx.ellipse(x, y - 12, 16, 12, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(172,182,180,0.55)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // three prongs, closing on the control bar
  for (let i = 0; i < 3; i++) {
    const spread = (1 - open) * 0.55;
    const a = lerp(-1.85 - spread, 1.85 + spread, i / 2) * 0.62;
    const len = 82;
    const ex = x + Math.sin(a) * len;
    const ey = y - 16 + Math.cos(a) * len * 0.6;
    ctx.strokeStyle = '#0a0705';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.quadraticCurveTo(x + Math.sin(a) * 34, y + 24, ex, ey + 24);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(152,162,160,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(a) * 9, y - 12);
    ctx.quadraticCurveTo(x + Math.sin(a) * 35, y + 20, ex, ey + 22);
    ctx.stroke();
    ctx.fillStyle = '#080504';
    ctx.beginPath();
    ctx.ellipse(ex, ey + 26, 5.5, 10, a * 0.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* --------------------------------------------------------------- rendering */
function drawScreenLight(ctx, u) {
  ctx.drawImage(screenTexture(), 0, 0, S.w, S.h);
  const flicker = 0.9 + 0.1 * Math.sin(u * 7.1) * Math.sin(u * 2.3 + 0.7);
  const lx = 830 + 24 * Math.sin(u * 0.55);
  const ly = 330 + 10 * Math.cos(u * 0.42);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(lx, ly, 20, lx, ly, 760);
  g.addColorStop(0, `rgba(255,228,170,${(0.2 * flicker).toFixed(4)})`);
  g.addColorStop(0.42, `rgba(255,196,112,${(0.08 * flicker).toFixed(4)})`);
  g.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S.w, S.h);
  const g2 = ctx.createRadialGradient(480, 690, 10, 480, 690, 460);
  g2.addColorStop(0, `rgba(225,132,52,${(0.15 * flicker).toFixed(4)})`);
  g2.addColorStop(1, 'rgba(225,132,52,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 240, S.w, S.h - 240);
  ctx.restore();
}

function drawDust(ctx, u) {
  const r = mulberry32(75921);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 120; i++) {
    const x0 = r() * S.w;
    const y0 = r() * S.h;
    const sp = 6 + r() * 14;
    const ph = r() * TAU;
    const size = 0.7 + Math.pow(r(), 2) * 2.6;
    const x = ((x0 + u * sp + Math.sin(u * 0.5 + ph) * 12) % (S.w + 40) + S.w + 40) % (S.w + 40) - 20;
    const y = ((y0 - u * sp * 0.35 + S.h + 20) % (S.h + 40));
    const a = (0.1 + r() * 0.32) * (0.55 + 0.45 * Math.sin(u * 1.3 + ph * 3));
    ctx.fillStyle = `rgba(255,226,172,${Math.max(0, a).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawSmoke(ctx, u) {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const baseX = 230 + i * 190;
    const rise = 300 + i * 24;
    ctx.beginPath();
    for (let k = 0; k <= 22; k++) {
      const t = k / 22;
      const x = baseX + Math.sin(t * 3.4 + u * 0.5 + i) * (18 + t * 60) + t * 90;
      const y = S.h - 60 - t * rise - ((u * 22) % 40);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(255,214,150,${(0.026 + i * 0.004).toFixed(3)})`;
    ctx.lineWidth = 8 + i * 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawGutter(ctx, u) {
  const gut = smoothstep(2.0, 2.05, u) * Math.exp(-Math.max(0, u - 2.05) * 2.4);
  if (gut <= 0.003) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, S.w, S.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(34,14,4,${(0.38 * gut).toFixed(3)})`;
  ctx.fillRect(0, 0, S.w, S.h);
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = `rgba(128,128,128,${(0.55 * gut).toFixed(3)})`;
  ctx.fillRect(0, 0, S.w, S.h);
  ctx.restore();
}

function drawDuFu(ctx, q, u, elder) {
  const walk = smoothstep(0, 6, u);
  const px = 880 - 78 * walk;
  const py = GROUND + 2;
  const scl = 0.9;
  const { canvas, pose } = dufuLayer(q, elder);
  // bar + rods in local space
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(scl, scl);
  const barLocal = -570;
  controlBar(ctx, 6, barLocal, 76, [
    [pose.arms.near.shoulder[0] - 4, barLocal, pose.arms.near.shoulder[0], pose.arms.near.shoulder[1], 3.8],
    [pose.head.c[0] - 16, barLocal, pose.head.c[0] - 12, pose.head.c[1] - 30, 3.2],
    [pose.arms.near.hand[0] + 22, barLocal, pose.arms.near.hand[0], pose.arms.near.hand[1], 2.8],
  ]);
  ctx.drawImage(canvas, -230, -390, 460, 460);
  ctx.restore();
  // metal collars where the rods meet the leather
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(scl, scl);
  collar(ctx, pose.arms.near.shoulder[0], pose.arms.near.shoulder[1] - 2, 5.4, 0);
  collar(ctx, pose.head.c[0] - 12, pose.head.c[1] - 32, 4.4, 0);
  ctx.restore();
}

function drawOldWoman(ctx, q) {
  const fold = smoothstep(2.1, 2.44, q);
  const pull = clamp01((q - 2.1) / 0.5);
  const lift = -900 * pull * pull * pull;
  const gone = q >= 2.6;
  const px = 566;
  const barLocalY = -420;
  const barY = GROUND + barLocalY;
  const ang = fold * 0.16 * Math.sin(fold * 2.6 + 0.4) + pull * 0.12;
  const openFold = Math.round(fold * 8) / 8;
  const { canvas, g } = oldWomanLayer(Math.min(q, 2.6), openFold);
  const scl = 1.0;

  if (!gone) {
    ctx.save();
    ctx.translate(px, barY + lift);
    ctx.rotate(ang);
    ctx.translate(-px, -barY);
    // control bar, rods, and the puppet all travel with the claw
    ctx.save();
    ctx.translate(px, GROUND);
    ctx.scale(scl, scl);
    controlBar(ctx, 2, barLocalY, 58, [
      [g.shN[0] - 6, barLocalY, g.shN[0], g.shN[1], 3.4],
      [g.handN[0] + 26, barLocalY, g.handN[0], g.handN[1], 2.6],
    ]);
    ctx.drawImage(canvas, -250, -390, 460, 460);
    ctx.restore();
    ctx.restore();
  }

  // the iron claw
  if (q >= 2.0) {
    const tip = barY + lift;
    const open = q >= 2.1 ? Math.max(0, 1 - (q - 2.1) * 6) : 1;
    drawHook(ctx, px + 2, tip, open, 1);
  }

  // the empty wire, quivering at 10 fps
  const wa = smoothstep(2.6, 2.72, q);
  if (wa > 0.01) {
    const t = Math.max(0, q - 2.6);
    const sw = 46 * Math.exp(-1.5 * t) * Math.sin(7.4 * t + 0.4);
    const sw2 = 32 * Math.exp(-1.1 * t) * Math.sin(5.9 * t + 2.1);
    ctx.save();
    ctx.globalAlpha = wa;
    rod(ctx, px + 2, 0, px + 2 + sw, 470, { width: 4.4, bow: sw * 0.16 });
    rod(ctx, px + 66, 0, px + 66 + sw2, 330, { width: 3, bow: -sw2 * 0.2, color: '#5a3a1c' });
    ctx.save();
    ctx.translate(px + 2 + sw, 472);
    ctx.rotate(sw * 0.006);
    ctx.strokeStyle = 'rgba(12,6,2,0.85)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0.5, 4.6);
    ctx.stroke();
    ctx.strokeStyle = METAL;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0.5, 4.6);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }
}

function drawPuppets(ctx, u, q, camX) {
  ctx.save();
  ctx.translate(-camX, 0);
  drawDuFu(ctx, q, u, u >= 4.0);
  drawOldWoman(ctx, q);
  ctx.restore();
}

function frameOverlay(ctx, u) {
  // warm spill from the screen onto the frame
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const flick = 0.86 + 0.14 * Math.sin(u * 6.2) * Math.sin(u * 1.7);
  const edge = (x, y, w, h, x0, y0, x1, y1) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, `rgba(240,168,84,${(0.18 * flick).toFixed(4)})`);
    g.addColorStop(1, 'rgba(240,168,84,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  };
  edge(S.x - 62, S.y, 62, S.h, S.x, 0, S.x - 62, 0);
  edge(S.x + S.w, S.y, 62, S.h, S.x + S.w, 0, S.x + S.w + 62, 0);
  edge(S.x, S.y - 62, S.w, 62, 0, S.y, 0, S.y - 62);
  edge(S.x, S.y + S.h, S.w, 62, 0, S.y + S.h, 0, S.y + S.h + 62);
  ctx.restore();
  // the leather's glowing edge
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,206,138,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(S.x + 1, S.y + 1, S.w - 2, S.h - 2);
  ctx.restore();
  // inner shadow so the content sits inside a deep box
  ctx.save();
  ctx.beginPath();
  ctx.rect(S.x, S.y, S.w, S.h);
  ctx.clip();
  const ig = ctx.createLinearGradient(0, S.y, 0, S.y + 110);
  ig.addColorStop(0, 'rgba(10,4,1,0.7)');
  ig.addColorStop(1, 'rgba(10,4,1,0)');
  ctx.fillStyle = ig;
  ctx.fillRect(S.x, S.y, S.w, 110);
  const ig2 = ctx.createLinearGradient(0, S.y + S.h, 0, S.y + S.h - 80);
  ig2.addColorStop(0, 'rgba(8,3,1,0.62)');
  ig2.addColorStop(1, 'rgba(8,3,1,0)');
  ctx.fillStyle = ig2;
  ctx.fillRect(S.x, S.y + S.h - 80, S.w, 80);
  const ig3 = ctx.createLinearGradient(S.x, 0, S.x + 90, 0);
  ig3.addColorStop(0, 'rgba(10,4,1,0.55)');
  ig3.addColorStop(1, 'rgba(10,4,1,0)');
  ctx.fillStyle = ig3;
  ctx.fillRect(S.x, S.y, 90, S.h);
  const ig4 = ctx.createLinearGradient(S.x + S.w, 0, S.x + S.w - 90, 0);
  ig4.addColorStop(0, 'rgba(10,4,1,0.55)');
  ig4.addColorStop(1, 'rgba(10,4,1,0)');
  ctx.fillStyle = ig4;
  ctx.fillRect(S.x + S.w - 90, S.y, 90, S.h);
  ctx.restore();
}

/* -------------------------------------------------------------------- type */
function plaque(ctx, x, y, w, h, text, size, alpha, opts = {}) {
  if (alpha <= 0.004) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const shape = [
    [x + 10, y], [x + w - 10, y], [x + w, y + 10],
    [x + w, y + h - 10], [x + w - 10, y + h], [x + 10, y + h], [x, y + h - 10], [x, y + 10],
  ];
  fill(ctx, shape, 'rgba(38,19,6,0.92)');
  stroke(ctx, shape, 'rgba(232,180,108,0.6)', 1.6, true);
  stroke(ctx, shape.map((p) => [p[0] + 3, p[1] + 3]), 'rgba(14,6,2,0.55)', 1, true);
  KIT.drawText(ctx, text, x + w / 2, y + h / 2 + 1, {
    size, font: KIT.FONT.display, weight: 600, color: opts.color || CREAM,
    align: 'center', letterSpacing: opts.letterSpacing ?? 2.4,
  });
  ctx.restore();
}

function leader(ctx, pts, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(232,190,126,0.55)';
  ctx.lineWidth = 1;
  poly(ctx, pts, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pts[pts.length - 1][0], pts[pts.length - 1][1], 2.4, 0, TAU);
  ctx.fillStyle = 'rgba(244,208,152,0.85)';
  ctx.fill();
  ctx.restore();
}

function drawPoem(ctx, u) {
  const a = smoothstep(2.72, 3.18, u);
  if (a <= 0.003) return;
  const size = 54, gap = 62;
  const cols = [{ t: '夜久语声绝', x: 1502 }, { t: '如闻泣幽咽', x: 1410 }];
  const y0 = 292;
  ctx.save();
  const halo = ctx.createRadialGradient(1456, 470, 20, 1456, 470, 400);
  halo.addColorStop(0, `rgba(22,8,2,${(0.42 * a).toFixed(3)})`);
  halo.addColorStop(0.62, `rgba(22,8,2,${(0.22 * a).toFixed(3)})`);
  halo.addColorStop(1, 'rgba(22,8,2,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(1220, 170, 480, 600);
  ctx.globalAlpha = a * 0.42;
  ctx.strokeStyle = 'rgba(244,212,154,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(1556, 250); ctx.lineTo(1556, 628); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1472, 626); ctx.lineTo(1382, 626); ctx.stroke();
  ctx.globalAlpha = 1;
  const rr = mulberry32(hash('s09poem', 759));
  ctx.font = `500 ${size}px ${KIT.FONT.display}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < cols.length; c++) {
    const chars = [...cols[c].t];
    for (let i = 0; i < chars.length; i++) {
      const st = 2.72 + i * 0.07 + c * 0.1;
      const ca = smoothstep(st, st + 0.34, u);
      if (ca <= 0.004) continue;
      const jx = (rr() - 0.5) * 3.4;
      const jy = (rr() - 0.5) * 3.4;
      const lift = (1 - ca) * 12;
      ctx.save();
      ctx.translate(cols[c].x + jx, y0 + i * gap + jy - lift);
      ctx.rotate((rr() - 0.5) * 0.03);
      ctx.globalAlpha = ca;
      ctx.fillStyle = 'rgba(20,7,2,0.62)';
      ctx.fillText(chars[i], 2, 3);
      ctx.fillStyle = 'rgba(250,222,168,1)';
      ctx.fillText(chars[i], 0, 0);
      ctx.globalAlpha = ca * 0.26;
      ctx.fillStyle = 'rgba(255,240,204,0.9)';
      ctx.fillText(chars[i], -0.8, -1);
      ctx.restore();
    }
  }
  const sa = smoothstep(3.4, 3.7, u);
  if (sa > 0.01) {
    ctx.globalAlpha = sa * 0.92;
    KIT.ink.sealStamp(ctx, 1370, 640, 46, '少陵', {
      seed: 759, color: '#8f2f1c', vertical: true, border: true, inset: 4.6, rotate: -0.015, alpha: 0.95,
    });
  }
  ctx.restore();
  markText('s09-poem', '夜久语声绝，如闻泣幽咽', 1378, 258, 184, 372, { size, align: 'center', color: '#f4d49a' });
}

function drawCaptions(ctx, u) {
  const p1 = smoothstep(0.2, 0.7, u) * (1 - smoothstep(4.2, 4.8, u));
  plaque(ctx, 236, 194, 244, 48, '石壕村 · 夜', 25, p1, { letterSpacing: 3 });
  const p2 = smoothstep(0.85, 1.25, u) * (1 - smoothstep(2.02, 2.2, u));
  if (p2 > 0.004) {
    leader(ctx, [[592, 722], [658, 762], [688, 804]], p2);
    plaque(ctx, 498, 690, 92, 38, '老妇', 24, p2, { letterSpacing: 2 });
  }
  const p3 = smoothstep(1.94, 2.08, u) * (1 - smoothstep(2.18, 2.34, u));
  if (p3 > 0.004) {
    leader(ctx, [[790, 364], [752, 400], [732, 430]], p3);
    plaque(ctx, 794, 330, 92, 38, '差吏', 24, p3, { letterSpacing: 2 });
  }
  const p4 = smoothstep(1.1, 1.6, u) * (1 - smoothstep(4.6, 5.1, u));
  if (p4 > 0.004) {
    ctx.save();
    ctx.globalAlpha = p4 * 0.7;
    KIT.drawText(ctx, '皮影 10 fps  ·  镜头 60 fps', 236, 986, {
      size: 13, font: KIT.FONT.mono, weight: 500, color: 'rgba(232,190,128,0.85)', letterSpacing: 2.2,
    });
    ctx.restore();
  }
}

/* -------------------------------------------------------------------- main */
export function renderAt(ctx, u, beat, env = {}) {
  const q = qAt(u);
  const camX = 62 * smoothstep(0, 6, u);
  const camY = 8 * smoothstep(0.4, 4.6, u);
  const zoom = 1 + 0.035 * smoothstep(0, 5.2, u);

  ctx.drawImage(woodLayer(), 0, 0);

  ctx.save();
  ctx.beginPath();
  ctx.rect(S.x, S.y, S.w, S.h);
  ctx.clip();
  ctx.translate(S.x, S.y);

  drawScreenLight(ctx, u);

  ctx.save();
  ctx.translate(S.w * 0.5, S.h * 0.62);
  ctx.scale(zoom, zoom);
  ctx.translate(-S.w * 0.5, -S.h * 0.62);

  ctx.save();
  ctx.translate(-camX * 0.2 - 150, -camY * 0.25);
  ctx.drawImage(farScenery(), 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(-camX * 0.72 - 100, -camY * 0.7);
  ctx.drawImage(nearScenery(), 0, 0);
  ctx.restore();

  ctx.translate(-camX * 0.14, -camY * 0.2);
  drawPuppets(ctx, u, q, camX * 0.9);
  ctx.restore();

  drawDust(ctx, u);
  drawSmoke(ctx, u);
  drawGutter(ctx, u);
  ctx.restore();

  frameOverlay(ctx, u);
  drawCaptions(ctx, u);
  drawPoem(ctx, u);

  const grain = KIT.layer('scene09:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 759, { amp: 0.12 }));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.22;
  ctx.drawImage(grain, 0, 0, W, H);
  ctx.restore();
  const v = ctx.createRadialGradient(960, 520, 380, 960, 540, 1180);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(3,1,0,0.6)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createRadialGradient(960, 1010, 40, 960, 1010, 620);
  lg.addColorStop(0, 'rgba(198,110,40,0.08)');
  lg.addColorStop(1, 'rgba(198,110,40,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(300, 720, 1320, 360);
  ctx.restore();

  void beat; void env;
}

export default { renderAt };
