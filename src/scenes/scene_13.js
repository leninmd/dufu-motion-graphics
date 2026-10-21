/**
 * 13 · 绿色荧光示波器 · 潭州绝笔 / 1960s Oscilloscope Vector CRT · 770
 *
 * The camera is inside a laboratory instrument. A round P7 phosphor tube in a
 * crinkle-paint chassis is the only light. The beam draws Du Fu's 4,739 km
 * altitude profile and a failing ECG; on the bar-2 downbeat an unseen hand turns
 * the wrong knob and the trace twists into a 3:2 Lissajous, whose threads become
 * the line 【1,455 首诗 · 没有一首是写给自己看的】. At the next beat the beam
 * snaps back into a boat and slides out of the tube, leaving afterglow.
 *
 * Techniques
 *   · Static instrument baked once with KIT.layer: chassis, moulded mask, chrome
 *     ring, graticule, screws, knobs, silkscreen, jewel lamp.
 *   · Beam: one polyline per pass (wide glow / tight glow / hot core) with
 *     'lighter'; phosphor persistence by re-evaluating the trace at u−δ, and a
 *     dwell dot where the sweep head is. Barrel lens distortion applied per point.
 *   · Trace morphing: ECG, Lissajous and boat-hull are all parametric arrays of
 *     the same length, so the "wrong knob" is a point-wise spring blend.
 *   · 60 Hz hum, 2 px scanlines, a rolling brighter band, green spill on bezel.
 */
import KIT from '../kit/index.js';
import {
  clamp, clamp01, lerp, smoothstep, easeOut, easeInOut, hash, unit, mulberry32, TAU,
} from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
const BLACK = '#010703';
const GREEN = '#00ff66';
const CORE = '#d6ffe4';
const DIM = '#1b6a3d';
const BEZEL = '#181a17';
const CHROME = '#8e9186';
const LAMP = '#ffb35c';

const TUBE = { x: 960, y: 566, r: 372 };
const GRID = { cell: 66, cols: 10, rows: 8 };
const N = 240;                       // samples per trace

const TEXT_LINE = '1,455 首诗 · 没有一首是写给自己看的';
const KNOB = { x: 1444, y: 336, r: 54 };

/* ------------------------------------------------------------------ helpers */
const gauss = (x, c, w) => Math.exp(-((x - c) / w) * ((x - c) / w));

/** Realistic PQRST complex, rate slowing through the era. */
function ecgShape(p) {
  return (
    0.10 * gauss(p, 0.16, 0.030)      // P
    - 0.07 * gauss(p, 0.268, 0.008)   // Q
    + 0.92 * gauss(p, 0.292, 0.010)   // R
    - 0.30 * gauss(p, 0.320, 0.011)   // S
    + 0.26 * gauss(p, 0.44, 0.055)    // T
    + 0.05 * gauss(p, 0.62, 0.030)    // U
  );
}

function ecgAt(x, u) {
  // x ∈ [−1, 1]; rate slides from 78 bpm to 41 bpm across the era
  const rate = lerp(1.42, 0.86, smoothstep(0.0, 4.2, u));
  const pos = (x * 0.5 + 0.5) * 3.2 * rate;
  const beat = pos - Math.floor(pos);
  const amp = lerp(1.0, 0.56, smoothstep(0.4, 4.0, u));
  return ecgShape(beat) * amp + 0.02 * Math.sin(u * 3.1);
}

function ridgeProfile(x, u) {
  const b = KIT.fbm1((x * 0.5 + 0.5) * 4.4 + 1.7, 4, 770);
  const c = KIT.noise2((x * 0.5 + 0.5) * 9.3, 1.1, 771);
  return (b - 0.5) * 1.05 + (c - 0.5) * 0.34 + 0.16 * Math.sin(x * 3.2 + u * 0.6);
}

function boatShape(x) {
  const a = Math.abs(x);
  return -0.34 + 0.62 * Math.pow(a, 1.5) - 0.05 * Math.sin(a * Math.PI);
}

/* -------------------------------------------------------------- the chassis */
let PANEL = null;
let SCAN = null;

