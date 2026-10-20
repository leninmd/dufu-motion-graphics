/* =========================================================================
   s06_timeline.js — 46.8–55.0s 诗史长卷
   粒子诗「诗是吾家事」→ 朱印「少陵野老」→ 一生轨迹线 + 里程
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease } = DFS;
  const T = DFS.THEME;

  DFS.sceneRegistry['s06'] = class Scene06 {
    constructor() {
      // 一生轨迹（与 storyboard 的 HUD 里数一致）
      this.stations = [
        { name: '巩县', year: '七一二', km: 0, rel: 0.00 },
        { name: '兖州', year: '七三六', km: 705, rel: 0.15 },
        { name: '长安', year: '七四六', km: 1840, rel: 0.34 },
        { name: '秦州', year: '七五九', km: 2800, rel: 0.58 },
        { name: '成都', year: '七六〇', km: 3100, rel: 0.69 },
        { name: '夔州', year: '七六六', km: 3880, rel: 0.84 },
        { name: '潭州', year: '七七〇', km: 4739, rel: 1.00 }
      ];
    }

    draw(ctx, L, t) {
      const tPoemOut = clamp((L - 3.4) / 0.8);
      const tLine = clamp((L - 4.2) / 2.6);
      const tText = clamp((L - 4.9) / 0.8);

      /* ---------- 1. 底 ---------- */
      DFS.drawPaper(ctx, { zoom: 1.02 });
      DFS.drawGradientMesh(ctx, t, { c1: 'rgba(255,250,232,0.55)', c2: 'rgba(120,104,78,0.14)' });

      /* ---------- 2. 粒子诗 ---------- */
      if (tPoemOut < 1) {
        const assemble = Ease.outCubic(clamp(L / 1.9));
        const out = tPoemOut;
        ctx.save();
        ctx.globalAlpha = 1 - out * 0.9;
        DFS.particleText(ctx, '诗是吾家事', {
          x: W * 0.5, y: H * 0.44, size: 132, weight: 500, family: T.fonts.kai,
          step: 4, vertical: true, gap: 1.12, seed: 19,
          assemble, dissolve: out, wind: 0.4, color: '30,22,11', sizePx: 2.0, t
        });
        ctx.restore();
      }

      /* ---------- 3. 朱印 ---------- */
      if (L > 2.75 && L < 5.6) {
        const p = Ease.outExpo(clamp((L - 2.75) / 0.42));
        const out = clamp((L - 5.0) / 0.6);
        ctx.save();
        ctx.globalAlpha = (1 - out);
        const s = 108 * (1.55 - 0.55 * p);
        DFS.seal(ctx, {
          x: W * 0.5 + 150, y: H * 0.44 + 190, size: s,
          text: '少陵野老', chars: 'multi', alpha: clamp(p * 1.4), seed: 4
        });
        ctx.restore();
      }

      /* ---------- 4. 一生轨迹线 ---------- */
      if (tLine > 0.001) {
        const x0 = W * 0.09, x1 = W * 0.91, y = H * 0.655;
        const prog = Ease.inOutCubic(tLine);
        const xEnd = lerp(x0, x1, prog);
        ctx.save();
        // 主线
        ctx.strokeStyle = 'rgba(200,54,36,0.92)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(xEnd, y);
        ctx.stroke();
        // 淡淡的起笔
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + 30, y);
        ctx.stroke();
        ctx.restore();

        // 站点
        for (const s of this.stations) {
          const sx = lerp(x0, x1, s.rel);
          if (sx > xEnd + 2) continue;
          const p = Ease.outExpo(clamp((xEnd - sx) / 40));
          ctx.save();
          ctx.globalAlpha = p;
          // 刻度
          ctx.strokeStyle = 'rgba(190,48,32,0.85)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(sx, y - 10); ctx.lineTo(sx, y + 10); ctx.stroke();
          ctx.fillStyle = 'rgba(190,48,32,0.95)';
          ctx.beginPath(); ctx.arc(sx, y, 3.6, 0, Math.PI * 2); ctx.fill();
          // 地名（上）
          ctx.textAlign = 'center';
          ctx.font = DFS.font(27, 400, T.fonts.serif);
          ctx.fillStyle = 'rgba(44,35,20,0.9)';
          ctx.fillText(s.name, sx, y - 26);
          // 年份（下）
          ctx.font = DFS.font(18, 400, T.fonts.mono);
          ctx.fillStyle = 'rgba(60,48,30,0.6)';
          ctx.fillText(s.year, sx, y + 34);
          // 里程（下二行）
          ctx.font = DFS.font(15, 400, T.fonts.mono);
          ctx.fillStyle = 'rgba(60,48,30,0.42)';
          ctx.fillText(DFS.km(s.km), sx, y + 56);
          ctx.restore();
        }

        // 终点强调：姓名与总里程
        const pEnd = Ease.outExpo(clamp((xEnd - (x1 - 8)) / 30));
        if (pEnd > 0.01) {
          ctx.save();
          ctx.globalAlpha = pEnd;
          ctx.textAlign = 'right';
          ctx.font = DFS.font(24, 400, T.fonts.mono);
          ctx.fillStyle = 'rgba(190,48,32,0.75)';
          ctx.fillText('4,739 km', x1, y - 64);
          ctx.restore();
        }
      }

      /* ---------- 5. 说明文字 ---------- */
      if (tText > 0.001) {
        const lines = [
          '他一生走了四千七百公里，',
          '留下一千四百多首诗。',
          null,
          '没有一首，是写给自己看的。'
        ];
        ctx.save();
        lines.forEach((line, i) => {
          if (!line) return;
          const st = 4.9 + i * 0.55;
          const p = Ease.outExpo(clamp((L - st) / 0.6));
          if (p <= 0.001) return;
          ctx.globalAlpha = p * 0.92;
          ctx.textAlign = 'left';
          ctx.font = DFS.font(i === 3 ? 34 : 30, i === 3 ? 500 : 400, T.fonts.serif);
          ctx.fillStyle = i === 3 ? 'rgba(26,19,9,0.94)' : 'rgba(48,38,22,0.82)';
          const yy = H * 0.20 + i * 56 + (1 - p) * 12;
          ctx.fillText(line, W * 0.09, yy);
        });
        ctx.restore();
      }

      /* ---------- 6. 细网格（图纸感） ---------- */
      ctx.save();
      ctx.globalAlpha = 0.05 * clamp(tLine * 1.4);
      ctx.strokeStyle = 'rgba(40,32,18,1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 12; i++) {
        const x = W * i / 12;
        ctx.beginPath(); ctx.moveTo(x, H * 0.60); ctx.lineTo(x, H * 0.72); ctx.stroke();
      }
      ctx.restore();

      /* ---------- 7. 收 ---------- */
      if (L > 7.5) {
        ctx.save();
        ctx.globalAlpha = clamp((L - 7.5) / 0.7) * 0.5;
        ctx.fillStyle = '#070705';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    hudDark() { return false; }
  };
})(window.DFS);
