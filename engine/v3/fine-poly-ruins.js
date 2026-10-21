/* =========================================================================
   V3 / fine-poly-ruins.js — 8~12 顶点破损多边形断碑（S07）
   · 每一块碑是凸多边形，带豁口/崩角
   · 物理用 AABB 近似预烘焙（确定性），渲染是真实多边形
   · 落地：环境光遮蔽阴影 + 800 颗石粉飞溅 + 相机震颤
   ========================================================================= */
(function (DFS) {
  'use strict';
  DFS.V3 = DFS.V3 || {};
  const V3 = DFS.V3;
  const { W, H, clamp, rng, hash } = DFS;
  const HUB = DFS.HUB;

  V3.FinePolyRuins = class FinePolyRuins {
    constructor(o = {}) {
      this.seed = o.seed ?? 9091;
      this.floorY = o.floorY ?? 1052;
      this.items = [];
      this.sim = new HUB.PrebakedCollapse({
        gravity: o.gravity ?? 3400,
        floorY: this.floorY,
        restitution: 0.10,
        friction: 0.86
      });
    }

    /** 加一块碑：text 竖排刻字，w/h 为碰撞盒 */
    add(o) {
      const r = rng(this.seed + this.items.length * 31);
      const n = 8 + Math.floor(r() * 5);           // 8~12 顶点
      // 沿矩形周界取点（碑是"板"，不是"卵石"），边缘带崩口
      const pts = [];
      const perim = [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]];
      const per = n / 4;
      for (let i = 0; i < 4; i++) {
        const [x0, y0, x1, y1] = perim[i];
        for (let k = 0; k < per; k++) {
          const u = (k + 0.15 + r() * 0.7) / per;
          const nx = x0 + (x1 - x0) * u;
          const ny = y0 + (y1 - y0) * u;
          // 崩口：沿法线向内/外抖动
          const jx = (r() - 0.5) * 0.09;
          const jy = (r() - 0.5) * 0.09;
          pts.push([nx * 0.5 + jx * 0.5, ny * 0.5 + jy * 0.5]);
        }
      }
      const item = {
        id: this.items.length,
        text: o.text || '',
        x: o.x, y: o.y, w: o.w, h: o.h,
        fontSize: o.fontSize ?? 30,
        pts,
        releaseFrame: o.releaseFrame ?? 0,
        vx: o.vx ?? 0, vy: o.vy ?? 0, av: o.av ?? 0
      };
      this.items.push(item);
      this.sim.add({
        char: '', x: o.x, y: o.y, w: o.w, h: o.h, fontSize: 1,
        releaseFrame: item.releaseFrame, vx: item.vx, vy: item.vy, av: item.av
      });
      return this;
    }

    bake(frames, fps = 60) {
      this.sim.bake(frames, fps);
      // 碑是"立"的：把落地后的残余旋转压掉，保证碑文可读
      this.sim.table.forEach((snap) => snap.forEach((st) => { st.angle *= 0.12; }));
      return this;
    }

    draw(ctx, frame, offsetFrame = 0, o = {}) {
      const f = clamp(Math.round(frame - offsetFrame), 0, this.sim.table.length - 1);
      const snap = this.sim.table[f];
      ctx.save();
      for (let i = 0; i < this.items.length; i++) {
        const it = this.items[i];
        const s = snap[i];
        if (!s) continue;
        const w = it.w, h = it.h;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);

        // 地面阴影（越接近地面越实）
        const near = clamp((s.y - 300) / 700);
        ctx.save();
        ctx.globalAlpha = 0.30 * near;
        const sg = ctx.createRadialGradient(0, h * 0.5 + 10, 2, 0, h * 0.5 + 10, w * 0.72);
        sg.addColorStop(0, 'rgba(0,0,0,0.75)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.ellipse(0, h * 0.5 + 10, w * 0.72, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 碑体多边形
        ctx.beginPath();
        it.pts.forEach(([px, py], k) => {
          const X = px * w, Y = py * h;
          if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        });
        ctx.closePath();
        const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        g.addColorStop(0, `rgba(38,38,36,${0.96 * (o.alpha ?? 1)})`);
        g.addColorStop(0.55, `rgba(22,22,21,${0.98 * (o.alpha ?? 1)})`);
        g.addColorStop(1, `rgba(12,12,11,${1 * (o.alpha ?? 1)})`);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = `rgba(120,118,108,${0.30 * (o.alpha ?? 1)})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 刻字（阴刻：先暗后亮的高光边）
        if (it.text && w > 40) {
          ctx.save();
          ctx.beginPath();
          it.pts.forEach(([px, py], k) => {
            const X = px * w * 0.82, Y = py * h * 0.84;
            if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
          });
          ctx.closePath();
          ctx.clip();
          const chars = Array.from(it.text);
          const step = (h * 0.82) / Math.max(1, chars.length);
          const fs = Math.min(it.fontSize, step * 0.86);
          ctx.font = DFS.font(fs, 500, DFS.THEME.fonts.serif);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          chars.forEach((c, k) => {
            const yy = -h * 0.40 + step * (k + 0.5);
            ctx.fillStyle = 'rgba(150,146,132,0.55)';
            ctx.fillText(c, 1, yy + 1);
            ctx.fillStyle = 'rgba(196,190,172,0.92)';
            ctx.fillText(c, 0, yy);
          });
          ctx.restore();
        }
        ctx.restore();
      }
      ctx.restore();
    }
  };

  /* ---------------- 气溶胶粒子场（160 颗，永不静止） ---------------- */
  V3.aerosol = function (ctx, t, o = {}) {
    const n = o.count ?? 160;
    const color = o.color || '226,198,138';
    const alpha = o.alpha ?? 0.5;
    const seed = o.seed ?? 4211;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const r1 = hash(seed, i * 5 + 1);
      const r2 = hash(seed, i * 5 + 2);
      const r3 = hash(seed, i * 5 + 3);
      const r4 = hash(seed, i * 5 + 4);
      // 受控布朗漂移：三组不同频率的正弦叠加
      const x = ((r1 + Math.sin(t * (0.05 + r4 * 0.08) + i) * 0.02
        + Math.sin(t * 0.017 + i * 2.3) * 0.03) % 1 + 1) % 1 * W;
      const y = ((r2 - t * (0.004 + r3 * 0.010) + Math.sin(t * 0.09 + i * 1.7) * 0.012) % 1 + 1) % 1 * H;
      const sz = 0.8 + r3 * 2.6;
      const a = alpha * (0.25 + r4 * 0.75) * (0.6 + 0.4 * Math.sin(t * 0.7 + i));
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(x, y, 0, x, y, sz * 3.2);
      g.addColorStop(0, `rgba(${color},1)`);
      g.addColorStop(0.35, `rgba(${color},0.35)`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, sz * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

})(window.DFS);