function buildPanel() {
  if (PANEL) return PANEL;
  PANEL = KIT.layer('s13:panel', W, H, (ctx) => {
    // ---- ambient black room
    ctx.fillStyle = KIT.linear(ctx, 0, 0, 0, H, [
      [0, '#020604'], [0.5, '#010503'], [1, '#010302'],
    ]);
    ctx.fillRect(0, 0, W, H);
    // faint warm lamp spill from the top-right, a 1960s lab
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = KIT.radial(ctx, 1720, 60, 20, 1720, 60, 620, [
      [0, 'rgba(255,179,92,0.055)'], [0.5, 'rgba(255,170,90,0.018)'], [1, 'rgba(255,170,90,0)'],
    ]);
    ctx.fillRect(1100, 0, 820, 700);
    ctx.restore();

    // ---- chassis plate: full bleed, extends past the frame
    const X0 = -70, Y0 = 132, X1 = W + 70, Y1 = H + 120;
    const plate = KIT.linear(ctx, X0, Y0, X0, Y1, [
      [0, '#2b2e29'], [0.16, '#23261f'], [0.6, '#1b1e19'], [1, '#131511'],
    ]);
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 46);
    else ctx.rect(X0, Y0, X1 - X0, Y1 - Y0);
    ctx.fillStyle = plate;
    ctx.fill();
    ctx.clip();
    // crinkle paint: dense speckle + faint brushed streaks
    const r = mulberry32(7701);
    for (let i = 0; i < 26000; i++) {
      const x = X0 + r() * (X1 - X0);
      const y = Y0 + r() * (Y1 - Y0);
      const l = 22 + r() * 54;
      ctx.fillStyle = `rgba(${l},${l + 2},${l - 3},${0.05 + r() * 0.30})`;
      ctx.fillRect(x, y, 1 + (r() < 0.14 ? 1 : 0), 1);
    }
    for (let i = 0; i < 200; i++) {
      const y = Y0 + r() * (Y1 - Y0);
      ctx.strokeStyle = r() < 0.5 ? 'rgba(120,128,116,0.05)' : 'rgba(0,0,0,0.10)';
      ctx.lineWidth = 0.6 + r() * 1.4;
      ctx.beginPath();
      ctx.moveTo(X0, y);
      ctx.lineTo(X1, y + (r() - 0.5) * 3);
      ctx.stroke();
    }
    // soft top-left sheen on the paint
    const sheen = KIT.linear(ctx, X0, Y0, X1, Y0 + 420, [
      [0, 'rgba(190,200,186,0.055)'], [0.42, 'rgba(150,160,148,0.015)'], [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.fillStyle = sheen;
    ctx.fillRect(X0, Y0, X1 - X0, 520);
    // bottom shadow
    ctx.fillStyle = KIT.linear(ctx, 0, Y1 - 300, 0, Y1, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]);
    ctx.fillRect(X0, Y1 - 300, X1 - X0, 300);
    ctx.restore();

    // ---- moulded mask around the tube (a raised lip)
    ctx.save();
    ctx.beginPath();
    ctx.arc(TUBE.x, TUBE.y, TUBE.r + 78, 0, TAU);
    ctx.fillStyle = KIT.radial(ctx, TUBE.x, TUBE.y - 40, TUBE.r * 0.6, TUBE.x, TUBE.y, TUBE.r + 84, [
      [0, '#20231d'], [0.72, '#1a1c17'], [1, '#0e100d'],
    ]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,158,144,0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(TUBE.x, TUBE.y, TUBE.r + 76, -2.6, 0.5);
    ctx.stroke();
    ctx.restore();

    // ---- chrome ring
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const rr = TUBE.r + 8 + i * 1.35;
      const a = i / 26;
      ctx.strokeStyle = `rgba(${Math.round(96 + 74 * Math.sin(a * Math.PI))},${Math.round(100 + 76 * Math.sin(a * Math.PI))},${Math.round(92 + 66 * Math.sin(a * Math.PI))},${0.35 + 0.5 * Math.sin(a * Math.PI)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(TUBE.x, TUBE.y, rr, 0, TAU);
      ctx.stroke();
    }
    // chrome specular arcs: light comes from the top-left
    for (const [a0, a1, w, al] of [[-2.75, -1.55, 4, 0.55], [-1.3, -0.85, 2, 0.32], [0.5, 1.5, 2.4, 0.2], [2.4, 3.2, 1.6, 0.14]]) {
      ctx.strokeStyle = `rgba(226,232,220,${al})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(TUBE.x, TUBE.y, TUBE.r + 24, a0, a1);
      ctx.stroke();
    }
    ctx.restore();

    // ---- the glass / screen well
    ctx.save();
    ctx.beginPath();
    ctx.arc(TUBE.x, TUBE.y, TUBE.r, 0, TAU);
    ctx.clip();
    const well = KIT.radial(ctx, TUBE.x, TUBE.y - 60, 20, TUBE.x, TUBE.y, TUBE.r * 1.05, [
      [0, '#031209'], [0.42, '#020d07'], [0.78, '#010804'], [1, '#010402'],
    ]);
    ctx.fillStyle = well;
    ctx.fillRect(TUBE.x - TUBE.r, TUBE.y - TUBE.r, TUBE.r * 2, TUBE.r * 2);

    // graticule
    const cw = GRID.cell, gx0 = TUBE.x - cw * 4, gy0 = TUBE.y - cw * 4;
    ctx.strokeStyle = 'rgba(70,255,150,0.115)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(gx0 + i * cw, gy0); ctx.lineTo(gx0 + i * cw, gy0 + cw * 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx0, gy0 + i * cw); ctx.lineTo(gx0 + cw * 8, gy0 + i * cw); ctx.stroke();
    }
    // centre axes: dashed
    ctx.strokeStyle = 'rgba(90,255,164,0.30)';
    ctx.setLineDash([7, 6]);
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(gx0, TUBE.y); ctx.lineTo(gx0 + cw * 8, TUBE.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(TUBE.x, gy0); ctx.lineTo(TUBE.x, gy0 + cw * 8); ctx.stroke();
    ctx.setLineDash([]);
    // minor ticks along the axes
    ctx.strokeStyle = 'rgba(90,255,164,0.22)';
    for (let i = 0; i <= 40; i++) {
      const x = gx0 + (cw * 8 * i) / 40;
      const h = i % 5 === 0 ? 7 : 3.5;
      ctx.beginPath(); ctx.moveTo(x, TUBE.y - h); ctx.lineTo(x, TUBE.y + h); ctx.stroke();
      const y = gy0 + (cw * 8 * i) / 40;
      ctx.beginPath(); ctx.moveTo(TUBE.x - h, y); ctx.lineTo(TUBE.x + h, y); ctx.stroke();
    }
    // the graticule is printed on the inside of the glass: vignette + curvature
    ctx.fillStyle = KIT.radial(ctx, TUBE.x, TUBE.y, TUBE.r * 0.52, TUBE.x, TUBE.y, TUBE.r * 1.02, [
      [0, 'rgba(0,0,0,0)'], [0.72, 'rgba(0,8,3,0.32)'], [1, 'rgba(0,6,2,0.82)'],
    ]);
    ctx.fillRect(TUBE.x - TUBE.r, TUBE.y - TUBE.r, TUBE.r * 2, TUBE.r * 2);
    // scanlines, baked
    for (let y = TUBE.y - TUBE.r; y < TUBE.y + TUBE.r; y += 3) {
      ctx.fillStyle = 'rgba(0,10,4,0.30)';
      ctx.fillRect(TUBE.x - TUBE.r, y, TUBE.r * 2, 1);
    }
    // glass reflections: one broad soft sweep, one crisp rim crescent
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = KIT.linear(ctx, TUBE.x - TUBE.r, TUBE.y - TUBE.r, TUBE.x + TUBE.r * 0.4, TUBE.y + TUBE.r * 0.5, [
      [0, 'rgba(180,255,214,0.030)'], [0.35, 'rgba(180,255,214,0.010)'], [1, 'rgba(180,255,214,0)'],
    ]);
    ctx.beginPath(); ctx.arc(TUBE.x, TUBE.y, TUBE.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(190,255,220,0.18)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(TUBE.x, TUBE.y, TUBE.r - 30, -2.62, -1.32);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190,255,220,0.07)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(TUBE.x, TUBE.y, TUBE.r - 20, -2.5, -1.6);
    ctx.stroke();
    ctx.restore();
    // the tube rim's inner shadow
    ctx.strokeStyle = 'rgba(0,4,2,0.72)';
    ctx.lineWidth = 16;
    ctx.beginPath(); ctx.arc(TUBE.x, TUBE.y, TUBE.r - 8, 0, TAU); ctx.stroke();
    ctx.restore();

    // ---- screen readouts, printed on the mask (not on the beam)
    const ro = (txt, x, y, al = 0.42, size = 11) => {
      KIT.drawText(ctx, txt, x, y, { size, font: KIT.FONT.mono, weight: 500, color: `rgba(120,255,174,${al})`, letterSpacing: 1.4 });
    };
    ro('CH1 · 20ms/DIV', TUBE.x - 300, TUBE.y - 300);
    ro('4739 KM', TUBE.x + 236, TUBE.y - 300, 0.5);
    ro('59 YRS', TUBE.x + 250, TUBE.y + 296, 0.5);
    ro('TRIG 3:2', TUBE.x - 292, TUBE.y + 296, 0.34);
    ro('P7 PHOSPHOR', TUBE.x - 62, TUBE.y - 300, 0.3, 10);

    // ---- knob drums (the pointers are drawn live)
    const knob = (x, y, rad, ticks) => {
      ctx.save();
      const kg = KIT.radial(ctx, x - rad * 0.3, y - rad * 0.35, 2, x, y, rad * 1.05, [
        [0, '#3a3d36'], [0.55, '#262923'], [0.86, '#161814'], [1, '#0b0c0a'],
      ]);
      ctx.fillStyle = kg;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
      // knurled edge
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * TAU;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
        ctx.lineTo(x + Math.cos(a) * (rad - 3.5), y + Math.sin(a) * (rad - 3.5));
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(178,186,168,0.30)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, rad - 4.5, 0, TAU); ctx.stroke();
      // scale ticks around it
      for (let i = 0; i < ticks; i++) {
        const a = -2.4 + (i / (ticks - 1)) * 4.8;
        ctx.strokeStyle = 'rgba(190,200,182,0.34)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * (rad + 6), y + Math.sin(a) * (rad + 6));
        ctx.lineTo(x + Math.cos(a) * (rad + 13), y + Math.sin(a) * (rad + 13));
        ctx.stroke();
      }
      // recessed shadow under
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, rad + 1.5, 0.1, 3.1); ctx.stroke();
      ctx.restore();
    };
    knob(KNOB.x, KNOB.y, KNOB.r, 9);
    knob(330, 946, 40, 7);
    knob(452, 946, 30, 6);
    knob(1176, 1006, 44, 8);

    // toggles + lamp
    const toggle = (x, y, ang) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = '#0a0b09';
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(150,158,144,0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.stroke();
      ctx.rotate(ang);
      ctx.fillStyle = '#b8bdb0';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-3.4, -20, 6.8, 24, 3) : ctx.rect(-3.4, -20, 6.8, 24);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-1.2, -18, 1.4, 18);
      ctx.restore();
    };
    toggle(1444, 486, -0.45);
    toggle(1444, 566, 0.35);
    toggle(1444, 646, 0.1);

    // jewel lamp
    ctx.save();
    ctx.beginPath(); ctx.arc(1444, 736, 17, 0, TAU);
    ctx.fillStyle = '#2a1a0c'; ctx.fill();
    ctx.strokeStyle = 'rgba(212,196,168,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    const lg = KIT.radial(ctx, 1440, 731, 1, 1444, 736, 15, [
      [0, 'rgba(255,214,150,0.98)'], [0.45, 'rgba(255,160,74,0.85)'], [1, 'rgba(150,64,20,0.9)'],
    ]);
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(1444, 736, 13, 0, TAU); ctx.fill();
    ctx.restore();

    // ---- silkscreen on the chassis
    const silk = (txt, x, y, size, al, align = 'left') => {
      KIT.drawText(ctx, txt, x, y, {
        size, font: KIT.FONT.mono, weight: 500, color: `rgba(186,192,176,${al})`,
        letterSpacing: size > 12 ? 2.2 : 1.3, align,
      });
    };
    silk('OSCILLOSCOPE · TYPE 730-A', 300, 828, 13, 0.5);
    silk('SERIAL 04739 · AC 60 Hz', 300, 852, 9.5, 0.3);
    silk('P7 · 59 YRS', 300, 876, 9.5, 0.3);
    silk('GAIN', KNOB.x, KNOB.y - KNOB.r - 26, 10, 0.34, 'center');
    silk('TIME / DIV', 330, 1002, 9.5, 0.3, 'center');
    silk('FOCUS', 452, 1002, 9.5, 0.3, 'center');
    silk('INTENSITY', 1176, 1062, 9.5, 0.3, 'center');
    silk('TANZHOU · 770', 1620, 828, 12, 0.32, 'right');
    silk('CH1  CH2  EXT', 1444, 700, 9, 0.28, 'center');

    // ---- screws
    const screw = (x, y, ang) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = '#171914';
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(168,178,158,0.28)';
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(10,12,9,0.9)';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(196,204,186,0.18)';
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-6, -1.6); ctx.lineTo(6, -1.6); ctx.stroke();
      ctx.restore();
    };
    screw(126, 226, 0.5); screw(W - 126, 226, -0.3);
    screw(126, H - 96, -0.2); screw(W - 126, H - 96, 0.9);

    // ---- overall grain and a vignette that sells the black
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(KIT.grainLayer(640, 360, 7702, { amp: 0.4 }), 0, 0, W, H);
    ctx.restore();
    ctx.fillStyle = KIT.radial(ctx, W / 2, H / 2, H * 0.34, W / 2, H / 2, W * 0.74, [
      [0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)'],
    ]);
    ctx.fillRect(0, 0, W, H);
  });
  return PANEL;
}

