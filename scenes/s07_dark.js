/* =========================================================================
   s07_dark.js — 54.8–64.0s 崩塌之问
   如果有一天 → 你的人生突然崩塌（字落）→ 焦虑墙 → 废物（红圈）→ 你会怎么办？
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease, hash } = DFS;
  const T = DFS.THEME;

  DFS.sceneRegistry['s07'] = class Scene07 {
    constructor() {
      // 「崩塌」二字的落体（预烘焙：解析式近似，确定性）
      this.falls = [
        { ch: '崩', x: -78, delay: 0.0, rot: -0.10 },
        { ch: '塌', x: 78, delay: 0.055, rot: 0.09 }
      ];
    }

    draw(ctx, L, t) {
      /* ---------- 底：近黑 ---------- */
      const g = ctx.createRadialGradient(W * 0.5, H * 0.46, 60, W * 0.5, H * 0.5, H * 1.1);
      g.addColorStop(0, '#14130F');
      g.addColorStop(0.6, '#0C0C09');
      g.addColorStop(1, '#050504');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      const baseA = ctx.globalAlpha;

      /* ---------- 焦虑墙（背景重复文字） ---------- */
      const wallA = clamp((L - 3.2) / 1.6) * (1 - clamp((L - 7.4) / 0.9));
      if (wallA > 0.01) {
        ctx.save();
        ctx.globalAlpha = baseA * wallA;
        DFS.textWall(ctx, {
          text: '无法改变环境，无法改变自己，每天都很焦虑。',
          x: -40, y: H * 0.06, w: W * 1.05, h: H * 0.9,
          size: 26, alpha: 0.16, color: '226,224,210', lineH: 1.85, tracking: 10
        });
        ctx.restore();
      }

      /* ---------- 1. 如果有一天， ---------- */
      if (L > 0.25) {
        const p = Ease.outExpo(clamp((L - 0.25) / 0.8));
        const out = clamp((L - 2.6) / 0.5);
        ctx.save();
        ctx.globalAlpha = baseA * p * (1 - out) * 0.85;
        ctx.textAlign = 'center';
        ctx.font = DFS.font(34, 400, T.fonts.serif);
        ctx.fillStyle = 'rgba(226,222,208,0.86)';
        ctx.fillText('如果有一天，', W * 0.5, H * 0.235);
        ctx.restore();
      }

      /* ---------- 2. 你的人生 ---------- */
      if (L > 1.05) {
        const p = Ease.outExpo(clamp((L - 1.05) / 0.75));
        const out = clamp((L - 4.35) / 0.6);
        ctx.save();
        ctx.globalAlpha = baseA * (1 - out);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = DFS.font(132, 500, T.fonts.heavy);
        ctx.fillStyle = 'rgba(246,242,228,0.97)';
        const txt = '你的人生';
        const chars = Array.from(txt);
        chars.forEach((c, i) => {
          const pp = Ease.outExpo(clamp((L - 1.05 - i * 0.06) / 0.7));
          ctx.globalAlpha = baseA * pp * (1 - out);
          ctx.fillText(c, W * 0.5 + (i - 1.5) * 140, H * 0.40 + (1 - pp) * 24);
        });
        ctx.restore();
      }

      /* ---------- 3. 突然崩塌（字落） ---------- */
      if (L > 2.05) {
        const startY = H * 0.52;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = DFS.font(84, 400, T.fonts.serif);
        const tFall = clamp((L - 2.55) / 1.25);
        this.falls.forEach((f, i) => {
          const fp = clamp((tFall - f.delay) / 1.0);
          // 自由落体 + 一次小回弹
          const fall = Ease.inCubic(fp);
          const bounce = Math.sin(clamp((fp - 0.75) / 0.25) * Math.PI) * 14 * (fp > 0.75 ? 1 : 0);
          const dy = fall * H * 0.34 - bounce;
          const rot = fall * (i ? 0.9 : -1.1) * 0.5 + f.rot;
          const alpha = clamp((L - 2.05) / 0.5) * (1 - clamp((L - 4.2) / 0.6));
          if (alpha <= 0.01) return;
          ctx.save();
          ctx.globalAlpha = baseA * alpha;
          ctx.translate(W * 0.5 + f.x * 1.9, startY + dy);
          ctx.rotate(rot);
          ctx.fillStyle = 'rgba(230,226,212,0.92)';
          ctx.fillText(f.ch, 0, 0);
          ctx.restore();
        });
        // 「突然」二字的静态前引
        const p2 = Ease.outExpo(clamp((L - 2.05) / 0.6));
        const out2 = clamp((L - 4.2) / 0.6);
        ctx.globalAlpha = baseA * p2 * (1 - out2) * 0.9;
        ctx.fillStyle = 'rgba(206,202,190,0.9)';
        ctx.font = DFS.font(56, 400, T.fonts.serif);
        ctx.fillText('突然', W * 0.5 - 350, H * 0.52);
        ctx.restore();
      }

      /* ---------- 4. 三行方块 ---------- */
      if (L > 3.55) {
        const lines = ['无法改变环境', '无法改变自己', '每天都很焦虑。'];
        ctx.save();
        lines.forEach((line, i) => {
          const st = 3.55 + i * 0.42;
          const p = Ease.outExpo(clamp((L - st) / 0.55));
          if (p <= 0.001) return;
          const out = clamp((L - 6.5) / 0.6);
          ctx.globalAlpha = baseA * p * (1 - out) * 0.95;
          ctx.textAlign = 'left';
          ctx.font = DFS.font(44, 400, T.fonts.serif);
          const yy = H * 0.30 + i * 78;
          const xx = W * 0.115 + (1 - p) * 18;
          const tw = ctx.measureText(line).width;
          // 细框
          ctx.strokeStyle = 'rgba(228,224,210,0.42)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(xx - 16, yy - 40, tw + 32, 58);
          ctx.fillStyle = 'rgba(234,230,216,0.94)';
          ctx.fillText(line, xx, yy);
        });
        ctx.restore();
      }

      /* ---------- 5. 自己是个 ---------- */
      if (L > 6.15) {
        const p = Ease.outExpo(clamp((L - 6.15) / 0.7));
        ctx.save();
        ctx.globalAlpha = baseA * p * 0.9;
        ctx.textAlign = 'center';
        ctx.font = DFS.font(30, 400, T.fonts.serif);
        ctx.fillStyle = 'rgba(216,212,198,0.8)';
        ctx.fillText('连你自己都觉得，', W * 0.5, H * 0.275);
        ctx.font = DFS.font(96, 400, T.fonts.serif);
        ctx.fillStyle = 'rgba(244,240,226,0.96)';
        const out = clamp((L - 7.5) / 0.5);
        ctx.globalAlpha = baseA * p * (1 - out) * 0.96;
        ctx.fillText('自己是个', W * 0.5, H * 0.395);
        ctx.restore();
      }

      /* ---------- 6. 废物 + 红圈 ---------- */
      if (L > 6.95) {
        const p = Ease.snap(clamp((L - 6.95) / 0.55));
        const out = clamp((L - 8.05) / 0.5);
        if (p > 0.01 && out < 1) {
          ctx.save();
          ctx.globalAlpha = baseA * (1 - out);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // 手写体的「废物」——用楷体 + 轻微旋转
          ctx.translate(W * 0.5, H * 0.60);
          ctx.rotate(-0.05);
          ctx.scale(1 + (1 - p) * 0.35, 1 + (1 - p) * 0.35);
          ctx.font = DFS.font(140, 400, T.fonts.kai);
          ctx.fillStyle = 'rgba(238,234,220,0.97)';
          ctx.fillText('废物', 18, 0);
          ctx.restore();

          // 红圈
          DFS.handCircle(ctx, {
            x: W * 0.5 + 10, y: H * 0.60, rx: 215, ry: 150,
            progress: Ease.inOutCubic(clamp((L - 7.25) / 0.55)), lw: 5.5, seed: 33, rotate: -0.04
          });
          // 「你」的小标签
          const pt = clamp((L - 7.5) / 0.4);
          if (pt > 0) {
            ctx.save();
            ctx.globalAlpha = baseA * pt * 0.9;
            ctx.font = DFS.font(30, 400, T.fonts.kai);
            ctx.fillStyle = 'rgba(216,212,198,0.85)';
            ctx.textAlign = 'left';
            ctx.fillText('你', W * 0.5 - 260, H * 0.60 - 120);
            ctx.strokeStyle = 'rgba(216,212,198,0.55)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(W * 0.5 - 234, H * 0.60 - 112);
            ctx.lineTo(W * 0.5 - 160, H * 0.60 - 96);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      /* ---------- 7. 你会怎么办？ ---------- */
      if (L > 8.25) {
        const p = Ease.outExpo(clamp((L - 8.25) / 0.85));
        ctx.save();
        ctx.globalAlpha = baseA * p;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = DFS.font(110, 400, T.fonts.serif);
        ctx.fillStyle = 'rgba(248,244,230,0.98)';
        const chars = Array.from('你会怎么办？');
        chars.forEach((c, i) => {
          const pp = Ease.outExpo(clamp((L - 8.25 - i * 0.055) / 0.6));
          ctx.globalAlpha = baseA * p * pp;
          ctx.fillText(c, W * 0.5 + (i - 3) * 118, H * 0.48 + (1 - pp) * 20);
        });
        ctx.restore();
      }
    }

    hudDark() { return true; }
  };
})(window.DFS);
