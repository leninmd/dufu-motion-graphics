/* =========================================================================
   V3 / celestial-lattice.js — 参数化天上广厦（金色线框殿宇矩阵）
   S04 的核心意象：地面泥水中的人，头顶是无限延展的重檐庑殿顶晶格。
   · 黄金分割螺旋排布（i × 137.5°）
   · 透视投影 + 纵深衰减
   · 生长动画：按 dash 进度逐笔"筑"起来
   · 可选体积光柱从檐下泄下
   ========================================================================= */
(function (DFS) {
  'use strict';
  DFS.V3 = DFS.V3 || {};
  const V3 = DFS.V3;
  const { W, H, clamp, lerp, hash } = DFS;

  V3.hallWire = function (ctx, o) {
    const { x, y, w, h, a = 1, lw = 1.2, color = '213,168,84' } = o;
    if (a < 0.01 || w < 3) return;
    const hw = w / 2;
    ctx.save();
    ctx.strokeStyle = `rgba(${color},${a})`;
    ctx.lineWidth = Math.max(0.5, lw);
    ctx.lineCap = 'round';

    // 台基
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.92, y);
    ctx.lineTo(x - hw * 0.78, y + h * 0.10);
    ctx.lineTo(x + hw * 0.78, y + h * 0.10);
    ctx.lineTo(x + hw * 0.92, y);
    ctx.stroke();

    // 四柱
    const colY = y - h * 0.52;
    for (let i = 0; i < 4; i++) {
      const cx = x - hw * 0.72 + (hw * 1.44) * (i / 3);
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx, colY);
      ctx.stroke();
    }

    // 下层檐（带起翘）
    const eaveY = colY;
    const lift = h * 0.10;
    ctx.beginPath();
    ctx.moveTo(x - hw * 1.02, eaveY - lift * 0.2);
    ctx.quadraticCurveTo(x - hw * 0.5, eaveY + lift * 0.55, x, eaveY - lift * 0.15);
    ctx.quadraticCurveTo(x + hw * 0.5, eaveY + lift * 0.55, x + hw * 1.02, eaveY - lift * 0.2);
    ctx.stroke();

    // 上层檐
    const upY = y - h * 0.78;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.86, upY + lift * 0.1);
    ctx.quadraticCurveTo(x - hw * 0.42, upY + lift * 0.6, x, upY - lift * 0.1);
    ctx.quadraticCurveTo(x + hw * 0.42, upY + lift * 0.6, x + hw * 0.86, upY + lift * 0.1);
    ctx.stroke();

    // 正脊 + 鸱吻
    const ridgeY = y - h * 0.94;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.30, ridgeY);
    ctx.lineTo(x + hw * 0.30, ridgeY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.30, ridgeY);
    ctx.quadraticCurveTo(x - hw * 0.36, ridgeY - h * 0.06, x - hw * 0.30, ridgeY - h * 0.10);
    ctx.moveTo(x + hw * 0.30, ridgeY);
    ctx.quadraticCurveTo(x + hw * 0.36, ridgeY - h * 0.06, x + hw * 0.30, ridgeY - h * 0.10);
    ctx.stroke();

    // 戗脊（四条垂脊）
    [[-hw * 1.02, eaveY - lift * 0.2, -hw * 0.30, ridgeY],
     [hw * 1.02, eaveY - lift * 0.2, hw * 0.30, ridgeY],
     [-hw * 0.86, upY + lift * 0.1, -hw * 0.30, ridgeY],
     [hw * 0.86, upY + lift * 0.1, hw * 0.30, ridgeY]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x + x1, y1);
      ctx.lineTo(x + x2, y2);
      ctx.stroke();
    });

    // 斗拱（檐下短竖）
    if (w > 22) {
      const n = Math.max(3, Math.round(w / 14));
      for (let i = 0; i <= n; i++) {
        const cx = x - hw * 0.95 + (hw * 1.9) * (i / n);
        ctx.beginPath();
        ctx.moveTo(cx, eaveY - lift * 0.1);
        ctx.lineTo(cx, eaveY + h * 0.06);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  V3.CelestialLattice = class CelestialLattice {
    constructor(o = {}) {
      this.seed = o.seed ?? 2024;
      this.count = o.count ?? 46;
      this.spread = o.spread ?? 26;
      this.baseY = o.baseY ?? 6.0;
      this.build();
    }

    build() {
      const items = [];
      for (let i = 0; i < this.count; i++) {
        const ang = i * 2.399963;                 // 黄金角
        const r = this.spread * Math.sqrt(i / this.count);
        const ring = i / this.count;               // 0=中心 1=外圈
        items.push({
          x: Math.cos(ang) * r,
          z: Math.sin(ang) * r - 4,
          y: this.baseY + Math.pow(ring, 1.6) * 5.5 + hash(this.seed, i) * 0.8,
          scale: 2.6 + (1 - ring) * 4.4,
          ring,
          phase: hash(this.seed + 5, i),
          rot: ang
        });
      }
      this.items = items;
    }

    /**
     * @param progress 0→1 生长进度（按 ring 由内向外、由下向上逐座"筑"起）
     * @param focus    0→1 镜头贴近地面的程度（越 1 越宏大）
     */
    draw(ctx, cam, t, o = {}) {
      const progress = clamp(o.progress ?? 1);
      const alpha = o.alpha ?? 1;
      const color = o.color || '213,168,84';
      const list = [];
      for (const it of this.items) {
        const grow = clamp((progress * 1.25 - it.ring * 0.9) / 0.35);
        if (grow <= 0.001) continue;
        const p = cam.project({ x: it.x, y: it.y, z: it.z });
        if (!p) continue;
        const w = p.px(it.scale);
        if (w < 4) continue;
        list.push({ it, p, w, grow });
      }
      list.sort((a, b) => b.p.z - a.p.z);
      for (const { it, p, w, grow } of list) {
        const depthFade = clamp(1 - p.z / 60);
        const a = alpha * (0.25 + 0.75 * depthFade) * grow * (0.55 + 0.45 * (1 - it.ring));
        V3.hallWire(ctx, {
          x: p.x, y: p.y, w, h: w * 0.86, a,
          lw: clamp(w / 140, 0.6, 2.4), color
        });
        // 檐下光晕
        if (w > 60 && o.glow !== false) {
          const g = ctx.createRadialGradient(p.x, p.y - w * 0.5, 0, p.x, p.y - w * 0.5, w * 0.9);
          g.addColorStop(0, `rgba(255,224,150,${0.14 * a})`);
          g.addColorStop(1, 'rgba(255,224,150,0)');
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = g;
          ctx.fillRect(p.x - w, p.y - w * 1.4, w * 2, w * 1.8);
          ctx.restore();
        }
      }
      return list.length;
    }

    /** 体积光：从檐口向下泄的金色光柱 */
    lightShafts(ctx, cam, t, o = {}) {
      const n = o.count ?? 14;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const it = this.items[(i * 7) % this.items.length];
        const p = cam.project({ x: it.x, y: it.y, z: it.z });
        if (!p) continue;
        const w = p.px(it.scale) * 0.5;
        if (w < 10) continue;
        const g = ctx.createLinearGradient(p.x, p.y, p.x, H);
        const a = 0.05 * (o.alpha ?? 1) * clamp(1 - p.z / 70);
        g.addColorStop(0, `rgba(255,222,150,${a})`);
        g.addColorStop(1, 'rgba(255,222,150,0)');
        ctx.fillStyle = g;
        const sway = Math.sin(t * 0.3 + i) * w * 0.08;
        ctx.beginPath();
        ctx.moveTo(p.x - w * 0.22, p.y);
        ctx.lineTo(p.x + w * 0.22, p.y);
        ctx.lineTo(p.x + w * 0.42 + sway, H);
        ctx.lineTo(p.x - w * 0.42 + sway, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  };
})(window.DFS);