function buildScan() {
  if (SCAN) return SCAN;
  SCAN = KIT.layer('s13:scan', 512, 512, (ctx, w, h) => {
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, y, w, 1);
    }
  });
  return SCAN;
}

/* ------------------------------------------------------------------- trace */
/** Barrel distortion: the beam bends with the glass. */
function lens(p) {
  const dx = p[0] - TUBE.x, dy = p[1] - TUBE.y;
  const d = Math.hypot(dx, dy) / TUBE.r;
  const k = 1 + 0.045 * d * d;
  return [TUBE.x + dx * k, TUBE.y + dy * k];
}

const TRACE = { w: 320, h: 200 };

function sampleEcg(u) {
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = -1 + 2 * t;
    pts.push([TUBE.x + x * TRACE.w, TUBE.y - ecgAt(x, u) * TRACE.h * 0.86]);
  }
  return pts;
}

function sampleLissajous(u, ph) {
  const pts = [];
  const A = TRACE.w * 0.94, B = TRACE.h * 0.9;
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * TAU + ph;
    pts.push([TUBE.x + A * Math.sin(3 * th + 0.4), TUBE.y + B * Math.sin(2 * th)]);
  }
  return pts;
}

function sampleBoat(u) {
  const pts = [];
  const bw = TRACE.w * 0.74, bh = TRACE.h * 1.12;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = -1 + 2 * t;
    pts.push([TUBE.x + x * bw, TUBE.y - boatShape(x) * bh]);
  }
  return pts;
}

