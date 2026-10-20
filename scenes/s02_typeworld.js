/* =========================================================================
   s02_typeworld.js — 3.0–13.6s 盛世与崩塌
   活字方阵 → 「会当凌绝顶 / 致君尧舜上」红牌 → 落第 → 七五五 渔阳鼙鼓 → 国破
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease } = DFS;
  const T = DFS.THEME;

  DFS.sceneRegistry['s02'] = class Scene02 {
    constructor() {
      this.field = new DFS.TypeField({
        seed: 16350, rows: 46, cols: 46, spacing: 0.82, blockW: 0.72, blockH: 0.56,
        gap: 3,
        text: '国破山河在城春草木深感时花溅泪恨别鸟惊心烽火连三月家书抵万金白头搔更短浑欲不胜簪会当凌绝顶一览众山小致君尧舜上再使风俗淳朱门酒肉臭路有冻死骨'
      });
      this.cam = new DFS.Camera({ pos: { x: 0, y: 2.2, z: 7.0 }, yaw: 0, pitch: -0.44 });
      this.row1 = '会当凌绝顶';
      this.row2 = '致君尧舜上';
    }

    draw(ctx, L, t) {
      // 场景内时间分片
      const phaseCollapse = clamp((L - 5.4) / 1.05);      // 5.4s 起崩塌
      const phaseDark = clamp((L - 6.6) / 1.2);           // 转入黑场
      const dark = phaseDark;

      /* ---------- 1. 底：宣纸 → 夜 ---------- */
      DFS.drawPaper(ctx, { zoom: 1.02 + L * 0.004 });
      if (dark > 0.001) {
        ctx.save();
        ctx.globalAlpha = dark;
        DFS.drawNight(ctx, { inner: '#26251B', mid: '#191A12', outer: '#080905' });
        ctx.restore();
      }
      DFS.drawGradientMesh(ctx, t, {
        c1: dark > 0.5 ? 'rgba(90,84,58,0.20)' : 'rgba(255,250,232,0.55)',
        c2: 'rgba(120,104,78,0.16)', a1: 1 - dark
      });

      /* ---------- 2. 活字方阵 ---------- */
      const camZ = lerp(7.2, 1.2, Ease.inOutCubic(clamp(L / 6.4)));
      const camY = lerp(2.2, 2.0, clamp(L / 6.4));
      const camX = Math.sin(L * 0.22) * 0.35;
      this.cam.pos = { x: camX, y: camY, z: camZ };
      this.cam.pitch = lerp(-0.44, -0.46, clamp(L / 6.4));

      const sink = phaseCollapse * 3.4;
      const alphaField = 1 - phaseDark * 0.92;
      if (alphaField > 0.03) {
        this.field.drawFlat(ctx, this.cam, t, {
          alphaMul: alphaField,
          fogNear: 2.6, fogFar: 12.5,
          inkColor: dark > 0.5 ? 'rgba(224,214,188,0.72)' : 'rgba(18,14,8,0.88)',
          lift: sink * 0.35
        });
      }

      // 地平线上的亮带（灭点处的高光）
      if (dark < 0.6) {
        ctx.save();
        ctx.globalAlpha = 0.55 * (1 - dark);
        const g = ctx.createRadialGradient(W / 2, H * 0.10, 0, W / 2, H * 0.10, W * 0.45);
        g.addColorStop(0, 'rgba(255,252,240,0.85)');
        g.addColorStop(0.4, 'rgba(255,250,236,0.35)');
        g.addColorStop(1, 'rgba(255,250,236,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H * 0.6);
        ctx.restore();
      }

      /* ---------- 3. 红字牌：一对句 ---------- */
      const r1s = 1.15, r2s = 3.05;
      const tileSize = 128;
      const gap = 26;
      const rowW = this.row1.length * tileSize + (this.row1.length - 1) * gap;

      if (L > r1s - 0.2 && dark < 0.55) {
        const drop = phaseCollapse;
        ctx.save();
        ctx.globalAlpha = (1 - dark * 1.6);
        Array.from(this.row1).forEach((ch, i) => {
          const st = r1s + i * 0.085;
          const p = Ease.spring(clamp((L - st) / 0.62), 5.2, 4.6);
          if (p <= 0.001) return;
          const x = W / 2 - rowW / 2 + i * (tileSize + gap) + tileSize / 2;
          const y = H * 0.40 + (1 - p) * -120 + drop * (26 + i * 5);
          const rot = (1 - p) * 0.10 + drop * 0.22 * (i % 2 ? 1 : -1);
          DFS.redTile(ctx, {
            x, y, size: tileSize, ch, alpha: clamp(p * 1.5) * (1 - drop * 0.9),
            rot, scale: 0.9 + 0.1 * p, seed: i + 3
          });
        });
        ctx.restore();
      }

      if (L > r2s - 0.2 && dark < 0.55) {
        ctx.save();
        ctx.globalAlpha = (1 - dark * 1.6);
        Array.from(this.row2).forEach((ch, i) => {
          const st = r2s + i * 0.075;
          const p = Ease.spring(clamp((L - st) / 0.6), 5.2, 4.6);
          if (p <= 0.001) return;
          const x = W / 2 - rowW / 2 + i * (tileSize + gap) + tileSize / 2;
          const y = H * 0.545 + (1 - p) * -100 + phaseCollapse * (30 + i * 6);
          DFS.redTile(ctx, {
            x, y, size: tileSize * 0.92, ch, alpha: clamp(p * 1.5),
            rot: (1 - p) * -0.08, scale: 0.9 + 0.1 * p, seed: i + 21
          });
        });
        ctx.restore();
      }

      // 右侧极小注释（参考片中诗题的位置）
      if (L > 4.2 && dark < 0.5) {
        const p = Ease.outExpo(clamp((L - 4.2) / 0.8));
        ctx.save();
        ctx.globalAlpha = p * 0.7 * (1 - dark * 2);
        ctx.font = DFS.font(26, 400, T.fonts.kai);
        ctx.fillStyle = 'rgba(52,44,32,0.9)';
        ctx.textAlign = 'left';
        ctx.fillText('《望岳》', W * 0.5 + rowW * 0.5 + 28, H * 0.40 + 8);
        ctx.globalAlpha = p * 0.7 * (1 - dark * 2);
        ctx.fillText('《奉赠韦左丞丈》', W * 0.5 + rowW * 0.5 + 28, H * 0.545 - 4);
        ctx.restore();
      }

      /* ---------- 4. 落第：朱印压顶 ---------- */
      if (L > 5.0) {
        const p = Ease.inExpo(clamp((L - 5.0) / 0.45));
        if (p > 0.01) {
          ctx.save();
          ctx.globalAlpha = p * (1 - dark);
          ctx.translate(W / 2, H * 0.40);
          ctx.rotate(-0.18);
          ctx.scale(1 + (1 - p) * 1.6, 1 + (1 - p) * 1.6);
          ctx.strokeStyle = T.colors.cinnabar;
          ctx.lineWidth = 10;
          ctx.strokeRect(-116, -116, 232, 232);
          ctx.fillStyle = T.colors.cinnabar;
          ctx.font = DFS.font(150, 700, T.fonts.heavy);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('落', -44, 0);
          ctx.font = DFS.font(150, 700, T.fonts.heavy);
          ctx.fillText('第', 52, 0);
          ctx.restore();
        }
      }

      /* ---------- 5. 七五五 · 渔阳鼙鼓 ---------- */
      if (L > 6.3) {
        const p = Ease.outExpo(clamp((L - 6.3) / 0.9));
        const out = clamp((L - 8.15) / 0.55);
        const a = p * (1 - out);
        if (a > 0.01) {
          ctx.save();
          ctx.globalAlpha = a;
          // 巨幅描边年份
          DFS.outlineText(ctx, '七五五', {
            x: W / 2 + (1 - p) * -40, y: H * 0.50, size: 330, weight: 200,
            color: 'rgba(236,228,206,0.92)', lw: 3.2, tracking: 18,
            scale: 1 + (1 - p) * 0.12
          });
          // 小注
          ctx.globalAlpha = a * 0.9;
          ctx.textAlign = 'center';
          ctx.font = DFS.font(34, 400, T.fonts.serif);
          ctx.fillStyle = 'rgba(238,230,208,0.88)';
          ctx.fillText('渔阳鼙鼓动地来', W / 2, H * 0.50 + 232);
          ctx.font = DFS.font(22, 400, T.fonts.mono);
          ctx.globalAlpha = a * 0.55;
          ctx.fillText('AN  LUSHAN  ·  755', W / 2, H * 0.50 + 282);
          ctx.restore();
        }
      }

      // 红色「乱」字牌（参考片 10s 的单张亮牌）
      if (L > 7.3) {
        const p = Ease.spring(clamp((L - 7.3) / 0.7), 5.0, 4.2);
        const out = clamp((L - 8.2) / 0.4);
        if (p > 0.01 && out < 1) {
          DFS.redTile(ctx, {
            x: W / 2, y: H * 0.215 - (1 - p) * 60, size: 96,
            ch: '乱', alpha: clamp(p) * (1 - out), rot: (1 - p) * 0.2 * -1,
            seed: 8, depth: 0.2
          });
        }
      }

      /* ---------- 6. 国破山河在 + 红圈 ---------- */
      if (L > 8.5) {
        const p = Ease.outExpo(clamp((L - 8.5) / 0.9));
        ctx.save();
        ctx.globalAlpha = clamp(p * 1.2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = DFS.font(112, 400, T.fonts.serif);
        ctx.fillStyle = 'rgba(240,232,212,0.95)';
        const text = '国破山河在';
        const chars = Array.from(text);
        const step = 122;
        chars.forEach((ch, i) => {
          const pp = Ease.outExpo(clamp((L - 8.5 - i * 0.07) / 0.7));
          ctx.globalAlpha = clamp(pp * 1.3);
          if (pp < 0.99) ctx.filter = `blur(${((1 - pp) * 8).toFixed(2)}px)`;
          ctx.fillText(ch, W / 2 + (i - (chars.length - 1) / 2) * step, H * 0.50 + (1 - pp) * 26);
          ctx.filter = 'none';
        });
        ctx.restore();
        // 红圈「破」
        const cp = clamp((L - 9.15) / 0.6);
        if (cp > 0) {
          DFS.handCircle(ctx, {
            x: W / 2 - 122 * 1.5, y: H * 0.50, rx: 82, ry: 78,
            progress: Ease.inOutCubic(cp), lw: 6, seed: 21
          });
        }
      }

      // 收尾压黑
      if (L > 10.1) {
        ctx.save();
        ctx.globalAlpha = clamp((L - 10.1) / 0.45) * 0.55;
        ctx.fillStyle = '#060604';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    hudDark(L) { return L > 6.6; }
  };
})(window.DFS);
