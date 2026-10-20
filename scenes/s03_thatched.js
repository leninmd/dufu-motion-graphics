/* =========================================================================
   s03_thatched.js — 13.4–23.8s 秋风茅屋
   阴雨暮色 → 风吹茅草 → 「八月秋高风怒号」→ 雨 → 子弹时间「安得广厦千万间」
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease } = DFS;
  const T = DFS.THEME;

  DFS.sceneRegistry['s03'] = class Scene03 {
    constructor() {
      this.rainFar = new DFS.Rain({ n: 220, seed: 91, speed: 1500, alpha: 0.45, layer: 0, lenK: 0.026 });
      this.rainMid = new DFS.Rain({ n: 170, seed: 92, speed: 2100, alpha: 0.55, layer: 1, lenK: 0.030 });
      this.rainNear = new DFS.Rain({ n: 64, seed: 93, speed: 2900, alpha: 0.62, layer: 2, lenK: 0.034 });

      this.reedFar = new DFS.Reeds({ n: 70, seed: 71, color: '30,31,25', alpha: 0.30, blur: 6, hMin: 0.22, hMax: 0.50, width: 4.5, yBase: 0.86 });
      this.reedMid = new DFS.Reeds({ n: 44, seed: 72, color: '16,17,12', alpha: 0.72, blur: 2.2, hMin: 0.38, hMax: 0.80, width: 6.0, yBase: 0.98, wind: 1.2 });
      this.reedNear = new DFS.Reeds({ n: 16, seed: 73, color: '8,9,6', alpha: 0.96, blur: 0, hMin: 0.52, hMax: 1.05, width: 9, yBase: 1.10, wind: 1.7 });

      this.strawData = (() => {
        const r = DFS.rng(515);
        return Array.from({ length: 150 }, () => ({
          y: r(), x: r(), len: 0.02 + r() * 0.05, sp: 0.25 + r() * 0.8, rot: (r() - 0.5) * 0.7, w: 0.8 + r() * 2.2
        }));
      })();
    }

    /* 茅屋：左下方的剪影，屋顶被风掀开一角 */
    drawRoof(ctx, t, o = {}) {
      const { alpha = 1, lift = 0 } = o;
      const r = DFS.rng(441);
      const cx = W * 0.20;
      const baseY = H * 1.02;
      const eaveY = H * 0.80;
      const peakY = H * 0.635 - lift;
      const halfW = W * 0.155;

      ctx.save();
      ctx.globalAlpha = alpha;
      // 屋身
      const bg = ctx.createLinearGradient(0, eaveY, 0, baseY);
      bg.addColorStop(0, 'rgba(14,15,11,0.97)');
      bg.addColorStop(1, 'rgba(5,5,4,1)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(cx - halfW * 0.86, eaveY + 6);
      ctx.lineTo(cx + halfW * 0.86, eaveY + 6);
      ctx.lineTo(cx + halfW * 0.92, baseY);
      ctx.lineTo(cx - halfW * 0.92, baseY);
      ctx.closePath();
      ctx.fill();

      // 屋顶：两条坡，右坡有一处被掀开的缺口
      ctx.fillStyle = 'rgba(9,10,7,0.99)';
      ctx.beginPath();
      ctx.moveTo(cx - halfW * 1.10, eaveY + 10);
      ctx.lineTo(cx - halfW * 0.92, peakY + 18);
      ctx.lineTo(cx - halfW * 0.30, peakY);
      ctx.lineTo(cx + halfW * 0.30, peakY + 4);
      ctx.lineTo(cx + halfW * 0.92, peakY + 30);
      ctx.lineTo(cx + halfW * 1.12, eaveY + 10);
      ctx.closePath();
      ctx.fill();

      // 被掀开的破洞（露出背后的天光）
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const hole = ctx.createLinearGradient(cx + halfW * 0.1, peakY, cx + halfW * 0.9, eaveY);
      hole.addColorStop(0, 'rgba(0,0,0,0.85)');
      hole.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hole;
      ctx.beginPath();
      ctx.moveTo(cx + halfW * 0.20, peakY + 8);
      ctx.lineTo(cx + halfW * 0.72, peakY + 26);
      ctx.lineTo(cx + halfW * 0.98, eaveY - 30);
      ctx.lineTo(cx + halfW * 0.34, eaveY - 76);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 屋顶的茅草纹理
      ctx.lineCap = 'round';
      for (let i = 0; i < 220; i++) {
        const u = r(), v = r();
        const x = lerp(cx - halfW * 1.05, cx + halfW * 1.05, u);
        const edge = peakY + Math.abs(u - 0.5) * (eaveY - peakY) * 1.5;
        const y = lerp(edge + 4, eaveY, v);
        const len = 26 + r() * 90;
        ctx.strokeStyle = `rgba(${34 + r() * 46},${34 + r() * 46},${28 + r() * 34},${0.08 + r() * 0.22})`;
        ctx.lineWidth = 0.9 + r() * 2.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 10 + r() * 26, y + len);
        ctx.stroke();
      }

      // 屋檐与屋脊的碎草（被风掀起）
      for (let i = 0; i < 130; i++) {
        const u = r();
        const x = lerp(cx - halfW * 1.15, cx + halfW * 1.15, u);
        const y = eaveY + 8 + (r() - 0.5) * 12;
        const len = 26 + r() * 120;
        const dir = Math.sin(t * 1.4 + i) * 10;
        ctx.strokeStyle = `rgba(${118 + r() * 50},${116 + r() * 50},${100 + r() * 40},${0.06 + r() * 0.22})`;
        ctx.lineWidth = 0.7 + r() * 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len * 0.5, y - 10 - r() * 26 + dir, x + len, y - 6 - r() * 40 + dir);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawStraws(ctx, t, o = {}) {
      const { alpha = 1, speed = 1 } = o;
      ctx.save();
      for (let i = 0; i < this.strawData.length; i++) {
        const s = this.strawData[i];
        const px = ((s.x + t * s.sp * 0.45 * speed) % 1.3 - 0.15) * W;
        const py = (s.y * 0.75 + 0.10 + Math.sin(t * 1.3 + i) * 0.025) * H;
        const len = s.len * W;
        ctx.globalAlpha = alpha * (0.18 + (i % 5) * 0.10);
        ctx.strokeStyle = 'rgba(214,210,192,0.75)';
        ctx.lineWidth = s.w;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + len * 0.5, py - 8 - s.rot * 22, px + len, py + s.rot * 30);
        ctx.stroke();
      }
      ctx.restore();
    }

    draw(ctx, L, t) {
      const tWind = Ease.outCubic(clamp(L / 1.4));
      const tRain = clamp((L - 1.0) / 2.2);
      const tBullet = clamp((L - 6.6) / 0.85);
      const tWhite = clamp((L - 8.8) / 1.3);
      const timeScale = lerp(1, 0.03, Ease.inOutCubic(tBullet));

      /* ---------- 1. 阴雨暮色 ---------- */
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#3A3C33');
      sky.addColorStop(0.45, '#4A4C41');
      sky.addColorStop(0.72, '#3D3F35');
      sky.addColorStop(1, '#212219');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      const hz = ctx.createRadialGradient(W * 0.62, H * 0.40, 20, W * 0.62, H * 0.40, W * 0.55);
      hz.addColorStop(0, 'rgba(226,226,208,0.16)');
      hz.addColorStop(0.5, 'rgba(210,212,196,0.07)');
      hz.addColorStop(1, 'rgba(210,212,196,0)');
      ctx.fillStyle = hz;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      /* ---------- 2. 草 ---------- */
      this.reedFar.draw(ctx, t * 0.55, {});
      this.reedMid.draw(ctx, t * 0.85, {});
      this.drawStraws(ctx, t, { alpha: clamp(0.3 + tWind * 0.7) * (1 - tBullet * 0.7), speed: 1 + tWind * 1.4 });

      /* ---------- 3. 茅屋剪影 ---------- */
      const roofA = clamp((L - 0.2) / 1.1);
      this.drawRoof(ctx, t, { alpha: roofA * (1 - tWhite * 0.95), lift: tWind * 12 });

      /* ---------- 4. 近景草 ---------- */
      this.reedNear.draw(ctx, t, {});

      /* ---------- 5. 雨 ---------- */
      const rainA = tRain * (1 - tWhite);
      if (rainA > 0.01) {
        this.rainFar.draw(ctx, L * timeScale, { alphaMul: rainA * 0.9 });
        this.rainMid.draw(ctx, L * timeScale, { alphaMul: rainA });
        if (tBullet > 0.02) {
          this.rainNear.beads = true;
          this.rainNear.draw(ctx, L * 0.02, { alphaMul: rainA * tBullet });
          this.rainNear.beads = false;
        } else {
          this.rainNear.draw(ctx, L, { alphaMul: rainA });
        }
      }

      /* ---------- 6. 雨雾 ---------- */
      DFS.mist(ctx, t, { count: 5, alpha: 0.7, y0: H * 0.45, y1: H * 0.95, color: '226,226,210' });

      /* ---------- 7. 文字 ---------- */
      const s1 = 2.45;
      if (L > s1) {
        const out = clamp((L - 4.8) / 0.7);
        ctx.save();
        ctx.globalAlpha = 1 - out;
        DFS.textIn(ctx, '八月秋高风怒号', {
          x: W / 2, y: H * 0.285, size: 108, weight: 500, family: T.fonts.serif,
          color: 'rgba(242,238,222,0.97)', t: L, start: s1, dur: 0.62, stagger: 0.08,
          rise: 24, from: 0.93, blur: 7, tracking: 12
        });
        ctx.restore();
      }

      const s2 = 4.3;
      if (L > s2) {
        const out = clamp((L - 6.6) / 0.7);
        ctx.save();
        ctx.globalAlpha = (1 - out) * 0.95;
        DFS.verticalIn(ctx, '大庇天下寒士', {
          x: W * 0.80, y: H * 0.155, size: 74, weight: 400, family: T.fonts.serif,
          color: 'rgba(236,232,214,0.95)', t: L, start: s2, stagger: 0.09, dur: 0.55, gap: 1.18
        });
        ctx.restore();
      }

      const s3 = 6.5;
      if (L > s3) {
        const p = Ease.outExpo(clamp((L - s3) / 0.9));
        ctx.save();
        DFS.blurDraw(ctx, 14 * (1 - p), () => {
          ctx.font = DFS.font(100, 500, T.fonts.serif);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const text = '安得广厦千万间';
          const chars = Array.from(text);
          const step = 112;
          chars.forEach((c, i) => {
            const pp = Ease.outExpo(clamp((L - s3 - i * 0.06) / 0.55));
            ctx.globalAlpha = p * pp * (1 - tWhite * 0.7);
            ctx.fillStyle = 'rgba(248,244,228,0.98)';
            ctx.fillText(c, W / 2 + (i - (chars.length - 1) / 2) * step, H * 0.40 + (1 - pp) * 18);
          });
        });
        ctx.restore();

        const rp = clamp((L - 7.0) / 1.1);
        if (rp > 0) {
          ctx.save();
          ctx.globalAlpha = rp * 0.8 * (1 - tWhite);
          const gg = ctx.createLinearGradient(0, H * 0.14, 0, H * 0.9);
          gg.addColorStop(0, 'rgba(216,64,42,0)');
          gg.addColorStop(0.15, 'rgba(216,64,42,0.9)');
          gg.addColorStop(0.85, 'rgba(186,50,30,0.9)');
          gg.addColorStop(1, 'rgba(186,50,30,0)');
          ctx.fillStyle = gg;
          ctx.fillRect(W * 0.5 - 5 + Math.sin(L * 0.9) * 2, H * 0.14, 11, H * 0.76 * rp);
          ctx.restore();
        }
      }

      /* ---------- 8. 转纸白 ---------- */
      if (tWhite > 0.001) {
        ctx.save();
        ctx.globalAlpha = Ease.inOutCubic(tWhite);
        DFS.drawPaper(ctx, { zoom: 1.04 });
        ctx.restore();
      }
    }

    hudDark(L) { return L < 8.6; }
  };
})(window.DFS);