/** Blend two equal-length traces. */
function mixTrace(a, b, p) {
  const out = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = [lerp(a[i][0], b[i][0], p), lerp(a[i][1], b[i][1], p)];
  }
  return out;
}

/** Box-smooth a trace's y values: the ECG loses its spikes as it is bent. */
function softenTrace(pts, k) {
  if (k < 1) return pts;
  const n = pts.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    let cnt = 0;
    for (let j = -k; j <= k; j++) {
      const q = pts[Math.max(0, Math.min(n - 1, i + j))];
      acc += q[1];
      cnt++;
    }
    out[i] = [pts[i][0], acc / cnt];
  }
  return out;
}

function traceAt(u) {
  const toBoat = smoothstep(3.98, 4.34, u);

  // ECG → Lissajous (spring, with a little overshoot on the way in)
  const inP = clamp01((u - 2.0) / 0.34);
  const ease = clamp01(easeOut(inP) + 0.06 * Math.sin(inP * Math.PI) * (1 - inP));
  const liss = sampleLissajous(u, 0.2 + (u - 2.0) * 0.55);
  // the sharper the bend, the softer the trace: a real beam cannot scribble
  const ecg = softenTrace(sampleEcg(u), Math.round(7 * ease));
  let trace = inP > 0 ? mixTrace(ecg, liss, ease) : ecg;

  // Lissajous → boat
  if (toBoat > 0) {
    const boat = sampleBoat(u);
    trace = mixTrace(trace, boat, easeOut(toBoat));
  }
  return trace;
}

