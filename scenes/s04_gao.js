/* =========================================================================
   s04_gao.js — 23.6–33.2s 登高 · 落木长江 · 望岳点云
   年号卡 → 长江落木「无边落木萧萧下」→「不尽长江滚滚来」→ 点云群山收束成峰
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease } = DFS;
  const T = DFS.THEME;

  DFS.sceneRegistry['s04'] = class Scene04 {
    constructor() {
      this.sea = new DFS.Sea({ horizon: 0.525, dark: false, rows: 120 });
      this.leaves = new DFS.Leaves({ n: 80, seed: 3301, color: '34,26,15', alpha: 0.75, size: 1.0 });
      this.ridge = new DFS.RidgeCloud({ seed: 7028, count: 20000, width: 30, depth: 6, height: 6.9 });
      this.cam = new DFS.Camera({ pos: { x: 0, y: 2.6, z: -12 }, yaw: -0.55, pitch: -0.02 });
    }

    draw(ctx, L, t) {
      /* 时间线 */
      const tCard = clamp(L / 1.5);
      const tCardOut = clamp((L - 1.5) / 0.4);
      const tSea = clamp((L - 1.15) / 1.0);
      const tRidge = clamp((L - 5.7) / 1.3);
      const tRidgeOut = clamp((L - 8.6) / 0.7);

      /* ---------- 1. 宣纸底 ---------- */
      DFS.drawPaper(ctx, { zoom: 1.02 });
      DFS.drawGradientMesh(ctx, t, { c1: 'rgba(255,250,232,0.5)', c2: 'rgba(120,104,78,0.14)' });

      /* ---------- 2. 江面 ---------- */
      if (tSea > 0.001) {
        ctx.save();
        ctx.globalAlpha = Ease.outCubic(tSea);
        this.sea.drawPaperSea(ctx, t, {});
        ctx.restore();
        // 江面雾气
        ctx.save();
        ctx.globalAlpha = tSea * 0.9;
        const g = ctx.createLinearGradient(0, H * 0.36, 0, H * 0.60);
        g.addColorStop(0, 'rgba(240,233,216,0)');
        g.addColorStop(0.45, 'rgba(240,233,216,0.62)');
        g.addColorStop(1, 'rgba(240,233,216,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, H * 0.36, W, H * 0.24);
        ctx.restore();
      }

      /* ---------- 3. 落木 ---------- */
      if (tSea > 0.05) {
        ctx.save();
        ctx.globalAlpha = tSea * (1 - tRidgeOut);
        this.leaves.draw(ctx, t, {});
        ctx.restore();
      }

      /* ---------- 4. 点云群山（望岳回溯） ---------- */
      if (tRidge > 0.001) {
        const yaw = lerp(-0.62, 0.22, Ease.inOutCubic(clamp((L - 5.7) / 3.4)));
        this.cam.yaw = yaw;
        this.cam.pos = { x: 0, y: lerp(3.2, 2.2, tRidge), z: -12 };
        ctx.save();
        ctx.globalAlpha = tRidge * (1 - tRidgeOut * 0.9);
        // 远山（淡）
        this.ridge.draw(ctx, this.cam, t, { alpha: 0.42, color: '54,46,33', size: 1.5 });
        // 近山（实）
        ctx.globalAlpha = tRidge * (1 - tRidgeOut * 0.9) * 0.92;
        this.ridge.draw(ctx, this.cam, t, { alpha: 0.95, color: '22,17,9', size: 2.1, jitter: 1 });
        ctx.restore();
        // 山脚的雾
        ctx.save();
        ctx.globalAlpha = tRidge * 0.8;
        const mg = ctx.createLinearGradient(0, H * 0.62, 0, H * 0.95);
        mg.addColorStop(0, 'rgba(236,229,212,0)');
        mg.addColorStop(0.5, 'rgba(236,229,212,0.75)');
        mg.addColorStop(1, 'rgba(236,229,212,0.95)');
        ctx.fillStyle = mg;
        ctx.fillRect(0, H * 0.62, W, H * 0.33);
        ctx.restore();
      }

      /* ---------- 5. 年号卡：七六六 ---------- */
      if (L < 1.9) {
        const p = Ease.outExpo(clamp(L / 0.7));
        const out = tCardOut;
        ctx.save();
        ctx.globalAlpha = p * (1 - out);
        DFS.outlineText(ctx, '七六六', {
          x: W / 2, y: H * 0.46, size: 300, weight: 200, color: 'rgba(28,21,10,0.92)',
          lw: 2.6, tracking: 26, scale: 1 + (1 - p) * 0.10
        });
        ctx.font = DFS.font(30, 400, T.fonts.serif);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(40,32,18,0.85)';
        ctx.fillText('夔州 · 登高', W / 2, H * 0.46 + 224);
        ctx.font = DFS.font(21, 400, T.fonts.mono);
        ctx.fillStyle = 'rgba(60,50,32,0.55)';
        ctx.fillText('KUIZHOU · 766', W / 2, H * 0.46 + 264);
        ctx.restore();
      }

      /* ---------- 6. 诗行 ---------- */
      const s1 = 2.35;
      if (L > s1) {
        const out = clamp((L - 4.55) / 0.6);
        ctx.save();
        ctx.globalAlpha = 1 - out;
        DFS.textIn(ctx, '无边落木萧萧下', {
          x: W / 2, y: H * 0.215, size: 96, weight: 400, family: T.fonts.serif,
          color: 'rgba(26,19,9,0.94)', t: L, start: s1, dur: 0.7, stagger: 0.085,
          rise: 20, from: 0.95, blur: 5, tracking: 14
        });
        ctx.restore();
      }

      const s2 = 4.5;
      if (L > s2) {
        const out = clamp((L - 6.55) / 0.6);
        ctx.save();
        ctx.globalAlpha = 1 - out;
        // 竖排右起，压在江面上
        DFS.verticalIn(ctx, '不尽长江滚滚来', {
          x: W * 0.845, y: H * 0.10, size: 76, weight: 400, family: T.fonts.serif,
          color: 'rgba(24,18,9,0.95)', t: L, start: s2, stagger: 0.085, dur: 0.6, gap: 1.22
        });
        ctx.restore();
      }

      // 望岳：小字注 + 竖排
      const s3 = 6.85;
      if (L > s3) {
        const p = Ease.outExpo(clamp((L - s3) / 0.8));
        ctx.save();
        ctx.globalAlpha = p;
        ctx.font = DFS.font(26, 400, T.fonts.kai);
        ctx.fillStyle = 'rgba(46,38,22,0.7)';
        ctx.textAlign = 'left';
        ctx.fillText('少时望岳', W * 0.085, H * 0.24);
        ctx.font = DFS.font(18, 400, T.fonts.mono);
        ctx.fillStyle = 'rgba(46,38,22,0.45)';
        ctx.fillText('circa 736', W * 0.085, H * 0.24 + 32);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = p * 0.95;
        DFS.verticalIn(ctx, '会当凌绝顶', {
          x: W * 0.90, y: H * 0.16, size: 66, weight: 400, family: T.fonts.serif,
          color: 'rgba(24,18,9,0.9)', t: L, start: s3 + 0.15, stagger: 0.08, dur: 0.55, gap: 1.2
        });
        DFS.verticalIn(ctx, '一览众山小', {
          x: W * 0.845, y: H * 0.16, size: 66, weight: 400, family: T.fonts.serif,
          color: 'rgba(24,18,9,0.9)', t: L, start: s3 + 0.55, stagger: 0.08, dur: 0.55, gap: 1.2
        });
        ctx.restore();
      }

      // 收尾轻微压淡（为下一场黑夜留出呼吸）
      if (L > 9.1) {
        ctx.save();
        ctx.globalAlpha = clamp((L - 9.1) / 0.5) * 0.35;
        ctx.fillStyle = '#0B0A06';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    hudDark() { return false; }
  };
})(window.DFS);
