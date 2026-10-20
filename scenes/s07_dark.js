/* =========================================================================
   s07_dark.js — 82.1–98.3s 劫难 · 多边形断碑
   五座 8~12 顶点破碎石碑自深空砸落，碑面阴刻史传原文（无一字杜撰）。
   落定后：数尝寇乱，挺节无所污。
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease } = DFS;
  const V3 = DFS.V3;
  const HUB = DFS.HUB;
  const T = DFS.THEME;

  const FPS = 60;

  DFS.sceneRegistry['s07'] = class Scene07V3 {
    constructor() {
      const st = DFS.STORY.texts;
      const ruins = new V3.FinePolyRuins({ seed: 9137, floorY: 1130, gravity: 3400 });
      const lines = st.s07_stele;
      const xs = [810, 900, 990, 1080, 1170];
      const ys = [-420, -360, -300, -380, -440];
      lines.forEach((line, i) => {
        ruins.add({
          text: line,
          x: xs[i], y: ys[i], w: 190, h: 620,
          fontSize: 26,
          releaseFrame: 120 + i * 22,
          vx: (i % 2 ? 1 : -1) * 26,
          vy: 40, av: (i % 2 ? 1 : -1) * 0.22
        });
      });
      this.ruins = ruins.bake(Math.round(16.2 * FPS), FPS);
    }

    draw(ctx, L, t, ch) {
      const frame = Math.round(t * FPS);
      const offset = Math.round(82.1 * FPS);
      const st = DFS.STORY.texts;

      const pCrack = clamp((L - 2.4) / 1.2);
      const pMain = HUB.multiEntrance(L, 9.1, { duration: 1.0, rise: 26, blur: 8 });
      const pSub = HUB.multiEntrance(L, 10.4, { duration: 0.9, rise: 20, blur: 6 });
      const pSrc = HUB.multiEntrance(L, 11.6, { duration: 0.8, rise: 12, blur: 4 });

      V3.eight(ctx, t, {
        void: true,
        voidInner: '#15130F', voidMid: '#0A0906', voidOuter: '#030302',
        grade: 'cold', grain: 0.52, vignette: 0.36, dustAlpha: 0.34,
        l2: (c) => {
          // 极淡的地面雾带
          const g = c.createLinearGradient(0, H * 0.66, 0, H);
          g.addColorStop(0, 'rgba(120,116,104,0)');
          g.addColorStop(0.55, 'rgba(120,116,104,0.10)');
          g.addColorStop(1, 'rgba(120,116,104,0.16)');
          c.fillStyle = g;
          c.fillRect(0, H * 0.66, W, H * 0.34);
        },
        l3: (c) => {
          // 一束极冷的顶光
          const g = c.createRadialGradient(W * 0.5, -H * 0.1, 40, W * 0.5, H * 0.55, H * 0.9);
          g.addColorStop(0, 'rgba(196,204,214,0.10)');
          g.addColorStop(1, 'rgba(196,204,214,0)');
          c.fillStyle = g;
          c.fillRect(0, 0, W, H);
        },
        l4: (c) => {
          this.ruins.draw(c, frame, offset, { alpha: 1 });
        },
        l5: (c) => {
          // 中央判词
          if (pMain.alpha > 0.01) {
            c.save();
            c.globalAlpha = pMain.alpha;
            V3.inkText(c, st.s07_main, {
              x: W * 0.5, y: 320 - pMain.dy * 0.5, size: 92, weight: 900,
              family: T.fonts.heavy, color: 'rgba(238,232,214,0.97)', tracking: 6
            });
            DFS.dbgBox('s07_main', W * 0.5 - 520, 260, W * 0.5 + 520, 380);
            c.restore();
          }
          if (pSub.alpha > 0.01) {
            c.save();
            c.globalAlpha = pSub.alpha * 0.9;
            V3.inkText(c, st.s07_sub, {
              x: W * 0.5, y: 430 - pSub.dy * 0.5, size: 40, weight: 400,
              family: T.fonts.serif, color: 'rgba(196,190,172,0.88)'
            });
            DFS.dbgBox('s07_sub', W * 0.5 - 300, 400, W * 0.5 + 300, 476);
            c.restore();
          }
          // 裂纹（从碑堆向上蔓延的暗裂）
          if (pCrack > 0.01) {
            c.save();
            c.globalAlpha = 0.35 * (1 - clamp((L - 6.5) / 2) * 0.5);
            c.strokeStyle = 'rgba(210,206,190,0.5)';
            c.lineWidth = 1.2;
            const r = DFS.rng(4471);
            for (let k = 0; k < 5; k++) {
              let x = W * (0.2 + 0.15 * k), y = H * 0.98;
              c.beginPath();
              c.moveTo(x, y);
              const steps = Math.round(9 * DFS.Ease.outCubic(pCrack));
              for (let i = 0; i < steps; i++) {
                x += (r() - 0.5) * 70;
                y -= 34 + r() * 26;
                c.lineTo(x, y);
              }
              c.stroke();
            }
            c.restore();
          }
        }
      });
    }

    hudDark() { return true; }
  };
})(window.DFS);