/** Draw a polyline with the three beam passes. */
function beamPath(ctx, pts, opts) {
  const { glow, tight, core, alpha, width } = opts;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = lens(pts[i]);
    if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
  }
  ctx.globalAlpha = alpha * glow.a;
  ctx.strokeStyle = glow.c;
  ctx.lineWidth = width * glow.w;
  ctx.stroke();
  ctx.globalAlpha = alpha * tight.a;
  ctx.strokeStyle = tight.c;
  ctx.lineWidth = width * tight.w;
  ctx.stroke();
  ctx.globalAlpha = alpha * core.a;
  ctx.strokeStyle = core.c;
  ctx.lineWidth = width * core.w;
  ctx.stroke();
}

function drawScope(ctx, u) {
  const powerOn = smoothstep(0.04, 0.42, u);
  // ---- green spill on the chassis
  const energy = 0.5 + 0.5 * smoothstep(2.0, 2.5, u);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = KIT.radial(ctx, TUBE.x, TUBE.y, TUBE.r * 0.4, TUBE.x, TUBE.y, TUBE.r * 1.42, [
    [0, `rgba(0,255,102,${0.055 * powerOn})`],
    [0.4, `rgba(0,220,96,${0.020 * powerOn})`],
    [1, 'rgba(0,180,80,0)'],
  ]);
  ctx.fillRect(TUBE.x - 640, TUBE.y - 640, 1280, 1280);

  ctx.beginPath();
  ctx.arc(TUBE.x, TUBE.y, TUBE.r, 0, TAU);
  ctx.clip();
  // screen breathing / hum
  const hum = Math.sin(u * TAU * 60) * 0.4 + Math.sin(u * TAU * 13.7) * 0.6;
  ctx.fillStyle = `rgba(0,255,102,${(0.006 + 0.003 * hum) * powerOn})`;
  ctx.fillRect(TUBE.x - TUBE.r, TUBE.y - TUBE.r, TUBE.r * 2, TUBE.r * 2);

  // sweep line (a faint raster) that also keeps the tube alive
  const sweepY = TUBE.y - TUBE.r + ((u * 210) % (TUBE.r * 2));
  ctx.fillStyle = 'rgba(120,255,170,0.035)';
  ctx.fillRect(TUBE.x - TUBE.r, sweepY, TUBE.r * 2, 1.4);
  ctx.restore();

  // ---- the beam
  ctx.save();
  ctx.beginPath();
  ctx.arc(TUBE.x, TUBE.y, TUBE.r - 6, 0, TAU);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const glow = { c: 'rgba(0,255,102,0.30)', a: 1, w: 9.5 };
  const tight = { c: 'rgba(70,255,140,0.55)', a: 1, w: 3.4 };
  const core = { c: 'rgba(214,255,228,0.98)', a: 1, w: 1.35 };

  const trace = traceAt(u);
  const away = smoothstep(4.55, 5.9, u);
  const slideX = away * 1180;

  // phosphor persistence: earlier poses, dimmer
  for (let k = 4; k >= 1; k--) {
    const du = k * 0.045;
    const old = traceAt(Math.max(0, u - du));
    const a = Math.pow(1 - k / 5, 2.1) * 0.42;
    ctx.save();
    ctx.translate(slideX, 0);
    beamPath(ctx, old, { glow, tight, core, alpha: a * 0.5 * powerOn, width: 1.0 });
    ctx.restore();
  }

  // power-on: the trace arrives from a single line
  const openY = lerp(TUBE.y, 0, 1 - powerOn);
  ctx.save();
  ctx.translate(slideX, openY);
  beamPath(ctx, trace, {
    glow, tight, core, alpha: powerOn * (1 - 0.55 * away), width: 1,
  });
  // dwell dot at the sweep head, plus the second small trace
  const head = lens(trace[trace.length - 1]);
  ctx.globalAlpha = powerOn * 0.85 * (1 - away);
  ctx.fillStyle = 'rgba(230,255,238,0.9)';
  ctx.beginPath();
  ctx.arc(head[0], head[1], 3.4 + Math.sin(u * 24) * 0.7, 0, TAU);
  ctx.fill();
  ctx.restore();

  // ---- the altitude profile, a second, older channel
  const profA = (1 - smoothstep(1.9, 2.3, u)) * powerOn * 0.5;
  if (profA > 0.01) {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const x = -1 + 2 * t;
      pts.push([TUBE.x + x * TRACE.w * 1.0, TUBE.y + 26 - ridgeProfile(x, u) * TRACE.h * 1.05]);
    }
    ctx.save();
    ctx.translate(slideX * 0.4, 0);
    beamPath(ctx, pts, {
      glow: { c: 'rgba(0,255,102,0.16)', a: 1, w: 6 },
      tight: { c: 'rgba(60,230,120,0.28)', a: 1, w: 2.2 },
      core: { c: 'rgba(180,255,206,0.62)', a: 1, w: 0.9 },
      alpha: profA, width: 1,
    });
    ctx.restore();
  }

  // ---- the returning boat: canopy, mast and waterline, drawn by the beam
  const boatA = smoothstep(4.04, 4.44, u);
  if (boatA > 0.01) {
    const bw = TRACE.w * 0.74, bh = TRACE.h * 1.12;
    // a low woven canopy, drawn on two struts above the hull
    const canopy = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = -0.52 + 1.04 * t;
      canopy.push([
        TUBE.x + x * bw,
        TUBE.y - (boatShape(x) + 0.42 * Math.pow(Math.cos((x / 0.56) * Math.PI * 0.5), 0.8)) * bh,
      ]);
    }
    const struts = [];
    for (const sx of [-0.46, 0.46]) {
      struts.push([TUBE.x + sx * bw, TUBE.y - boatShape(sx) * bh]);
      struts.push([TUBE.x + sx * bw, TUBE.y - (boatShape(sx) + 0.42 * Math.pow(Math.cos((sx / 0.56) * Math.PI * 0.5), 0.8)) * bh]);
    }
    const crew = [
      [TUBE.x - 0.22 * bw, TUBE.y - (boatShape(-0.22) + 0.10) * bh],
      [TUBE.x - 0.22 * bw, TUBE.y - (boatShape(-0.22) + 0.24) * bh],
      [TUBE.x - 0.17 * bw, TUBE.y - (boatShape(-0.17) + 0.26) * bh],
      [TUBE.x - 0.27 * bw, TUBE.y - (boatShape(-0.27) + 0.26) * bh],
    ];
    const mast = [
      [TUBE.x + 0.0 * bw, TUBE.y - boatShape(0) * bh],
      [TUBE.x + 0.0 * bw, TUBE.y - (boatShape(0) + 0.28) * bh],
    ];
    ctx.save();
    ctx.translate(slideX, 0);
    beamPath(ctx, canopy, {
      glow: { c: 'rgba(0,255,102,0.22)', a: 1, w: 6 },
      tight: { c: 'rgba(80,255,145,0.38)', a: 1, w: 2.4 },
      core: { c: 'rgba(205,255,222,0.8)', a: 1, w: 1.0 },
      alpha: boatA, width: 1,
    });
    beamPath(ctx, struts, {
      glow: { c: 'rgba(0,255,102,0.14)', a: 1, w: 5 },
      tight: { c: 'rgba(80,255,145,0.26)', a: 1, w: 1.8 },
      core: { c: 'rgba(205,255,222,0.55)', a: 1, w: 0.9 },
      alpha: boatA * 0.8, width: 1,
    });
    beamPath(ctx, crew, {
      glow: { c: 'rgba(0,255,102,0.10)', a: 1, w: 4 },
      tight: { c: 'rgba(80,255,145,0.20)', a: 1, w: 1.4 },
      core: { c: 'rgba(200,255,220,0.45)', a: 1, w: 0.85 },
      alpha: boatA * 0.8, width: 1,
    });
    beamPath(ctx, mast, {
      glow: { c: 'rgba(0,255,102,0.07)', a: 1, w: 4 },
      tight: { c: 'rgba(80,255,145,0.12)', a: 1, w: 1.2 },
      core: { c: 'rgba(180,255,206,0.28)', a: 1, w: 0.8 },
      alpha: boatA * 0.6, width: 1,
    });
    ctx.restore();
  }

  // ---- the boat glyph, drawn by the beam at both ends of the era
  const glyphA = smoothstep(0.5, 1.1, u) * (1 - smoothstep(1.8, 2.16, u));
  if (glyphA > 0.01) {
    const bx = TUBE.x + 180 + slideX * 0.8;
    const by = TUBE.y - 150;
    const hull = [];
    for (let i = 0; i <= 26; i++) {
      const t = i / 26;
      const x = -1 + 2 * t;
      hull.push([bx + x * 82, by + 12 - boatShape(x) * 26 * 0.9]);
    }
    const canopy = [];
    for (let i = 0; i <= 22; i++) {
      const t = i / 22;
      const x = -0.6 + 1.2 * t;
      canopy.push([bx + x * 82, by + 12 - (boatShape(x) + 0.30 * Math.exp(-Math.pow((x - 0.02) / 0.40, 2))) * 26 * 0.9]);
    }
    const man = [[bx - 2, by - 6], [bx - 2, by - 22], [bx + 5, by - 24]];
    ctx.save();
    ctx.globalAlpha = glyphA * powerOn * 0.92;
    beamPath(ctx, hull, {
      glow: { c: 'rgba(0,255,102,0.2)', a: 1, w: 6 },
      tight: { c: 'rgba(90,255,150,0.34)', a: 1, w: 2.2 },
      core: { c: 'rgba(200,255,218,0.7)', a: 1, w: 0.95 },
      alpha: 1, width: 1,
    });
    beamPath(ctx, canopy, {
      glow: { c: 'rgba(0,255,102,0.16)', a: 1, w: 5 },
      tight: { c: 'rgba(90,255,150,0.3)', a: 1, w: 1.8 },
      core: { c: 'rgba(200,255,218,0.6)', a: 1, w: 0.85 },
      alpha: 1, width: 1,
    });
    beamPath(ctx, man, {
      glow: { c: 'rgba(0,255,102,0.10)', a: 1, w: 4 },
      tight: { c: 'rgba(90,255,150,0.22)', a: 1, w: 1.4 },
      core: { c: 'rgba(200,255,218,0.5)', a: 1, w: 0.8 },
      alpha: 1, width: 1,
    });
    ctx.restore();
  }
  ctx.restore();

  // ---- the knob click: a spark at the exact downbeat
  if (u > 1.96 && u < 2.3) {
    const p = clamp01((u - 1.96) / 0.34);
    const a = Math.pow(1 - p, 2.2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(KNOB.x + 26, KNOB.y - 26);
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * TAU + 0.3;
      const len = 10 + 46 * p + unit(770, i) * 26;
      ctx.strokeStyle = `rgba(200,255,220,${a * (0.5 + unit(770, i, 2) * 0.5)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * 6, Math.sin(ang) * 6);
      ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(235,255,242,${a})`;
    ctx.beginPath(); ctx.arc(0, 0, 5 + 10 * p, 0, TAU); ctx.fill();
    ctx.restore();
    // and a shock ring on the glass
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(120,255,170,${a * 0.30})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(TUBE.x, TUBE.y, TUBE.r * (0.25 + p * 0.7), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // ---- rolling band + scanlines over the beam
  ctx.save();
  ctx.beginPath();
  ctx.arc(TUBE.x, TUBE.y, TUBE.r, 0, TAU);
  ctx.clip();
  const bandY = TUBE.y - TUBE.r + (((u * 0.42) % 1) * TUBE.r * 2.2) - TUBE.r * 0.1;
  ctx.fillStyle = KIT.linear(ctx, 0, bandY - 90, 0, bandY + 90, [
    [0, 'rgba(90,255,150,0)'], [0.5, `rgba(90,255,150,${0.045 * powerOn})`], [1, 'rgba(90,255,150,0)'],
  ]);
  ctx.fillRect(TUBE.x - TUBE.r, bandY - 90, TUBE.r * 2, 180);
  ctx.globalAlpha = 0.42;
  ctx.drawImage(buildScan(), TUBE.x - TUBE.r, TUBE.y - TUBE.r, TUBE.r * 2, TUBE.r * 2);
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* --------------------------------------------------------------- the line */
function drawKeyLine(ctx, u) {
  const inP = smoothstep(2.74, 3.16, u) * (1 - smoothstep(3.84, 4.18, u));
  if (inP <= 0.004) return;
  const y = TUBE.y + 6;
  ctx.save();
  ctx.beginPath();
  ctx.arc(TUBE.x, TUBE.y, TUBE.r - 10, 0, TAU);
  ctx.clip();
  // threads: the Lissajous filaments condense into the line
  const wires = 9;
  for (let i = 0; i < wires; i++) {
    const p = Math.max(0, Math.min(1, (inP - i * 0.02) / 0.6));
    const yy = lerp(TUBE.y + Math.sin(i * 1.7) * 150, y, easeOut(p));
    const sag = (1 - p) * 60;
    ctx.strokeStyle = `rgba(60,255,130,${0.10 + 0.16 * (1 - p)})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(TUBE.x - 300, yy + Math.sin(i) * 30);
    ctx.bezierCurveTo(TUBE.x - 120, yy - sag, TUBE.x + 120, yy + sag, TUBE.x + 300, yy - Math.sin(i * 2) * 24);
    ctx.stroke();
  }
  // halo under the type
  const glowA = inP * 0.5;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = KIT.radial(ctx, TUBE.x, y, 10, TUBE.x, y, 420, [
    [0, `rgba(0,255,102,${0.10 * glowA})`], [1, 'rgba(0,255,102,0)'],
  ]);
  ctx.fillRect(TUBE.x - 460, y - 120, 920, 240);
  ctx.globalCompositeOperation = 'source-over';
  KIT.neonText(ctx, TEXT_LINE, TUBE.x, y, {
    size: 34, font: KIT.FONT.mono, weight: 500, color: GREEN, core: CORE,
    align: 'center', letterSpacing: 2, glow: 26, alpha: inP,
    mark: 's13-readout',
  });
  KIT.drawText(ctx, '1,455 POEMS  ·  NONE WRITTEN FOR HIMSELF', TUBE.x, y + 48, {
    size: 12, font: KIT.FONT.mono, weight: 500, color: `rgba(130,255,180,${0.5 * inP})`,
    align: 'center', letterSpacing: 3.2,
  });
  ctx.restore();
}

/* ---------------------------------------------------------------- the hand */
function drawHand(ctx, u) {
  const inP = smoothstep(1.80, 2.04, u) * (1 - smoothstep(2.34, 2.66, u));
  if (inP <= 0.004) return;
  const turn = smoothstep(1.98, 2.24, u);
  const enter = easeOut(clamp01((u - 1.80) / 0.26));
  const cx = KNOB.x, cy = KNOB.y;
  const wristX = lerp(W + 260, cx + 150, enter);
  const wristY = lerp(cy - 30, cy - 6, enter);

  ctx.save();
  ctx.globalAlpha = inP;

  // forearm: a tapered band, sleeve dark, on the same light as the room
  ctx.save();
  ctx.translate(wristX, wristY);
  ctx.rotate(-0.16 + 0.05 * turn);
  ctx.fillStyle = '#23271f';
  ctx.beginPath();
  ctx.moveTo(26, -48);
  ctx.lineTo(520, -70);
  ctx.lineTo(520, 92);
  ctx.lineTo(30, 52);
  ctx.closePath();
  ctx.fill();
  // sleeve fold + rim from the tube
  ctx.strokeStyle = 'rgba(120,150,124,0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(90, -52);
  ctx.quadraticCurveTo(300, -58, 500, -68);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(60,255,130,0.16)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(28, 50);
  ctx.quadraticCurveTo(260, 66, 520, 90);
  ctx.stroke();
  // white cuff
  ctx.fillStyle = '#c2c6b8';
  ctx.beginPath();
  ctx.moveTo(10, -52); ctx.lineTo(72, -54); ctx.lineTo(78, 56); ctx.lineTo(14, 52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(10,24,14,0.26)';
  ctx.beginPath();
  ctx.moveTo(12, 28); ctx.lineTo(76, 30); ctx.lineTo(78, 56); ctx.lineTo(14, 52);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,40,28,0.35)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(56, -53); ctx.lineTo(60, 54); ctx.stroke();
  ctx.restore();

  // hand: palm + three fingers curling over the knob
  ctx.save();
  ctx.translate(wristX - 34, wristY + 6);
  ctx.fillStyle = '#3c4238';
  ctx.beginPath();
  ctx.ellipse(0, 0, 74, 46, -0.14, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#464d40';
  const finger = (x0, y0, x1, y1, w) => {
    const a = Math.atan2(y1 - y0, x1 - x0);
    const len = Math.hypot(x1 - x0, y1 - y0);
    ctx.save();
    ctx.translate(x0, y0);
    ctx.rotate(a);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, -w / 2, len, w, w / 2);
    else ctx.rect(0, -w / 2, len, w);
    ctx.fill();
    ctx.restore();
  };
  finger(-40, -24, -128, -30, 26);
  finger(-46, -2, -136, -4, 27);
  finger(-44, 22, -122, 26, 25);
  // thumb, on the near side of the knob
  finger(-10, 34, -66, 56, 30);
  // rim light along the fingers and the back of the hand
  ctx.strokeStyle = 'rgba(90,255,150,0.22)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-134, -34);
  ctx.quadraticCurveTo(-96, -44, -54, -36);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,255,150,0.13)';
  ctx.beginPath();
  ctx.moveTo(-136, 2);
  ctx.quadraticCurveTo(-92, -4, -50, 0);
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // the pointer turns under the fingers
  const ang = -0.62 + turn * 1.25;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = '#dfe6d6';
  ctx.fillRect(-2.2, -KNOB.r + 8, 4.4, 22);
  ctx.fillStyle = 'rgba(220,228,210,0.55)';
  ctx.fillRect(-1, -KNOB.r + 30, 2, 10);
  ctx.restore();
}

/* --------------------------------------------------------------- ambience */
function drawAmbientHaze(ctx, u) {
  const p = smoothstep(2.0, 2.6, u);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // the tube lights the room
  ctx.fillStyle = KIT.radial(ctx, TUBE.x, TUBE.y, TUBE.r * 0.8, TUBE.x, TUBE.y, W * 0.62, [
    [0, `rgba(0,255,102,${0.014 + 0.007 * p})`],
    [0.5, `rgba(0,200,80,${0.006 + 0.003 * p})`],
    [1, 'rgba(0,160,64,0)'],
  ]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // 60 Hz hum: a 1px horizontal jitter of the whole picture, extremely subtle
  const j = Math.sin(u * TAU * 60) * 0.4;
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = 'rgba(180,255,210,0.5)';
  ctx.fillRect(TUBE.x - TUBE.r, TUBE.y + j, TUBE.r * 2, 1);
  ctx.restore();
}

/* --------------------------------------------------------------- render */
export function renderAt(ctx, u, beat, env = {}) {
  const panel = buildPanel();
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(panel, 0, 0);
  drawScope(ctx, u);
  drawKeyLine(ctx, u);
  drawHand(ctx, u);
  drawAmbientHaze(ctx, u);
  // a thin film of dust on the glass, drawn last so it sits in front
  ctx.save();
  ctx.beginPath();
  ctx.arc(TUBE.x, TUBE.y, TUBE.r, 0, TAU);
  ctx.clip();
  ctx.globalAlpha = 0.10;
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(KIT.layer('s13:dust', 384, 384, (c, w, h) => {
    const r = mulberry32(7703);
    for (let i = 0; i < 260; i++) {
      const x = r() * w, y = r() * h;
      c.fillStyle = `rgba(200,255,220,${0.06 + r() * 0.3})`;
      c.beginPath(); c.arc(x, y, 0.4 + r() * 1.4, 0, TAU); c.fill();
    }
  }), TUBE.x - TUBE.r, TUBE.y - TUBE.r, TUBE.r * 2, TUBE.r * 2);
  ctx.restore();
  // frame vignette
  ctx.save();
  ctx.fillStyle = KIT.radial(ctx, W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.72, [
    [0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)'],
  ]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.restore();
  markText('s13-caption', '绿色荧光示波器 · 潭州绝笔', 60, 60, 360, 40, { size: 18 });
  void beat; void env;
}

export default { renderAt };



