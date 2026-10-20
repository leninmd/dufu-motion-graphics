/* =========================================================================
   s09_end.js — 70.9–85.0s 湘江孤舟终章（V2）
   人生不相见 → 动如参与商 → 空江孤舟 → 终极海报帧 → 诗 → 墨黑落版
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp } = DFS;
  const HUB = DFS.HUB;
  const T = DFS.THEME;

  DFS.sceneRegistry['s09'] = class Scene09V2 {
    constructor() {
      this.sea = new DFS.Sea({ horizon: 0.70, dark: false });
    }

    draw(ctx, L, t) {
      const tColumns = clamp(L / 1.0);
      const tEmpty = clamp((L - 3.35) / 1.3);
      const pPoster = HUB.multiEntrance(L, 4.55, { duration: 0.9, rise: 30, blur: 8 });
      const tLineOut = clamp((L - 9.05) / 1.15);
      const tOne = clamp((L - 9.95) / 0.5);
      const tBlack = clamp((L - 11.35) / 0.75);
      const tCard = clamp((L - 12.05) / 1.0);
      const tSeal = clamp((L - 12.75) / 0.45);

      /* ---------- 纸白 + 极淡江面 ---------- */
      HUB.fiveLayerStack(ctx, t, {
        layer1: (c) => {
          DFS.drawPaper(c, { zoom: 1.03 });
          DFS.drawGradientMesh(c, t, { c1: 'rgba(255,250,232,0.5)', c2: 'rgba(120,104,78,0.13)' });
        },
        layer2: (c) => {
          c.save();
          c.globalAlpha = 0.55 + tEmpty * 0.25;
          this.sea.drawPaperSea(c, t, {});
          c.restore();
        },
        grade: 'warm', grain: 0.40, vignette: 0.20
      });

      /* ---------- 双列诗 ---------- */
      if (tEmpty < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - DFS.Ease.inOutCubic(tEmpty);
        HUB.vertical(ctx, '人生不相见', {
          x: W * 0.585, y: H * 0.135, size: 74, gap: 1.24,
          family: T.fonts.kai, color: 'rgba(26,19,10,0.92)',
          alpha: DFS.Ease.outExpo(clamp((L - 0.25) / 0.8))
        });
        HUB.vertical(ctx, '动如参与商', {
          x: W * 0.515, y: H * 0.135, size: 74, gap: 1.24,
          family: T.fonts.kai, color: 'rgba(26,19,10,0.92)',
          alpha: DFS.Ease.outExpo(clamp((L - 1.15) / 0.8))
        });
        // 落款
        const ps = DFS.Ease.outExpo(clamp((L - 2.1) / 0.7));
        ctx.globalAlpha = (1 - DFS.Ease.inOutCubic(tEmpty)) * ps * 0.5;
        ctx.font = DFS.font(20, 400, T.fonts.mono);
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(50,40,24,0.9)';
        ctx.fillText('《赠卫八处士》', W * 0.455, H * 0.135 + 74 * 5 * 1.24 + 40);
        ctx.restore();
        DFS.dbgBox('shierwei', W * 0.46, H * 0.135, W * 0.63, H * 0.135 + 74 * 5 * 1.24);
      }

      /* ---------- 一叶孤舟 ---------- */
      if (L > 1.8) {
        const p = DFS.Ease.outExpo(clamp((L - 1.8) / 1.4));
        const drift = clamp((L - 1.8) / 10);
        const bx = W * (0.34 + drift * 0.14);
        const by = H * 0.775;
        ctx.save();
        ctx.globalAlpha = p * (1 - tBlack) * 0.9;
        DFS.boat(ctx, bx, by, 0.44, { t, alpha: 0.9, color: '22,18,10', figure: true, figureColor: '20,16,9' });
        ctx.globalAlpha = p * 0.22;
        ctx.strokeStyle = 'rgba(60,50,32,0.6)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const yy = by + 16 + i * 9;
          ctx.beginPath();
          ctx.moveTo(bx - 42 + i * 8, yy);
          ctx.lineTo(bx + 42 - i * 8, yy);
          ctx.stroke();
        }
        ctx.restore();
      }

      /* ---------- 终极海报帧 ---------- */
      if (pPoster.alpha > 0.01 && tLineOut < 1) {
        const a = (1 - tLineOut);
        ctx.save();
        ctx.globalAlpha = pPoster.alpha * a;
        // 第一行：苍山灰细体
        HUB.title(ctx, '他没能致君尧舜上，', {
          x: W / 2, y: 372 - pPoster.dy * 0.5, size: 44, weight: 300, family: T.fonts.serif,
          color: 'rgba(96,90,78,0.92)', align: 'center', tracking: 2
        });
        // 第二行：徽墨超粗 + 朱砂核心词
        HUB.quote(ctx, '却把整个时代，写成了诗。', {
          x: W / 2, y: 452 - pPoster.dy * 0.35, size: 64, weight: 900, family: T.fonts.heavy,
          color: 'rgba(18,14,9,0.96)', highlight: '写成了诗', highlightColor: T.colors.cinnabar,
          align: 'center', tracking: 2
        });
        DFS.dbgBox('poster', W / 2 - 560, 330, W / 2 + 560, 490);
        ctx.restore();
      }

      /* ---------- 化烟 ---------- */
      if (tLineOut > 0.01 && tLineOut < 1) {
        ctx.save();
        HUB.offscreenWindDissolve(ctx, '写成了诗', W * 0.5 + 300, 452, {
          size: 64, weight: 900, family: T.fonts.heavy, assemble: 1,
          dissolve: tLineOut, wind: 1.1, color: '200,54,36', sizePx: 2.4, seed: 71
        });
        ctx.restore();
      }

      /* ---------- 单字「诗」 ---------- */
      if (tOne > 0.001 && tBlack < 0.98) {
        const p = DFS.Ease.outExpo(tOne);
        ctx.save();
        ctx.globalAlpha = p * (1 - tBlack) * 0.95;
        HUB.title(ctx, '诗', {
          x: W / 2, y: H * 0.5, size: 96, weight: 400, family: T.fonts.serif,
          color: 'rgba(28,21,10,0.94)', align: 'center'
        });
        ctx.restore();
      }

      /* ---------- 转黑 ---------- */
      if (tBlack > 0.001) {
        ctx.save();
        ctx.globalAlpha = DFS.Ease.inOutCubic(tBlack);
        ctx.fillStyle = '#070705';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      /* ---------- 落版 ---------- */
      if (tCard > 0.001) {
        const p = DFS.Ease.outExpo(tCard);
        const shake = HUB.cameraShake(Math.round(t * 60), { amp: 6, decay: 11 });
        ctx.save();
        HUB.applyCameraShake(ctx, shake);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = p * 0.72;
        ctx.font = DFS.font(24, 400, T.fonts.serif);
        ctx.fillStyle = 'rgba(206,200,184,0.7)';
        ctx.fillText('七七〇年冬　湘江　一条船', W * 0.5, H * 0.335);

        ctx.globalAlpha = p * 0.98;
        HUB.title(ctx, '杜甫', {
          x: W / 2, y: H * 0.455, size: 132, weight: 900, family: T.fonts.heavy,
          color: 'rgba(240,235,220,0.97)', align: 'center', tracking: 10
        });
        ctx.globalAlpha = p * 0.75;
        HUB.monoNums(ctx, '712 — 770', W * 0.5, H * 0.585, 30, { color: 'rgba(214,208,190,0.85)', align: 'center' });
        ctx.globalAlpha = p * 0.9;
        ctx.fillStyle = T.colors.cinnabar;
        ctx.fillRect(W * 0.5 - 130 * p, H * 0.545, 260 * p, 2.2);
        ctx.restore();
        DFS.dbgBox('final-name', W * 0.5 - 200, H * 0.40, W * 0.5 + 200, H * 0.50);

        if (tSeal > 0.001) {
          const sp = DFS.Ease.outExpo(tSeal);
          HUB.inkStampSplash(ctx, W * 0.5 + 230, H * 0.455 + 14, sp, 12, {
            size: 84, text: '诗圣', chars: 'multi', rotate: 0.04
          });
        }
      }

      /* ---------- 收尾 ---------- */
      if (L > 13.3) {
        ctx.save();
        ctx.globalAlpha = clamp((L - 13.3) / 0.7);
        ctx.fillStyle = '#050504';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    hudDark(L) { return L > 11.3; }
  };
})(window.DFS);
