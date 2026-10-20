/* =========================================================================
   s07_dark.js — 54.7–66.1s 黑屏诛心 · 刚体文字废墟（V2 立意重构版）
   不是"焦虑/废物"的自我内耗，而是杜甫的具身苦难：
   时代的灰尘砸下来 → 十年求仕 / 丧子 / 破屋 → 世人叫他废物 → 你还肯流泪吗
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp } = DFS;
  const HUB = DFS.HUB;
  const T = DFS.THEME;

  const START = 54.7;
  const FPS = 60;

  DFS.sceneRegistry['s07'] = class Scene07V2 {
    constructor() {
      const col = new HUB.PrebakedCollapse({ gravity: 3200, floorY: 1050, restitution: 0.12, friction: 0.82 });
      const big = [
        { ch: '你', x: 690, y: 402 }, { ch: '的', x: 830, y: 402 },
        { ch: '人', x: 970, y: 402 }, { ch: '生', x: 1110, y: 402 }
      ];
      big.forEach((b, i) => col.add({
        char: b.ch, x: b.x, y: b.y, w: 104, h: 104, fontSize: 96, weight: 900,
        family: T.fonts.heavy, color: 'rgba(246,242,230,0.97)',
        angle: (i - 1.5) * 0.01, releaseFrame: 206
      }));
      ['突', '然', '崩', '塌'].forEach((ch, i) => col.add({
        char: ch, x: 830 + i * 88, y: 566, w: 84, h: 90, fontSize: 80, weight: 700,
        family: T.fonts.serif, color: 'rgba(214,210,196,0.9)',
        angle: (i % 2 ? 0.03 : -0.03), releaseFrame: 330
      }));
      const plaques = [
        ['廿四岁 · 壮游齐赵', 470, 690],
        ['困守长安十年', 900, 690],
        ['幼子饿死同谷', 1330, 690],
        ['茅屋为秋风所破', 760, 800],
        ['战乱流离失所', 1180, 800]
      ];
      plaques.forEach((p, i) => col.add({
        char: p[0], x: p[1], y: p[2], w: 300, h: 56, fontSize: 30, weight: 500,
        family: T.fonts.serif, color: 'rgba(196,192,178,0.82)',
        angle: (i % 2 ? 0.02 : -0.02), releaseFrame: 340 + i * 26
      }));
      this.col = col.bake(720, FPS);
    }

    draw(ctx, L, t) {
      const frame = Math.round(t * FPS);
      const sceneStart = Math.round(START * FPS);
      const pLine1 = HUB.multiEntrance(L, 0.15, { duration: 0.7, rise: 20, blur: 6 });
      const pLine2 = HUB.multiEntrance(L, 1.25, { duration: 0.7, rise: 34, blur: 8 });
      const crackT = clamp((L - 2.35) / 0.45);
      const pSuffer = HUB.multiEntrance(L, 3.30, { duration: 0.7, rise: 24, blur: 5 });
      const pCircle = clamp((L - 7.05) / 0.42);
      const pAsk = HUB.multiEntrance(L, 8.85, { duration: 0.8, rise: 30, blur: 8 });
      const outAll = HUB.fastExit(L, 10.55, { duration: 0.5, blur: 8 });

      /* ---------- 五层：纯黑 ---------- */
      HUB.fiveLayerStack(ctx, t, {
        dark: true,
        night: { inner: '#141410', mid: '#0B0B08', outer: '#040403' },
        mesh1: 'rgba(70,68,52,0.10)',
        mesh2: 'rgba(20,20,14,0.35)',
        grain: 0.5, vignette: 0.34,
        layer2: (c) => {
          const a = clamp((L - 3.0) / 1.2) * (1 - clamp((L - 7.6) / 0.8));
          if (a > 0.01) {
            c.save();
            c.globalAlpha = a;
            DFS.textWall(c, {
              text: '困守长安十年　幼子饿死同谷　茅屋秋风破漏　战乱流离失所　',
              x: -30, y: 40, w: W * 1.02, h: H * 0.86,
              size: 24, alpha: 0.14, color: '226,222,206', lineH: 1.9, tracking: 12
            });
            c.restore();
          }
        }
      });

      /* ---------- 刚体废墟（常驻，不随文案淡出） ---------- */
      ctx.save();
      ctx.globalAlpha = 0.62;
      this.col.draw(ctx, frame, sceneStart, { alpha: 1 });
      ctx.restore();
      DFS.dbg({ ruinBodies: this.col.bodies.length });

      /* ---------- 文案 ---------- */
      ctx.save();
      const fade = outAll.alpha;

      if (L < 2.8) {
        ctx.save();
        ctx.globalAlpha = fade * pLine1.alpha * 0.85;
        HUB.title(ctx, '如果有一天，', {
          x: W / 2, y: H * 0.235, size: 34, weight: 400, family: T.fonts.serif,
          color: 'rgba(224,220,206,0.88)', align: 'center'
        });
        DFS.dbgBox('if-oneday', W / 2 - 120, H * 0.235 - 24, W / 2 + 120, H * 0.235 + 24);
        ctx.restore();
      }

      if (L > 1.2) {
        ctx.save();
        // 字块脱落后，静态标题淡出，避免与刚体字块重复
        const dup = 1 - clamp((L - 3.45) / 0.5);
        ctx.globalAlpha = fade * pLine2.alpha * 0.96 * dup;
        HUB.title(ctx, '你的人生', {
          x: W / 2, y: H * 0.372, size: 110, weight: 900, family: T.fonts.heavy,
          color: 'rgba(246,242,230,0.97)', align: 'center', tracking: 6
        });
        DFS.dbgBox('your-life', W / 2 - 250, H * 0.372 - 70, W / 2 + 250, H * 0.372 + 70);
        ctx.restore();
      }

      if (crackT > 0 && crackT < 1) {
        ctx.save();
        ctx.globalAlpha = (1 - Math.abs(crackT - 0.35) / 0.65) * 0.75;
        ctx.strokeStyle = 'rgba(255,252,240,0.9)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        const r = DFS.rng(88);
        let x = W * 0.5, y = H * 0.14;
        ctx.moveTo(x, y);
        for (let i = 0; i < 14; i++) {
          x += (r() - 0.5) * 120;
          y += H * 0.055;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      if (L > 3.3 && L < 8.3) {
        ctx.save();
        const lines = ['十年求职无门，', '半生流离失所，', '连家人的屋顶都护不住。'];
        lines.forEach((ln, i) => {
          const p = HUB.multiEntrance(L, 3.3 + i * 0.34, { duration: 0.55, rise: 18, blur: 5 });
          ctx.save();
          ctx.globalAlpha = fade * p.alpha * 0.92;
          ctx.font = DFS.font(i === 2 ? 42 : 34, i === 2 ? 500 : 400, T.fonts.serif);
          ctx.fillStyle = 'rgba(228,224,210,0.92)';
          ctx.textAlign = 'left';
          ctx.fillText(ln, W * 0.085, H * 0.295 + i * 72 - p.dy);
          ctx.restore();
        });
        DFS.dbgBox('suffer', W * 0.085, H * 0.295 - 44, W * 0.085 + 640, H * 0.295 + 160);
        ctx.restore();
      }

      if (L > 6.3 && L < 8.55) {
        ctx.save();
        ctx.globalAlpha = fade;
        const p = HUB.springPhysics(clamp((L - 6.3) / 0.55), { stiffness: 220, damping: 15 });
        ctx.save();
        ctx.translate(W * 0.5 + 10, H * 0.545);
        ctx.rotate(-0.045);
        const sc = 0.9 + 0.1 * p;
        ctx.scale(sc, sc);
        ctx.font = DFS.font(132, 400, T.fonts.kai);
        ctx.fillStyle = 'rgba(240,236,222,0.96)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('废物', 16, 0);
        ctx.restore();
        ctx.font = DFS.font(24, 400, T.fonts.kai);
        ctx.fillStyle = 'rgba(206,202,188,0.58)';
        ctx.textAlign = 'center';
        ctx.fillText('—— 世人如此评说', W * 0.5 + 30, H * 0.545 + 106);
        DFS.dbgBox('feiwu', W * 0.5 - 190, H * 0.545 - 90, W * 0.5 + 210, H * 0.545 + 120);
        ctx.restore();

        if (pCircle > 0) {
          DFS.handCircle(ctx, {
            x: W * 0.5 + 16, y: H * 0.545, rx: 200, ry: 142,
            progress: DFS.Ease.inOutCubic(pCircle), lw: 6, seed: 41, rotate: -0.03
          });
        }
      }

      if (L > 8.85) {
        ctx.save();
        ctx.globalAlpha = fade * pAsk.alpha;
        HUB.quote(ctx, '你还肯为这个人间，流一滴眼泪吗？', {
          x: W / 2, y: H * 0.50, size: 74, weight: 900, family: T.fonts.heavy,
          color: 'rgba(248,244,230,0.98)', highlight: '流一滴眼泪', highlightColor: T.colors.cinnabar,
          align: 'center'
        });
        DFS.dbgBox('ask', W / 2 - 620, H * 0.50 - 50, W / 2 + 620, H * 0.50 + 50);
        ctx.restore();
      }

      ctx.restore();

      const tail = clamp((L - 10.9) / 0.5);
      if (tail > 0) {
        ctx.save();
        ctx.globalAlpha = tail * 0.85;
        ctx.fillStyle = '#050504';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    hudDark() { return true; }
  };
})(window.DFS);
