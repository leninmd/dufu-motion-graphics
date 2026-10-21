/**
 * film.js — the frame compositor.
 *
 * A single call to render(t) paints the entire film:
 *   intro / era / outro → 5–7 small transition grammars → era card → HUD.
 *
 * Every crossing lands on a bar line at 6, 12, … 114 s. A 0.64 s overlap
 * renders both sides live (the outgoing at its last frame, the incoming at its
 * first), then a material-specific mask carries the eye across the frame.
 */
import KIT from '../kit/index.js';
import {
  clamp, clamp01, lerp, smoothstep, smootherstep, easeInOut, easeInOutCubic,
  hash, mulberry32, TAU,
} from '../kit/math.js';
import { beginFrame, setSceneInfo, snapshot, noteError } from '../kit/debug.js';
import {
  FPS, VIEW_W, VIEW_H, SCENE_DUR, N_SCENES, INTRO, OUTRO_START, DURATION,
  sectionAt, sceneStart, distanceAt, beatInfo, DISTANCE_ANCHORS,
} from '../beat/clock.js';
import { drawEraCard, drawHud } from '../kit/hud.js';
import { renderIntro } from './intro.js';
import { renderOutro } from './outro.js';

const W = VIEW_W, H = VIEW_H;
const TRANSITION_HALF = 0.32;
const BOUNDARIES = Array.from({ length: N_SCENES + 1 }, (_, i) => INTRO + i * SCENE_DUR); // 6..114

function newBuffer(w = W, h = H) {
  const c = KIT.makeCanvas(w, h);
  return { canvas: c, ctx: c.getContext('2d', { alpha: false }) };
}

function findBoundary(t) {
  for (const b of BOUNDARIES) {
    if (t >= b - TRANSITION_HALF && t <= b + TRANSITION_HALF) return b;
  }
  return null;
}

export class Film {
  constructor({ canvas, scenes, specs }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.scenes = scenes;
    this.specs = specs;
    this.bufA = newBuffer();
    this.bufB = newBuffer();
    this.tiles = [];
    this.tilesReady = false;
    this.tileErrors = [];
    this.lastError = null;
    this.lastMs = 0;
    this.warming = null;
    this.renderCount = 0;
    this._lastSection = -99;
  }

  /** Async work needed before drawing t (currently only the outro tiles). */
  async prepare(t) {
    if (t >= OUTRO_START - 1.4 && !this.tilesReady) {
      if (!this.warming) this.warming = this.buildTiles();
      await this.warming;
    }
  }

  /** Start the gallerist's contact prints in the background. */
  warmTiles() {
    if (this.tilesReady) return Promise.resolve();
    if (!this.warming) this.warming = this.buildTiles();
    return this.warming;
  }

