/* =========================================================================
   s01_title.js — 0.0–3.2s 序：一点 → 宣纸 → 杜甫 712—770
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease } = DFS;
  const T = DFS.THEME;

  DFS.sceneRegistry['s01'] = class Scene01 {
    constructor() {
      this.title = '杜甫';
      this.range = '七一二 — 七七〇';
    }

    draw(ctx, L, t) {
      const paperIn = Ease.outCubic(clamp((L - 0.95) / 0.85));

      // ---- 底色：黑 → 宣纸 ----
      ctx.fillStyle = '#070704';
      ctx.fillRect(0, 0, W, H);

      if (paperIn > 0.001) {
        ctx.save();
        ctx.globalAlpha = paperIn;
        const zoom = 1.06 - 0.06 * paperIn + L * 0.004;
        DFS.drawPaper(ctx, { zoom });
        DFS.drawGradientMesh(ctx, t, {
          c1: 'rgba(255,248,228,0.55)', c2: 'rgba(120,100,74,0.18)'
        });
        ctx.restore();
      }

      // ---- 起初的一点（黑场中的微光） ----
      if (L < 1.35) {
        const a = clamp((L - 0.10) / 0.55) * (1 - clamp((L - 0.75) / 0.55));
        const r = 1.6 + 1.4 * DFS.breathe(L, 1, 1).scale;
        ctx.save();
        ctx.globalAlpha = a;
        const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r * 14);
        g.addColorStop(0, 'rgba(246,238,214,0.95)');
        g.addColorStop(0.25, 'rgba(246,238,214,0.35)');
        g.addColorStop(1, 'rgba(246,238,214,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, r * 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,251,236,1)';
        ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // ---- 标题 ----
      const ts = 1.42;
      if (L > ts - 0.08) {
        const p = Ease.outExpo(clamp((L - ts) / 0.95));
        const scale = 1.10 - 0.10 * p;
        const alpha = clamp(p * 1.4);
        ctx.save();
        ctx.translate(W / 2, H * 0.455);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        // 极轻的墨韵底
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 逐字微差（铁律：错落）
        const chars = Array.from(this.title);
        const step = 420;
        chars.forEach((ch, i) => {
          const d = i * 0.055;
          const pp = Ease.outExpo(clamp((L - ts - d) / 0.85));
          ctx.save();
          ctx.globalAlpha = alpha * clamp(pp * 1.3);
          if (pp < 0.99) ctx.filter = `blur(${((1 - pp) * 7).toFixed(2)}px)`;
          DFS.grainText(ctx, ch, {
            x: (i - (chars.length - 1) / 2) * step,
            y: (1 - pp) * 34, size: 400, weight: 900, family: T.fonts.heavy,
            color: T.colors.ink, rough: 0.75, seed: 11 + i
          });
          ctx.restore();
        });
        ctx.restore();
      }

      // ---- 朱色细线 + 生卒 ----
      const rs = 2.18;
      if (L > rs) {
        const p = Ease.outExpo(clamp((L - rs) / 0.7));
        const w = 470 * p;
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = T.colors.cinnabar;
        ctx.fillRect(W / 2 - w / 2, H * 0.455 + 218, w, 2.6);
        ctx.restore();
      }
      const ds = 2.42;
      if (L > ds) {
        const p = Ease.outExpo(clamp((L - ds) / 0.6));
        ctx.save();
        ctx.globalAlpha = clamp(p * 1.2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = DFS.font(38, 400, T.fonts.mono);
        ctx.fillStyle = 'rgba(48,40,28,0.88)';
        const txt = this.range;
        const chars = Array.from(txt);
        let tw = 0;
        chars.forEach((c) => { tw += ctx.measureText(c).width; });
        tw += 6 * (chars.length - 1);
        let cx = W / 2 - tw / 2;
        chars.forEach((c, i) => {
          const cw = ctx.measureText(c).width;
          ctx.globalAlpha = clamp(p * 1.2) * (0.35 + 0.65 * clamp((p - i * 0.04) * 3));
          ctx.fillText(c, cx + cw / 2, H * 0.455 + 282 + (1 - p) * 8);
          cx += cw + 6;
        });
        ctx.restore();
      }

      // ---- 收口：轻微压暗，交给下一场的活字世界 ----
      if (L > 2.85) {
        ctx.save();
        ctx.globalAlpha = clamp((L - 2.85) / 0.35) * 0.16;
        ctx.fillStyle = '#0A0803';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    hudDark() { return false; }
  };
})(window.DFS);
