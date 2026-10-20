/* =========================================================================
   s09_end.js — 69.8–85.0s 沉郁收束
   人生不相见 → 动如参与商 → 空江孤舟 → 「却把整个时代，写成了诗」
   → 单字「诗」→ 大历五年冬 · 湘江 → 落版（杜甫 七一二—七七〇 · 诗圣印）
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease } = DFS;
  const T = DFS.THEME;

  DFS.sceneRegistry['s09'] = class Scene09 {
    draw(ctx, L, t) {
      /* ---------- 时间线 ---------- */
      const tColumns = clamp(L / 1.0);              // 双列诗
      const tEmpty = clamp((L - 4.3) / 1.4);        // 双列淡出，只留江面
      const tLines = clamp((L - 6.55) / 0.7);       // 结语两行
      const tLineOut = clamp((L - 9.35) / 1.1);     // 结语化烟
      const tOne = clamp((L - 9.85) / 0.5);         // 单字「诗」
      const tBlack = clamp((L - 11.35) / 0.8);      // 转黑
      const tCard = clamp((L - 12.05) / 1.0);       // 落版
      const tSeal = clamp((L - 12.75) / 0.45);

      /* ---------- 1. 纸底 + 江面 ---------- */
      DFS.drawPaper(ctx, { zoom: 1.03 });
      DFS.drawGradientMesh(ctx, t, { c1: 'rgba(255,250,232,0.5)', c2: 'rgba(120,104,78,0.13)' });

      // 极淡的江面（留白里的水）
      ctx.save();
      ctx.globalAlpha = 0.5 + tEmpty * 0.3;
      const sea = new DFS.Sea({ horizon: 0.70, dark: false });
      sea.drawPaperSea(ctx, t, {});
      ctx.restore();

      /* ---------- 2. 双列诗 ---------- */
      if (tEmpty < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - Ease.inOutCubic(tEmpty);
        DFS.verticalIn(ctx, '人生不相见', {
          x: W * 0.60, y: H * 0.115, size: 74, weight: 400, family: T.fonts.kai,
          color: 'rgba(28,21,10,0.92)', t: L, start: 0.35, stagger: 0.12, dur: 0.7, gap: 1.24
        });
        DFS.verticalIn(ctx, '动如参与商', {
          x: W * 0.535, y: H * 0.115, size: 74, weight: 400, family: T.fonts.kai,
          color: 'rgba(28,21,10,0.92)', t: L, start: 1.45, stagger: 0.12, dur: 0.7, gap: 1.24
        });
        // 落款小字
        const ps = Ease.outExpo(clamp((L - 2.7) / 0.7));
        ctx.globalAlpha = (1 - Ease.inOutCubic(tEmpty)) * ps * 0.55;
        ctx.font = DFS.font(20, 400, T.fonts.mono);
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(50,40,24,0.9)';
        ctx.fillText('《赠卫八处士》', W * 0.455, H * 0.115 + 74 * 5 * 1.24 + 40);
        ctx.restore();
      }

      /* ---------- 3. 空江：一叶小舟 ---------- */
      if (L > 3.6) {
        const p = Ease.outExpo(clamp((L - 3.6) / 1.4));
        const drift = clamp((L - 3.6) / 9);
        const bx = W * (0.30 + drift * 0.24);
        const by = H * 0.775;
        ctx.save();
        ctx.globalAlpha = p * (1 - tBlack) * 0.9;
        DFS.boat(ctx, bx, by, 0.42, { t, alpha: 0.9, color: '22,18,10', figure: true, figureColor: '20,16,9' });
        // 水的倒影
        ctx.globalAlpha = p * 0.25;
        ctx.strokeStyle = 'rgba(60,50,32,0.6)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const yy = by + 16 + i * 9;
          ctx.beginPath();
          ctx.moveTo(bx - 40 + i * 8, yy);
          ctx.lineTo(bx + 40 - i * 8, yy);
          ctx.stroke();
        }
        ctx.restore();
      }

      /* ---------- 4. 结语两行 ---------- */
      if (tLines > 0.001 && tLineOut < 1) {
        const a = (1 - tLineOut);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const l1 = '他没能致君尧舜上，';
        const l2 = '却把整个时代，写成了诗。';
        const chars1 = Array.from(l1);
        const chars2 = Array.from(l2);
        ctx.font = DFS.font(52, 400, T.fonts.serif);
        chars1.forEach((c, i) => {
          const pp = Ease.outExpo(clamp((L - 6.55 - i * 0.032) / 0.6));
          ctx.globalAlpha = a * pp * 0.9;
          ctx.fillStyle = 'rgba(38,30,16,0.92)';
          ctx.fillText(c, W * 0.5 + (i - (chars1.length - 1) / 2) * 56, H * 0.33 + (1 - pp) * 14);
        });
        ctx.font = DFS.font(56, 500, T.fonts.heavy);
        chars2.forEach((c, i) => {
          const pp = Ease.outExpo(clamp((L - 7.15 - i * 0.034) / 0.6));
          ctx.globalAlpha = a * pp * 0.96;
          ctx.fillStyle = i >= 8 ? T.colors.cinnabar : 'rgba(28,21,10,0.95)';
          ctx.fillText(c, W * 0.5 + (i - (chars2.length - 1) / 2) * 60, H * 0.44 + (1 - pp) * 14);
        });
        ctx.restore();

        // 化烟：两层粒子（复用文字采样后消散）
        if (tLineOut > 0.01) {
          ctx.save();
          DFS.particleText(ctx, '诗', {
            x: W * 0.5 + 200, y: H * 0.44, size: 56, weight: 500, family: T.fonts.heavy,
            step: 4, seed: 71, assemble: 1, dissolve: tLineOut, wind: 1,
            color: '200,54,36', sizePx: 2.2, alpha: 0.9, t
          });
          ctx.restore();
        }
      }

      /* ---------- 5. 单字「诗」 ---------- */
      if (tOne > 0.001 && tBlack < 0.98) {
        const p = Ease.outExpo(tOne);
        ctx.save();
        ctx.globalAlpha = p * (1 - tBlack) * 0.95;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = DFS.font(96, 400, T.fonts.serif);
        ctx.fillStyle = 'rgba(30,23,11,0.95)';
        ctx.fillText('诗', W * 0.5, H * 0.50);
        ctx.restore();
      }

      /* ---------- 6. 转黑 ---------- */
      if (tBlack > 0.001) {
        ctx.save();
        ctx.globalAlpha = Ease.inOutCubic(tBlack);
        ctx.fillStyle = '#070705';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      /* ---------- 7. 落版 ---------- */
      if (tCard > 0.001) {
        const p = Ease.outExpo(tCard);
        ctx.save();
        ctx.globalAlpha = p;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 小字：时间地点
        ctx.font = DFS.font(24, 400, T.fonts.serif);
        ctx.fillStyle = 'rgba(206,200,184,0.66)';
        ctx.fillText(DFS.cnNum(770) + ' 年冬　湘江　一条船', W * 0.5, H * 0.335);
        // 主字
        ctx.globalAlpha = p * 0.98;
        ctx.font = DFS.font(132, 500, T.fonts.heavy);
        ctx.fillStyle = 'rgba(240,235,220,0.97)';
        ctx.fillText('杜甫', W * 0.5, H * 0.455);
        // 生卒
        ctx.globalAlpha = p * 0.75;
        ctx.font = DFS.font(30, 400, T.fonts.mono);
        ctx.fillStyle = 'rgba(214,208,190,0.8)';
        ctx.fillText('712 — 770', W * 0.5, H * 0.585);
        // 朱线
        ctx.globalAlpha = p * 0.9;
        ctx.fillStyle = T.colors.cinnabar;
        ctx.fillRect(W * 0.5 - 120 * p, H * 0.545, 240 * p, 2.2);
        ctx.restore();

        // 诗圣印
        if (tSeal > 0.001) {
          const sp = Ease.outExpo(tSeal);
          ctx.save();
          ctx.globalAlpha = sp;
          DFS.seal(ctx, {
            x: W * 0.5 + 210, y: H * 0.455 + 12, size: 74 * (1.4 - 0.4 * sp),
            text: '诗圣', chars: 'multi', alpha: sp, seed: 8, rotate: 0.04
          });
          ctx.restore();
        }
      }

      /* ---------- 8. 收尾淡出 ---------- */
      if (L > 14.5) {
        ctx.save();
        ctx.globalAlpha = clamp((L - 14.5) / 0.7);
        ctx.fillStyle = '#050504';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    hudDark(L) { return L > 11.3; }
  };
})(window.DFS);
