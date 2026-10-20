/* =========================================================================
   s05_boat.js — 33.0–47.0s 烽火家书 · 夜江孤舟
   金球压信 →「烽火连三月，家书抵万金」→ 夜海明月 →「星垂平野阔」
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease, hash } = DFS;
  const T = DFS.THEME;

  DFS.sceneRegistry['s05'] = class Scene05 {
    constructor() {
      this.sea = new DFS.Sea({ horizon: 0.545, dark: true, rows: 130, seed: 4242 });
      this.gold = (() => {
        const r = DFS.rng(7788);
        return Array.from({ length: 520 }, (_, i) => ({
          x: r(), delay: r() * 2.2, r: 2.4 + Math.pow(r(), 2.2) * 13, spin: (r() - 0.5) * 2,
          drift: (r() - 0.5) * 0.5, depth: r()
        }));
      })();
    }

    /* 金球 */
    drawGold(ctx, t, o = {}) {
      const { alpha = 1, originY = -0.15, spread = 1 } = o;
      for (let i = 0; i < this.gold.length; i++) {
        const g = this.gold[i];
        const p = clamp((t - g.delay) / 1.5);
        if (p <= 0) continue;
        const e = Ease.inCubic(p);
        const px = (g.x * 1.1 - 0.05) * W + Math.sin(t * 0.6 + i) * 8 * spread;
        const py = (originY + e * (0.92 + g.depth * 0.10)) * H + Math.sin(t * 0.9 + i) * 5;
        const r = g.r * (0.75 + 0.5 * g.depth);
        ctx.save();
        ctx.globalAlpha = alpha * clamp(p * 1.6) * 0.96;
        const grd = ctx.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.1, px, py, r);
        grd.addColorStop(0, '#F2D79A');
        grd.addColorStop(0.45, '#C99A46');
        grd.addColorStop(0.85, '#8A6320');
        grd.addColorStop(1, '#5B3E12');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    /* 一张薄信笺 */
    drawLetter(ctx, t, o = {}) {
      const { alpha = 1, crumple = 0, x = W * 0.5, y = H * 0.47 } = o;
      const w = 360 * (1 - crumple * 0.18);
      const h = 470 * (1 + crumple * 0.06);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y + Math.sin(t * 1.1) * 6);
      ctx.rotate(Math.sin(t * 0.7) * 0.012 + crumple * 0.10);
      // 纸张
      ctx.shadowColor = 'rgba(40,28,12,0.35)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 18;
      const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      g.addColorStop(0, '#FBF5E6');
      g.addColorStop(0.6, '#F1E7D2');
      g.addColorStop(1, '#E2D3B6');
      ctx.fillStyle = g;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.shadowColor = 'transparent';
      // 折痕
      ctx.strokeStyle = 'rgba(120,102,74,0.20)';
      ctx.lineWidth = 1.4;
      for (let i = 1; i <= 3; i++) {
        const yy = -h / 2 + (h / 4) * i;
        ctx.beginPath(); ctx.moveTo(-w / 2 + 8, yy); ctx.lineTo(w / 2 - 8, yy); ctx.stroke();
      }
      // 竖排墨迹（不可读的家书）
      ctx.fillStyle = 'rgba(44,34,20,0.55)';
      const rr = DFS.rng(313);
      for (let c = 0; c < 5; c++) {
        const cx = w * 0.34 - c * (w * 0.155);
        for (let k = 0; k < 13; k++) {
          const cy = -h * 0.33 + k * (h * 0.049) + (rr() - 0.5) * 2;
          ctx.globalAlpha = alpha * (0.30 + rr() * 0.45);
          ctx.fillRect(cx + (rr() - 0.5) * 2, cy, w * 0.030, h * 0.020);
        }
      }
      ctx.restore();
    }

    draw(ctx, L, t) {
      /* 时间线 */
      const tNight = clamp((L - 4.6) / 1.6);
      const tRed = clamp((L - 9.6) / 1.8);
      const tOut = clamp((L - 13.0) / 0.9);

      /* ---------- 1. 底 ---------- */
      DFS.drawPaper(ctx, { zoom: 1.02 + L * 0.003 });
      if (tNight > 0.001) {
        ctx.save();
        ctx.globalAlpha = Ease.inOutCubic(tNight);
        this.sea.drawSky(ctx, t, {
          moon: { x: W * 0.5, y: H * 0.235, r: 52 + tRed * 6, glow: 1 + tRed },
          clouds: { y: H * 0.22, alpha: 0.5 + tRed * 0.2, drift: 1 }
        });
        this.sea.drawSea(ctx, t, {
          moonPath: { x: W * 0.5, width: 64, alpha: 0.9 + tRed * 0.2 }
        });
        ctx.restore();
      }

      // 血色天光（参考片 46s 的赤色天空）
      if (tRed > 0.001) {
        ctx.save();
        ctx.globalAlpha = tRed * 0.55;
        const rg = ctx.createLinearGradient(0, 0, 0, H * 0.62);
        rg.addColorStop(0, 'rgba(150,38,26,0.85)');
        rg.addColorStop(0.5, 'rgba(120,30,22,0.45)');
        rg.addColorStop(1, 'rgba(120,30,22,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H * 0.62);
        ctx.restore();
      }

      /* ---------- 2. 家书段（纸白） ---------- */
      const letterA = clamp((L - 0.35) / 0.8) * (1 - clamp((L - 4.5) / 0.65));
      if (letterA > 0.01) {
        this.drawLetter(ctx, t, { alpha: letterA, crumple: clamp((L - 3.2) / 1.6) });
        this.drawGold(ctx, t, { alpha: letterA, originY: -0.2 });
      } else if (L < 0.35) {
        // 开场：金色光尘
        ctx.save();
        ctx.globalAlpha = 0.6;
        this.drawGold(ctx, t, { alpha: 0.25, originY: -0.5 });
        ctx.restore();
      }

      // 家书文字
      if (L > 1.15 && L < 5.1) {
        const a = clamp((L - 1.15) / 0.8) * (1 - clamp((L - 4.4) / 0.6));
        ctx.save();
        ctx.globalAlpha = a;
        DFS.textIn(ctx, '烽火连三月', {
          x: W * 0.5, y: H * 0.845, size: 66, weight: 400, family: T.fonts.serif,
          color: 'rgba(30,22,10,0.92)', t: L, start: 1.15, stagger: 0.09, dur: 0.6, tracking: 16
        });
        DFS.textIn(ctx, '家书抵万金', {
          x: W * 0.5, y: H * 0.915, size: 66, weight: 400, family: T.fonts.serif,
          color: 'rgba(30,22,10,0.92)', t: L, start: 1.75, stagger: 0.09, dur: 0.6, tracking: 16
        });
        ctx.restore();
      }

      /* ---------- 3. 孤舟 ---------- */
      if (tNight > 0.15) {
        const p = Ease.outCubic(clamp((tNight - 0.15) / 0.85));
        const bx = W * (0.30 + 0.16 * Ease.inOutCubic(clamp((L - 6) / 6)));
        const by = H * 0.63;
        ctx.save();
        ctx.globalAlpha = p * (1 - tOut);
        DFS.boat(ctx, bx, by, 0.62 + tRed * 0.1, { t, alpha: 0.95 });
        ctx.restore();
      }

      /* ---------- 4. 夜江诗行 ---------- */
      if (L > 6.0) {
        const out = clamp((L - 9.9) / 0.8);
        ctx.save();
        ctx.globalAlpha = (1 - out) * 0.95;
        DFS.verticalIn(ctx, '星垂平野阔', {
          x: W * 0.145, y: H * 0.13, size: 62, weight: 400, family: T.fonts.serif,
          color: 'rgba(238,233,216,0.92)', t: L, start: 6.0, stagger: 0.09, dur: 0.6, gap: 1.2
        });
        DFS.verticalIn(ctx, '月涌大江流', {
          x: W * 0.095, y: H * 0.13, size: 62, weight: 400, family: T.fonts.serif,
          color: 'rgba(238,233,216,0.92)', t: L, start: 6.55, stagger: 0.09, dur: 0.6, gap: 1.2
        });
        ctx.restore();
      }

      if (L > 10.2) {
        const p = Ease.outExpo(clamp((L - 10.2) / 0.9));
        ctx.save();
        ctx.globalAlpha = p * 0.95;
        DFS.textIn(ctx, '飘飘何所似　天地一沙鸥', {
          x: W * 0.5, y: H * 0.775, size: 58, weight: 400, family: T.fonts.serif,
          color: 'rgba(240,234,216,0.9)', t: L, start: 10.2, stagger: 0.055, dur: 0.55, tracking: 8
        });
        // 一只飞鸟
        DFS.bird(ctx, W * 0.5 + 350, H * 0.70, 0.9, t, { color: '240,234,214', alpha: p * 0.8 });
        ctx.restore();
      }

      /* ---------- 5. 收 ---------- */
      if (tOut > 0.001) {
        ctx.save();
        ctx.globalAlpha = Ease.inOutCubic(tOut) * 0.75;
        ctx.fillStyle = '#070704';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    hudDark(L) { return L > 4.6; }
  };
})(window.DFS);
