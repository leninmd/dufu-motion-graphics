/* =========================================================================
   s08_cards.js — 63.8–70.0s 一手烂牌
   「可」→ 四张黑牌（落第/陷贼/弃官/漂泊）→ 翻面（春望/石壕吏/茅屋/登高）→「打成了诗史」
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease } = DFS;
  const T = DFS.THEME;

  DFS.sceneRegistry['s08'] = class Scene08 {
    constructor() {
      this.cards = [
        { back: '落第', front: '春望', sub: '七五七' },
        { back: '陷贼', front: '石壕吏', sub: '七五九' },
        { back: '弃官', front: '茅屋', sub: '七六一' },
        { back: '漂泊', front: '登高', sub: '七六七' }
      ];
    }

    draw(ctx, L, t) {
      const tPaper = clamp((L - 1.0) / 1.1);
      const tCardsIn = clamp((L - 1.45) / 1.3);
      const tFlip = clamp((L - 2.85) / 1.5);
      const tLine2 = clamp((L - 4.55) / 0.9);

      /* ---------- 1. 底：黑 → 纸 ---------- */
      ctx.fillStyle = '#080806';
      ctx.fillRect(0, 0, W, H);
      if (tPaper > 0.001) {
        ctx.save();
        ctx.globalAlpha = Ease.inOutCubic(tPaper);
        DFS.drawPaper(ctx, { zoom: 1.03 });
        DFS.drawGradientMesh(ctx, t, { c1: 'rgba(255,250,232,0.5)', c2: 'rgba(120,104,78,0.14)' });
        ctx.restore();
      }

      /* ---------- 2. 「可」 ---------- */
      if (L < 1.55) {
        const p = Ease.snap(clamp((L - 0.05) / 0.7));
        const out = clamp((L - 1.05) / 0.45);
        if (p > 0.01 && out < 1) {
          ctx.save();
          ctx.globalAlpha = (1 - out);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.translate(W * 0.5, H * 0.47);
          ctx.scale(1 + (1 - p) * 0.3, 1 + (1 - p) * 0.3);
          DFS.grainText(ctx, '可', {
            x: 0, y: 0, size: 300, weight: 700, family: T.fonts.heavy,
            color: 'rgba(244,240,226,0.97)', rough: 0.6, seed: 9
          });
          ctx.restore();
        }
      }

      /* ---------- 3. 四张牌 ---------- */
      const cardW = 210, cardH = 372, gap = 62;
      const totalW = this.cards.length * cardW + (this.cards.length - 1) * gap;
      const baseX = W * 0.5 - totalW / 2 + cardW / 2;
      const baseY = H * 0.525;

      if (tCardsIn > 0.001) {
        this.cards.forEach((c, i) => {
          const st = 1.45 + i * 0.11;
          const p = Ease.outExpo(clamp((L - st) / 0.75));
          if (p <= 0.001) return;
          const x = baseX + i * (cardW + gap);
          const y = baseY + (1 - p) * -220;
          const flipP = Ease.inOutCubic(clamp((tFlip - i * 0.10) / 0.85));
          const rotY = flipP * Math.PI;
          const front = flipP > 0.5;
          ctx.globalAlpha = clamp(p * 1.2);
          DFS.card(ctx, {
            x, y, w: cardW, h: cardH, rotY, front,
            label: front ? c.front : c.back,
            sub: front ? c.sub : '',
            textSize: front ? 48 : 54,
            seed: i + 2,
            alpha: clamp(p * 1.2)
          });
        });
      }

      /* ---------- 4. 文案 ---------- */
      if (L > 1.60) {
        const p = Ease.outExpo(clamp((L - 1.60) / 0.7));
        ctx.save();
        ctx.globalAlpha = p * 0.92;
        ctx.textAlign = 'left';
        ctx.font = DFS.font(46, 400, T.fonts.serif);
        ctx.fillStyle = 'rgba(34,26,14,0.9)';
        ctx.fillText('杜甫把一手烂牌，', W * 0.115, H * 0.170);
        ctx.restore();
      }

      if (tLine2 > 0.001) {
        const p = Ease.outExpo(tLine2);
        ctx.save();
        ctx.globalAlpha = p * 0.96;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.font = DFS.font(56, 500, T.fonts.heavy);
        ctx.fillStyle = 'rgba(28,21,10,0.95)';
        const x = W * 0.115;
        const y = H * 0.905;
        ctx.fillText('打成了', x, y);
        // 「诗史」朱色
        const px = x + ctx.measureText('打成了').width + 18;
        ctx.font = DFS.font(56, 500, T.fonts.heavy);
        ctx.fillStyle = T.colors.cinnabar;
        ctx.fillText('诗史', px, y);
        ctx.font = DFS.font(70, 500, T.fonts.heavy);
        ctx.fillStyle = T.colors.cinnabar;
        ctx.fillText('。', px + ctx.measureText('诗史').width + 4, y);
        ctx.restore();
      }

      /* ---------- 5. 收 ---------- */
      if (L > 5.7) {
        ctx.save();
        ctx.globalAlpha = clamp((L - 5.7) / 0.5) * 0.55;
        ctx.fillStyle = '#0A0906';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    hudDark(L) { return L < 1.3; }
  };
})(window.DFS);
