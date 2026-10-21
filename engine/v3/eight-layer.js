/* =========================================================================
   V3 / eight-layer.js — 八层渲染管线
   L1 宣纸基质    L2 环境资产（山水/建筑/水）  L3 体积光与大气
   L4 物理与特效（刚体/粒子/雨）  L5 排版    L6 气溶胶    L7 调色    L8 颗粒与暗角
   ========================================================================= */
(function (DFS) {
  'use strict';
  DFS.V3 = DFS.V3 || {};
  const V3 = DFS.V3;
  const { W, H, clamp } = DFS;

  V3.eight = function (ctx, t, p = {}) {
    const frame = Math.round(t * DFS.FPS);

    // L1 宣纸基质 / 深渊
    ctx.save();
    if (p.l1) p.l1(ctx);
    else if (p.void) {
      const g = ctx.createRadialGradient(W * 0.5, H * 0.46, 60, W * 0.5, H * 0.5, H * 1.12);
      g.addColorStop(0, p.voidInner || '#141410');
      g.addColorStop(0.6, p.voidMid || '#0A0A08');
      g.addColorStop(1, p.voidOuter || '#030302');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else {
      V3.paper(ctx, p.paperOpts || {});
    }
    ctx.restore();

    // L2 环境资产
    if (p.l2) { ctx.save(); p.l2(ctx); ctx.restore(); }

    // L3 体积光 / 大气
    if (p.l3) { ctx.save(); ctx.globalCompositeOperation = p.l3Blend || 'lighter'; p.l3(ctx); ctx.restore(); }

    // L4 物理与特效
    if (p.l4) { ctx.save(); p.l4(ctx); ctx.restore(); }

    // L5 排版
    if (p.l5) { ctx.save(); p.l5(ctx); ctx.restore(); }

    // L6 气溶胶（默认常开，可关闭）
    if (p.dust !== false) {
      ctx.save();
      V3.aerosol(ctx, t, Object.assign({ count: 160, alpha: p.dustAlpha ?? 0.42 }, p.dustOpts || {}));
      ctx.restore();
    }

    // L7 调色
    ctx.save();
    if (p.l7) p.l7(ctx);
    else if (p.grade === 'warm') {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = '#F0D9A8';
      ctx.fillRect(0, 0, W, H);
    } else if (p.grade === 'cold') {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = '#6E86A0';
      ctx.fillRect(0, 0, W, H);
    } else if (p.grade === 'ash') {
      ctx.globalCompositeOperation = 'saturation';
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    // L8 颗粒 + 暗角
    DFS.drawGrainVignette(ctx, frame, {
      grain: p.grain ?? 0.45,
      vig: p.vignette ?? 0.26,
      vigMid: p.vignetteMid ?? 0.04
    });
  };

  /* ---------------- 常用：墨色雨幕（S03/S04） ---------------- */
  V3.spearRain = function (ctx, t, o = {}) {
    const n = o.count ?? 900;
    const speed = o.speed ?? 1180;      // px/s
    const slant = o.slant ?? -0.26;
    const alpha = o.alpha ?? 0.5;
    const scale = o.timeScale ?? 1;
    const color = o.color || '206,208,200';
    ctx.save();
    ctx.strokeStyle = `rgba(${color},${alpha})`;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const r1 = DFS.hash(o.seed ?? 88, i * 4 + 1);
      const r2 = DFS.hash(o.seed ?? 88, i * 4 + 2);
      const r3 = DFS.hash(o.seed ?? 88, i * 4 + 3);
      const sp = speed * (0.75 + r3 * 0.55) * scale;
      const y = ((r2 * H * 1.5 + t * sp) % (H * 1.5)) - H * 0.25;
      const x = r1 * W * 1.3 - W * 0.15 + y * slant * 0.4;
      const len = sp * 0.028 * (0.7 + r3 * 0.7);
      ctx.globalAlpha = alpha * (0.3 + r3 * 0.7);
      ctx.lineWidth = 0.8 + r3 * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len * slant, y + len);
      ctx.stroke();
    }
    ctx.restore();
  };

  /* ---------------- 常用：体积光柱（从上方斜射） ---------------- */
  V3.volumetricLight = function (ctx, t, o = {}) {
    const n = o.count ?? 7;
    const alpha = o.alpha ?? 0.16;
    const color = o.color || '236,214,166';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const x0 = W * (0.08 + 0.84 * (i / Math.max(1, n - 1)));
      const sway = Math.sin(t * 0.19 + i * 1.7) * W * 0.02;
      const wTop = W * (0.02 + 0.03 * DFS.hash(o.seed ?? 3, i));
      const wBot = wTop * (3 + DFS.hash(o.seed ?? 4, i) * 3);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `rgba(${color},${alpha * 0.9})`);
      g.addColorStop(0.55, `rgba(${color},${alpha * 0.35})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0 - wTop + sway, -40);
      ctx.lineTo(x0 + wTop + sway, -40);
      ctx.lineTo(x0 + wBot + sway * 2, H);
      ctx.lineTo(x0 - wBot + sway * 2, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  /* ---------------- 常用：云雾（多层 fBm 椭圆） ---------------- */
  V3.cloudBank = function (ctx, t, o = {}) {
    const n = o.count ?? 22;
    const color = o.color || '232,226,208';
    const alpha = o.alpha ?? 0.12;
    const y0 = o.y0 ?? H * 0.2, y1 = o.y1 ?? H * 0.55;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const r = DFS.rng(700 + i * 13);
      const drift = ((r() + t * (0.004 + r() * 0.008)) % 1.4 - 0.2) * W;
      const y = y0 + (y1 - y0) * r();
      const w = W * (0.22 + r() * 0.5);
      const h = 40 + r() * 130;
      const g = ctx.createRadialGradient(drift, y, 0, drift, y, w * 0.5);
      g.addColorStop(0, `rgba(${color},${alpha * (0.4 + r() * 0.6)})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(drift, y);
      ctx.scale(1, h / (w * 0.5) * 1.6);
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

})(window.DFS);