  async buildTiles() {
    if (this.tilesReady) return;
    const tw = 640, th = 360;
    this.tiles = [];
    const errors = [];
    for (let i = 0; i < N_SCENES; i++) {
      const spec = this.specs[i];
      const scene = this.scenes[i];
      const canvas = KIT.makeCanvas(tw, th);
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#070706';
      ctx.fillRect(0, 0, tw, th);
      ctx.save();
      ctx.scale(tw / W, th / H);
      const u = spec.freezeU ?? 2.6;
      const beat = beatInfo(sceneStart(i) + u);
      try {
        scene.renderAt(ctx, u, beat, { spec, sceneIndex: i, tile: true, width: W, height: H, kit: KIT });
      } catch (e) {
        errors.push(`${spec.no}: ${e.message}`);
        console.error('[tile]', spec.no, e);
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, spec.palette[0]); g.addColorStop(1, spec.palette[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
      this.tiles.push(canvas);
      if (i % 3 === 2) await new Promise((r) => setTimeout(r, 0));
    }
    this.tileErrors = errors;
    this.tilesReady = true;
    console.info('[film] era contact prints ready', `${this.tiles.length} tiles`, errors.length ? errors : '');
  }

  renderSectionBuffer(buf, section, t) {
    const ctx = buf.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
    ctx.clearRect(0, 0, W, H);
    try {
      if (section < 0) {
        renderIntro(ctx, clamp(t, 0, INTRO), { t, W, H, kit: KIT });
      } else if (section >= N_SCENES) {
        renderOutro(ctx, t, { tiles: this.tiles, specs: this.specs, W, H, kit: KIT });
      } else {
        const spec = this.specs[section];
        const scene = this.scenes[section];
        const u = clamp(t - sceneStart(section), 0, SCENE_DUR);
        const beat = beatInfo(sceneStart(section) + u);
        scene.renderAt(ctx, u, beat, { spec, sceneIndex: section, t, width: W, height: H, kit: KIT });
        // every era is responsible for a full-bleed ground; this guards against
        // an alpha hole at the frame edge without hiding an error.
        if (ctx.globalAlpha !== 1) ctx.globalAlpha = 1;
      }
    } catch (e) {
      this.lastError = `${section}: ${e && (e.stack || e.message) || e}`;
      console.error('[film] render error', this.lastError);
      noteError(e);
      this.drawError(ctx, section, e);
    }
  }

  drawError(ctx, section, e) {
    ctx.save();
    ctx.fillStyle = '#120f0b';
    ctx.fillRect(0, 0, W, H);
    KIT.drawText(ctx, 'FRAME ERROR', 84, 220, { size: 26, font: KIT.FONT.mono, color: '#d34', letterSpacing: 2 });
    KIT.drawText(ctx, `section ${section}`, 84, 280, { size: 54, font: KIT.FONT.display, color: '#f1e6d0' });
    KIT.drawText(ctx, String(e && e.message || e).slice(0, 160), 84, 360, { size: 20, font: KIT.FONT.mono, color: 'rgba(240,230,210,0.6)', maxWidth: 1500 });
    ctx.restore();
  }

  camera(section, u) {
    let zoom = 1, dx = 0, dy = 0;
    if (section < 0) {
      // intro: a slow breath toward the seal, then a physical jolt on the stamp
      zoom = 1 + smoothstep(0, INTRO, u) * 0.012;
      if (u >= 3.96 && u < 4.5) {
        const s = Math.exp(-(u - 3.96) / 0.11);
        dx = Math.sin((u - 3.96) * 97) * 9 * s;
        dy = Math.cos((u - 3.96) * 71) * 6 * s;
      }
    } else if (section < N_SCENES) {
      const p = clamp01(u / 2);
      zoom = 1 + 0.06 * Math.sin(Math.PI * p);
      zoom += 0.02 * smoothstep(5.35, 6, u);
    }
    return { zoom, dx, dy };
  }

  drawBufferWithCamera(ctx, buf, cam, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2 + cam.dx, H / 2 + cam.dy);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.drawImage(buf.canvas, -W / 2, -H / 2);
    ctx.restore();
  }

  /* ------------------------------------------------------------ transitions */
  transitionStyle(fromSection, toSection) {
    if (toSection >= N_SCENES) return 'pullback';
    if (fromSection < 0) return 'seal';
    return this.specs[toSection]?.transition || 'cut';
  }

  composeTransition(ctx, A, B, p, style, accent) {
    const q = clamp01(p);
    ctx.save();
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
    const drawA = () => ctx.drawImage(A.canvas, 0, 0);
    const drawB = () => ctx.drawImage(B.canvas, 0, 0);
    const clipReveal = (pathFn, extra = null) => {
      drawA();
      ctx.save();
      pathFn();
      ctx.clip();
      drawB();
      ctx.restore();
      if (extra) extra();
    };
    const kind = ({
      seal: 'radial', stamp: 'radial', orbit: 'zoom', zoom: 'zoom', compile: 'compile',
      ink: 'ink', wind: 'ink', water: 'ink', ledger: 'slats', construct: 'diagonal',
      cut: 'glitch', scan: 'scan', pixel: 'pixel', window: 'window', vertical: 'vertical',
      crt: 'crt', shadow: 'radial', gate: 'doors', pullback: 'zoom',
    })[style] || 'glitch';

    if (kind === 'crt') {
      // power-down to a line, then the new era's raster expands from it
      ctx.fillStyle = '#020403'; ctx.fillRect(0, 0, W, H);
      if (q < 0.46) {
        const s = 1 - (q / 0.46) * 0.985;
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.scale(1 + (1 - s) * 0.06, s);
        ctx.drawImage(A.canvas, -W / 2, -H / 2);
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(0,255,102,${0.6 * (1 - q / 0.46) + 0.25})`;
        ctx.fillRect(0, H / 2 - 1.2, W, 2.4);
        ctx.restore();
      } else {
        const s = ((q - 0.46) / 0.54) * 1.02;
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.scale(1 + (1 - s) * 0.3, s);
        ctx.drawImage(B.canvas, -W / 2, -H / 2);
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(0,255,102,${0.55 * (1 - (q - 0.46) / 0.54)})`;
        ctx.fillRect(0, H / 2 - 1.5, W, 3);
        ctx.restore();
      }
      // scanlines and chroma bloom
      ctx.save();
      ctx.globalAlpha = 0.18;
      for (let y = 0; y < H; y += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, y, W, 1);
      }
      ctx.restore();
    } else if (kind === 'radial') {
      const maxR = Math.hypot(W, H) * 0.56;
      const r = maxR * q;
      drawA();
      ctx.save();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, TAU); ctx.clip();
      drawB();
      ctx.restore();
      // material ring
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = KIT.rgba(accent, 0.55 * (1 - q));
      ctx.lineWidth = 3 + (1 - q) * 8;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, r + 2, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(20,15,10,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, r * 0.96, 0, TAU); ctx.stroke();
      ctx.restore();
      if (style === 'stamp' || style === 'shadow') {
        // a vermilion square leaning out of the screen
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(-0.02 + q * 0.02);
        ctx.strokeStyle = KIT.rgba(accent, 0.35 * (1 - q));
        ctx.lineWidth = 5;
        const s = 100 + q * 230;
        ctx.strokeRect(-s, -s * 0.66, s * 2, s * 1.32);
        ctx.restore();
      }
    } else if (kind === 'ink') {
      drawA();
      ctx.save();
      KIT.ink.inkWipePath(ctx, W, H, q, { seed: 31 });
      ctx.clip();
      drawB();
      ctx.restore();
      KIT.ink.inkWipeDust(ctx, W, H, q, { seed: 32, alpha: 0.55 });
      // fibrous edge
      ctx.save();
      const ex = lerp(-W * 0.18, W * 1.18, q);
      ctx.globalAlpha = 0.26 * (1 - Math.abs(q - 0.5) * 1.2);
      ctx.strokeStyle = KIT.rgba(accent, 0.7);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let y = 0; y <= H; y += 14) {
        const x = ex + Math.sin(y * 0.05 + q * 9) * 12 + (KIT.noise2(y * 0.025, 0, 7) - 0.5) * 54;
        if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    } else if (kind === 'slats') {
      drawA();
      const n = 11;
      const ww = W / n;
      for (let i = 0; i < n; i++) {
        const local = clamp01(q * 1.25 - (i / n) * 0.32);
        if (local <= 0) continue;
        const x = i * ww;
        ctx.save();
        ctx.beginPath(); ctx.rect(x, 0, ww + 1, H); ctx.clip();
        ctx.drawImage(B.canvas, 0, 0);
        // thin red measuring rule on each slat
        ctx.strokeStyle = `rgba(154,44,36,${0.26 * (1 - local)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        ctx.fillStyle = `rgba(8,7,6,${0.15 * (1 - local)})`;
        ctx.fillRect(x, 0, ww, H);
        ctx.restore();
      }
    } else if (kind === 'diagonal') {
      drawA();
      ctx.save();
      const x0 = W * (1 - q * 1.35);
      ctx.beginPath();
      ctx.moveTo(W, 0);
      ctx.lineTo(W, H);
      ctx.lineTo(x0 + W * 0.35, H);
      ctx.lineTo(x0 - W * 0.2, 0);
      ctx.closePath();
      ctx.clip();
      drawB();
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = KIT.rgba(accent, 0.9);
      ctx.beginPath();
      ctx.moveTo(x0 - W * 0.2, 0); ctx.lineTo(x0 + W * 0.105, 0);
      ctx.lineTo(x0 + W * 0.56, H); ctx.lineTo(x0 + W * 0.25, H);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (kind === 'glitch') {
      const n = 28;
      const hh = H / n;
      drawA();
      for (let i = 0; i < n; i++) {
        const threshold = ((i * 0.618) % 1) * 0.85 + 0.1;
        if (q <= threshold) continue;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, i * hh, W, hh); ctx.clip();
        const jitter = (KIT.hash('goff', i, 1) / 4294967296 - 0.5) * 120 * (1 - Math.abs(q - 0.5) * 1.2);
        ctx.drawImage(B.canvas, jitter, 0);
        ctx.fillStyle = `rgba(0,0,0,${0.14 * (1 - q)})`;
        ctx.fillRect(0, i * hh, W, hh);
        ctx.restore();
      }
      // red / black editorial bars
      ctx.save();
      ctx.globalAlpha = 0.7 * (1 - Math.abs(q - 0.5) * 2);
      ctx.fillStyle = '#070606';
      for (let i = 0; i < 4; i++) ctx.fillRect(0, (i * 217 + q * 160) % H, W, 2 + (i % 2) * 5);
      ctx.fillStyle = KIT.rgba(accent, 0.55);
      ctx.fillRect((q * 1.7 * W) % W, 0, 3, H);
      ctx.restore();
    } else if (kind === 'pixel') {
      const cols = 32, rows = 18;
      const cw = W / cols, ch = H / rows;
      drawA();
      ctx.save();
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const th = 0.15 + 0.7 * ((x + y) / (cols + rows)) + 0.15 * (KIT.hash('pix', x, y) / 4294967296);
          if (q > th) {
            ctx.drawImage(B.canvas, x * cw, y * ch, cw, ch, x * cw, y * ch, cw, ch);
          }
        }
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.28 * (1 - Math.abs(q - 0.5) * 2);
      ctx.strokeStyle = KIT.rgba(accent, 0.6);
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += cw * 2) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += ch * 2) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();
    } else if (kind === 'vertical') {
      drawA();
      const bh = lerp(180, H, smoothstep(0, 0.8, q));
      const bw = bh * (9 / 16);
      ctx.save();
      ctx.fillStyle = 'rgba(4,4,6,0.72)';
      ctx.fillRect(0, 0, (W - bw) / 2, H);
      ctx.fillRect((W + bw) / 2, 0, (W - bw) / 2, H);
      ctx.beginPath(); ctx.rect((W - bw) / 2, (H - bh) / 2, bw, bh); ctx.clip();
      drawB();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = KIT.rgba(accent, 0.5);
      ctx.lineWidth = 2;
      ctx.strokeRect((W - bw) / 2, (H - bh) / 2, bw, bh);
      ctx.restore();
      // frosted side smear
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.drawImage(A.canvas, 0, 0, W / 13, H, 0, 0, W / 13, H);
      ctx.drawImage(A.canvas, W - W / 13, 0, W / 13, H, W - W / 13, 0, W / 13, H);
      ctx.restore();
    } else if (kind === 'window') {
      drawA();
      const p = easeInOutCubic(q);
      const ww = lerp(220, 1340, p);
      const wh = lerp(100, 760, p);
      const x = (W - ww) / 2, y = (H - wh) / 2;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = 48;
      ctx.shadowOffsetY = 18;
      ctx.fillStyle = '#d4d0c8';
      ctx.fillRect(x, y, ww, wh);
      ctx.shadowColor = 'transparent';
      const tb = Math.min(34, wh * 0.16);
      const g = ctx.createLinearGradient(x, y, x + ww, y);
      g.addColorStop(0, '#0a246a'); g.addColorStop(1, '#4a7fd4');
      ctx.fillStyle = g; ctx.fillRect(x, y, ww, tb);
      ctx.fillStyle = '#e8e6df';
      ctx.fillRect(x + 4, y + tb, ww - 8, wh - tb - 4);
      ctx.beginPath(); ctx.rect(x + 4, y + tb, ww - 8, wh - tb - 4); ctx.clip();
      ctx.drawImage(B.canvas, 0, 0);
      ctx.restore();
      ctx.save();
      ctx.fillStyle = 'rgba(241,241,241,0.9)';
      KIT.drawText(ctx, '历史检索系统 — 正在打开：第 16 帧', x + 10, y + tb / 2, { size: Math.max(8, tb * 0.33), font: KIT.FONT.mono, weight: 700, color: '#f1f1f1', letterSpacing: 0.1 });
      ctx.fillStyle = '#d4d0c8'; ctx.fillRect(x + ww - 24, y + 5, 18, 16);
      KIT.drawText(ctx, '×', x + ww - 15, y + tb / 2, { size: 13, font: KIT.FONT.mono, weight: 700, color: '#111', align: 'center' });
      ctx.restore();
    } else if (kind === 'doors') {
      drawA();
      const ww = lerp(0, W * 1.08, easeInOutCubic(q));
      ctx.save();
      ctx.beginPath(); ctx.rect((W - ww) / 2, 0, ww, H); ctx.clip();
      drawB();
      ctx.restore();
      // two enormous stone doors with a gold inner edge
      const doorW = (W - ww) / 2;
      for (const side of [-1, 1]) {
        const x = side < 0 ? 0 : W - doorW;
        const g = ctx.createLinearGradient(x, 0, x + doorW, 0);
        g.addColorStop(0, '#12100c'); g.addColorStop(1, '#241d13');
        ctx.fillStyle = g; ctx.fillRect(x, 0, doorW, H);
        ctx.fillStyle = KIT.rgba(accent, 0.38);
        ctx.fillRect(side < 0 ? doorW - 2 : W - doorW, 0, 2, H);
      }
    } else if (kind === 'zoom') {
      // full bleed, used for camera-through transitions and the finale pullback
      const sA = 1 + q * 0.18;
      const sB = 1.35 - q * 0.35;
      ctx.save();
      ctx.globalAlpha = 1 - smoothstep(0.45, 0.95, q) * 0.65;
      ctx.translate(W / 2, H / 2); ctx.scale(sA, sA);
      ctx.drawImage(A.canvas, -W / 2, -H / 2);
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.max(1, q * Math.hypot(W, H) * 0.62), 0, TAU); ctx.clip();
      ctx.globalAlpha = smoothstep(0.08, 0.55, q);
      ctx.translate(W / 2, H / 2); ctx.scale(sB, sB);
      ctx.drawImage(B.canvas, -W / 2, -H / 2);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = KIT.rgba(accent, 0.35 * (1 - q));
      ctx.lineWidth = 2 + (1 - q) * 10;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, q * Math.hypot(W, H) * 0.62, 0, TAU); ctx.stroke();
      ctx.restore();
    } else if (kind === 'scan') {
      drawA();
      const line = H + 80 - q * (H + 160);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, line, W, H - line); ctx.clip();
      drawB();
      ctx.restore();
      ctx.save();
      ctx.fillStyle = KIT.rgba(accent, 0.65);
      ctx.fillRect(0, line - 2, W, 4);
      ctx.fillStyle = 'rgba(8,8,8,0.45)';
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
      ctx.restore();
    } else if (kind === 'compile') {
      drawA();
      const p1 = clamp01(q / 0.55);
      const p2 = clamp01((q - 0.35) / 0.65);
      const ww = W * easeInOut(p1);
      const hh = H * easeInOutCubic(p2);
      ctx.save();
      ctx.beginPath(); ctx.rect((W - ww) / 2, (H - hh) / 2, ww, hh); ctx.clip();
      drawB();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = KIT.rgba(accent, 0.55);
      ctx.lineWidth = 1.4;
      ctx.strokeRect((W - ww) / 2, (H - hh) / 2, ww, hh);
      // cursor line
      ctx.fillStyle = KIT.rgba(accent, 0.65 * (1 - q));
      const cx = (W - ww) / 2;
      ctx.fillRect(cx, 0, 2, H);
      ctx.restore();
    }

    // shared downbeat flash, tinted by the incoming era
    const flash = Math.sin(Math.PI * clamp01(q)) * (style === 'cut' ? 0.08 : 0.16);
    if (flash > 0.002) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = KIT.rgba(accent, flash);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    ctx.restore();
  }

  /* -------------------------------------------------------------- overlays */
  drawOverlays(t, section, transitionP = null) {
    const ctx = this.ctx;
    const spec = section >= 0 && section < N_SCENES ? this.specs[section] : null;
    if (spec) {
      const u = clamp(t - sceneStart(section), 0, SCENE_DUR);
      drawEraCard(ctx, spec, u, {});
    }
    const outro = section >= N_SCENES;
    const intro = section < 0;
    const style = intro ? 'rubbing' : outro ? 'black' : spec.style;
    const dark = intro ? false : outro ? true : spec.tone === 'dark';
    const acc = intro ? '#a62a22' : outro ? '#d4af37' : spec.accent;
    drawHud(ctx, {
      distance: distanceAt(t),
      section,
      meta: spec,
      u: intro ? t : outro ? t - OUTRO_START : t - sceneStart(section),
      beat: beatInfo(t),
      style,
      dark,
      accent: acc,
    });
    // thin physical frame around the whole film
    ctx.save();
    ctx.strokeStyle = intro ? 'rgba(70,50,26,0.24)' : 'rgba(232,216,184,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(22.5, 22.5, W - 45, H - 45);
    ctx.restore();
    void transitionP;
  }

  drawEndGrain(t) {
    const ctx = this.ctx;
    // A 3% translucent paper grain keeps the digital blacks from feeling dead.
    const grain = KIT.layer('film:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 138, { amp: 0.10 }));
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.15;
    ctx.drawImage(grain, 0, 0, W, H);
    ctx.restore();
    void t;
  }

  /* ------------------------------------------------------------------ frame */
  render(t, opts = {}) {
    t = clamp(t, 0, DURATION);
    const t0 = (globalThis.performance && performance.now) ? performance.now() : 0;
    beginFrame(t);
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
    this.lastError = null;
    const b = findBoundary(t);
    let section = sectionAt(t);
    let transitionP = null;
    if (b != null) {
      const from = sectionAt(b - 0.001);
      const to = sectionAt(b + 0.001);
      const p = clamp01((t - (b - TRANSITION_HALF)) / (TRANSITION_HALF * 2));
      this.renderSectionBuffer(this.bufA, from, t);
      this.renderSectionBuffer(this.bufB, to, t);
      const style = this.transitionStyle(from, to);
      const accent = to >= 0 && to < N_SCENES ? this.specs[to].accent : '#d4af37';
      this.composeTransition(ctx, this.bufA, this.bufB, p, style, accent);
      transitionP = p;
      // The era label switches at the downbeat, not at the start of the wipe.
      section = sectionAt(t);
    } else {
      this.renderSectionBuffer(this.bufA, section, t);
      let cam;
      if (section < 0) cam = this.camera(section, clamp(t, 0, INTRO));
      else if (section < N_SCENES) cam = this.camera(section, clamp(t - sceneStart(section), 0, SCENE_DUR));
      else cam = { zoom: 1, dx: 0, dy: 0 };
      this.drawBufferWithCamera(ctx, this.bufA, cam);
    }
    if (section >= N_SCENES && !this.tilesReady) {
      // Preparing tiles is async; a seek into the outro should have awaited
      // prepare(). If not, we still show a composed wall with fallback cards.
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.001)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    this.drawEndGrain(t);
    this.drawOverlays(t, section, transitionP);
    if (opts.debugLabel && opts.label) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, 480, 42);
      KIT.drawText(ctx, String(opts.label), 16, 21, { size: 15, font: KIT.FONT.mono, color: '#fff' });
      ctx.restore();
    }
    setSceneInfo(section, section >= 0 && section < N_SCENES ? t - sceneStart(section) : section < 0 ? t : t - OUTRO_START);
    const dbg = snapshot();
    window.__DFT_FRAME = {
      t, section, frame: Math.round(t * FPS), distance: distanceAt(t),
      transitionP, style: section >= 0 && section < N_SCENES ? this.specs[section].style : section < 0 ? 'intro' : 'outro',
      texts: dbg.texts, eraCard: dbg.eraCard, hud: dbg.hud, error: this.lastError,
      tilesReady: this.tilesReady,
    };
    this.renderCount++;
    this.lastMs = ((globalThis.performance && performance.now) ? performance.now() : 0) - t0;
    return {
      t, section, ms: this.lastMs, error: this.lastError,
      texts: dbg.texts, eraCard: dbg.eraCard, hud: dbg.hud,
    };
  }

  renderFrame(frame) {
    return this.render(frame / FPS);
  }

  /** Cheap structural checks used by tools/qa-gate.mjs. */
  selfCheck() {
    const errors = [];
    const warnings = [];
    if (this.specs.length !== N_SCENES) errors.push(`expected ${N_SCENES} scene specs, got ${this.specs.length}`);
    if (this.scenes.length !== N_SCENES) errors.push(`expected ${N_SCENES} scene modules, got ${this.scenes.length}`);
    for (let i = 0; i < 18; i++) {
      const s = this.specs[i];
      if (!s) continue;
      if (s.distance !== DISTANCE_ANCHORS[i]) errors.push(`${s.no}: distance anchor mismatch ${s.distance} != ${DISTANCE_ANCHORS[i]}`);
      if (typeof this.scenes[i].renderAt !== 'function') errors.push(`${s.no}: no renderAt`);
      if (s.index !== i) errors.push(`${s.no}: index mismatch`);
      const b = BOUNDARIES[i];
      if (Math.abs(b - (INTRO + i * 6)) > 1e-9) errors.push(`${s.no}: boundary not on bar line`);
      if (!s.style || !s.no || !s.zh) warnings.push(`${s.no}: incomplete label metadata`);
    }
    let prev = -1;
    for (let t = 0; t <= DURATION; t += 0.25) {
      const d = distanceAt(t);
      if (d < prev - 1e-9) errors.push(`distance reversed at ${t.toFixed(2)}: ${d} < ${prev}`);
      prev = d;
    }
    if (Math.abs(distanceAt(DURATION) - 4739) > 1e-9) errors.push('final distance is not 4,739 km');
    if (this.tileErrors.length) warnings.push(...this.tileErrors);
    return { errors, warnings, tiles: this.tiles.length, tilesReady: this.tilesReady, renderCount: this.renderCount };
  }
}

export { W, H, BOUNDARIES, TRANSITION_HALF };
