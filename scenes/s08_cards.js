/* =========================================================================
   s08_cards.js — 65.9–71.1s 一手烂牌 → 诗史（V2 居中黄金构图版）
   可 → 四张厄运牌（落第/陷贼/弃官/漂泊）180° 翻面为名篇 → 打成了 诗史
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease } = DFS;
  const HUB = DFS.HUB;
  const T = DFS.THEME;

  DFS.sceneRegistry['s08'] = class Scene08V2 {
    constructor() {
      this.cards = [
        { back: '落第', front: '春望', sub: '七五七' },
        { back: '陷贼', front: '石壕吏', sub: '七五九' },
        { back: '弃官', front: '茅屋', sub: '七六一' },
        { back: '漂泊', front: '登高', sub: '七六七' }
      ];
    }

    draw(ctx, L, t) {
      const tPaper = clamp((L - 0.35) / 0.75);
      const tKill = clamp((L - 0.62) / 0.35);        // 「可」退场
      const pTop = HUB.multiEntrance(L, 0.80, { duration: 0.65, rise: 26, blur: 7 });
      const tCards = clamp((L - 0.95) / 1.0);
      const tFlip = clamp((L - 1.75) / 1.35);
      const pBottom = HUB.multiEntrance(L, 3.05, { duration: 0.62, rise: 30, blur: 8 });

      /* ---------- 底：黑 → 纸 ---------- */
      ctx.fillStyle = '#080806';
      ctx.fillRect(0, 0, W, H);
      if (tPaper > 0.001) {
        ctx.save();
        ctx.globalAlpha = Ease.inOutCubic(tPaper);
        DFS.drawPaper(ctx, { zoom: 1.03 });
        DFS.drawGradientMesh(ctx, t, { c1: 'rgba(255,250,232,0.5)', c2: 'rgba(120,104,78,0.14)' });
        ctx.restore();
      }

      /* ---------- 「可」 ---------- */
      if (L < 1.05) {
        const p = Ease.snap(clamp(L / 0.55));
        const out = tKill;
        if (p > 0.01 && out < 1) {
          ctx.save();
          ctx.globalAlpha = (1 - out);
          ctx.translate(W * 0.5, H * 0.47);
          ctx.scale(1 + (1 - p) * 0.28, 1 + (1 - p) * 0.28);
          DFS.grainText(ctx, '可', {
            x: 0, y: 0, size: 320, weight: 900, family: T.fonts.heavy,
            color: 'rgba(244,240,226,0.97)', rough: 0.6, seed: 9
          });
          ctx.restore();
          DFS.dbgBox('ke', W * 0.5 - 170, H * 0.47 - 170, W * 0.5 + 170, H * 0.47 + 170);
        }
      }

      /* ---------- 上半句（居中） ---------- */
      if (pTop.alpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = pTop.alpha;
        HUB.title(ctx, '杜甫把一手烂牌，', {
          x: W / 2, y: 165 - pTop.dy, size: 60, weight: 700, family: T.fonts.heavy,
          color: 'rgba(24,20,14,0.94)', align: 'center', tracking: 4
        });
        DFS.dbgBox('cardline-top', W / 2 - 330, 120, W / 2 + 330, 210);
        ctx.restore();
      }

      /* ---------- 四张牌 ---------- */
      const cw = 210, chh = 372, gap = 62;
      const totalW = this.cards.length * cw + (this.cards.length - 1) * gap;
      const baseX = W * 0.5 - totalW / 2 + cw / 2;
      const baseY = 520;

      if (tCards > 0.001) {
        this.cards.forEach((c, i) => {
          const st = 0.95 + HUB.stagger(i, { frames: 6 });
          const p = HUB.springPhysics(clamp((L - st) / 0.7), { stiffness: 200, damping: 16 });
          if (p <= 0.001) return;
          const x = baseX + i * (cw + gap);
          const y = baseY + (1 - p) * -240;
          const flipP = Ease.inOutCubic(clamp((tFlip - HUB.stagger(i, { frames: 6 })) / 0.55));
          const rotY = flipP * Math.PI;
          const front = flipP > 0.5;
          // 牌下的投影
          ctx.save();
          ctx.globalAlpha = clamp(p) * 0.18;
          ctx.fillStyle = '#3A2E1C';
          ctx.beginPath();
          ctx.ellipse(x, baseY + chh / 2 + 26, cw * 0.46, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          DFS.card(ctx, {
            x, y, w: cw, h: chh, rotY, front,
            label: front ? c.front : c.back,
            sub: front ? c.sub : '',
            textSize: front ? 48 : 54,
            seed: i + 2,
            alpha: clamp(p)
          });

          // 翻面瞬间的高光扫过
          const sweep = Math.max(0, 1 - Math.abs(flipP - 0.5) / 0.16);
          if (sweep > 0.01) {
            ctx.save();
            ctx.globalAlpha = sweep * 0.55;
            ctx.fillStyle = 'rgba(255,248,226,0.9)';
            ctx.fillRect(x - cw / 2, y - chh / 2, cw, chh);
            ctx.restore();
          }
        });
        DFS.dbgBox('cardline-cards', baseX - cw / 2, baseY - chh / 2, baseX + totalW - cw / 2, baseY + chh / 2);
      }

      /* ---------- 落款：打成了 诗史 ---------- */
      if (pBottom.alpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = pBottom.alpha;
        const y = 895 - pBottom.dy;
        // 朱砂墨点
        DFS.splatter(ctx, W * 0.5, y - 6, {
          n: 160, radius: 150, progress: clamp((L - 3.05) / 0.5), seed: 77, alpha: 0.5
        });
        HUB.title(ctx, '打成了', {
          x: W * 0.5 - 150, y, size: 68, weight: 900, family: T.fonts.heavy,
          color: 'rgba(20,16,10,0.96)', align: 'right', tracking: 3
        });
        HUB.title(ctx, '诗史', {
          x: W * 0.5 - 120, y: y + 2, size: 78, weight: 900, family: T.fonts.heavy,
          color: T.colors.cinnabar, align: 'left', tracking: 6
        });
        DFS.dbgBox('cardline-bottom', W * 0.5 - 480, y - 60, W * 0.5 + 250, y + 60);
        ctx.restore();
      }
    }

    hudDark(L) { return L < 0.9; }
  };
})(window.DFS);
