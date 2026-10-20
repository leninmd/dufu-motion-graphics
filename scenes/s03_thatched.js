/* =========================================================================
   scenes/s03_thatched.js — 全片 13.4–23.6s「茅屋秋风 · 离屏粒子吹散 · 子弹时间」
   五层景深：寒夜墨绿灰天幕 / 雾 / 苦竹（远·中·近三层）/ 破败草堂 / 雨
   文本：「八月秋高风怒号」→ 风场吹散 →「大庇天下寒士」→ 朱砂剑光 →
         「安得广厦千万间」（海报帧）→ 纸白交棒
   全部确定性：只用 DFS.hash / DFS.rng，无 Math.random / Date.now / ctx.filter blur
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease, hash, FPS, smoothstep } = DFS;
  const HUB = DFS.HUB;
  const T = DFS.THEME;
  const F = T.fonts;
  const TAU = Math.PI * 2;

  /* ---------------- 场景内时间轴（秒） ---------------- */
  const TL = {
    fengIn: 0.50,     // 「八月秋高风怒号」入场
    fengHold: 0.70,   // 停留
    fengDis: 1.60,    // 逐列吹散（dissolve 0→1）
    dabiIn: 1.35,     // 竖排「大庇天下寒士」浮现
    dabiOut: 5.30,    // 竖排退场
    sword: 6.10,      // 朱砂剑光 + γ 骤降
    gxIn: 6.55,       // 「安得广厦千万间」
    poster: 7.60,     // 海报静止帧起点（≈21.0s）
    paper: 9.40       // 转纸白（≈22.8s）
  };

  /** 雨速倍率 γ：1.0 → 0.015，0.35s 内 easeInOutCubic 完成 */
  const gammaAt = (L) => lerp(1, 0.015, Ease.inOutCubic(clamp((L - TL.sword) / 0.35)));

  /** 风的时间流速：21.0–22.2s 海报帧期间风停（≈0.015），保证画面真正静止 */
  const windSpeedAt = (L) => {
    const plateau = smoothstep(7.42, 7.56, L) * (1 - smoothstep(8.70, 8.90, L));
    return 1 - 0.985 * plateau;
  };

  /* ---------------- 小工具 ---------------- */
  const h = hash;

  /** 柔边椭圆（径向渐变：雾团 / 羽化衬底） */
  function softEllipse(c, x, y, rx, ry, rgb, a) {
    if (a <= 0.001) return;
    c.save();
    c.translate(x, y);
    c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.5, `rgba(${rgb},${a * 0.45})`);
    g.addColorStop(0.82, `rgba(${rgb},${a * 0.12})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, rx, 0, TAU);
    c.fill();
    c.restore();
  }

  /** 二次贝塞尔取点 */
  const bez = (a, b, d, u) => {
    const iu = 1 - u;
    return [iu * iu * a[0] + 2 * iu * u * b[0] + u * u * d[0],
            iu * iu * a[1] + 2 * iu * u * b[1] + u * u * d[1]];
  };

  DFS.sceneRegistry['s03'] = class Scene03Thatched {
    constructor() {
      /* ---------- 雨：两层线状雨丝 ---------- */
      this.rainLayers = [
        { n: 208, seed: 9311, spd: 1180, lenK: 0.030, lw: 1.0, a: 0.30 },
        { n: 152, seed: 9413, spd: 1850, lenK: 0.034, lw: 1.8, a: 0.44 }
      ];

      /* ---------- 苦竹 / 芦苇：远 34 + 中 25 + 近 16 = 75 株 ---------- */
      this.reedLayers = [
        { // 远：低 alpha + 细线宽（完全不用 ctx.filter blur）
          n: 34, clumps: 9, fanN: 0, color: '150,160,138', alpha: 0.24, lw: 3.0,
          x0: -0.05, x1: 1.07, hMin: 0.26, hMax: 0.52, yBase: 0.935,
          bend: 0.17, depth: 0, leafK: 0.95, far: true
        },
        { // 中：双层描边模拟景深虚化
          n: 25, clumps: 7, fanN: 3, color: '34,38,30', alpha: 0.60, lw: 5.0,
          x0: 0.08, x1: 1.10, hMin: 0.40, hMax: 0.74, yBase: 0.995,
          bend: 0.27, depth: 1, leafK: 1.0, far: false
        },
        { // 近：不透明 + 粗线宽
          n: 16, clumps: 5, fanN: 4, color: '6,8,6', alpha: 1.0, lw: 9.0,
          x0: 0.36, x1: 1.12, hMin: 0.60, hMax: 1.06, yBase: 1.05,
          bend: 0.34, depth: 2, leafK: 1.15, far: false
        }
      ];

      /* ---------- 时间扭曲表：γ 的积分（雨丝减速时不跳帧） ---------- */
      this._warpStep = 0.005;
      this._warp = (() => {
        const step = 0.005, n = 2400;
        const tab = new Float32Array(n);
        let acc = 0;
        tab[0] = 0;
        for (let i = 1; i < n; i++) {
          acc += gammaAt((i - 0.5) * step) * step;
          tab[i] = acc;
        }
        return tab;
      })();

      /* ---------- 风的时间表：海报帧期间风停 → 画面逐像素静止 ---------- */
      this._wind = (() => {
        const step = 0.005, n = 2400;
        const tab = new Float32Array(n);
        let acc = 0;
        tab[0] = 0;
        for (let i = 1; i < n; i++) {
          acc += windSpeedAt((i - 0.5) * step) * step;
          tab[i] = acc;
        }
        return tab;
      })();

      /* ---------- 子弹时间：悬浮雨珠（432 颗，含 17 颗前景大珠） ---------- */
      this.beads = [];
      for (let i = 0; i < 432; i++) {
        const r1 = h(8801, i * 5 + 1), r2 = h(8801, i * 5 + 2);
        const r3 = h(8801, i * 5 + 3), r4 = h(8801, i * 5 + 4), r5 = h(8801, i * 5 + 5);
        const big = i < 17;
        this.beads.push({
          x: (0.015 + r1 * 1.0) * W,
          y: (0.012 + r2 * 0.63) * H,           // 集中在上半屏
          r: big ? 5.6 + r3 * 3.4 : 2.0 + Math.pow(r3, 0.7) * 3.0,
          a: big ? 0.95 : 0.42 + r4 * 0.56,
          spr: i % 3,
          drift: 0.22 + r5 * 0.5,               // ≈0.2–0.7 px/s 向上飘
          ph: r4 * TAU
        });
      }
      this.beadSprites = [0, 1, 2].map((k) => this.makeBead(k));
    }

    /* =====================================================================
       雨珠精灵：内亮外暗的径向渐变 + 左上高光 + 底部反光
       ===================================================================== */
    makeBead(k) {
      const S = 64, C0 = 32, R = 22;
      const cv = DFS.mkCanvas(S, S);
      const c = cv.getContext('2d');
      const off = [0, 0.07, -0.06][k];
      const g = c.createRadialGradient(C0 - R * (0.30 + off), C0 - R * 0.34, R * 0.06, C0, C0, R);
      g.addColorStop(0, 'rgba(255,253,244,0.98)');
      g.addColorStop(0.26, 'rgba(236,240,226,0.94)');
      g.addColorStop(0.56, 'rgba(170,182,164,0.72)');
      g.addColorStop(0.80, 'rgba(76,88,74,0.62)');
      g.addColorStop(0.96, 'rgba(26,32,26,0.44)');
      g.addColorStop(1, 'rgba(20,26,20,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(C0, C0, R, 0, TAU);
      c.fill();
      c.strokeStyle = 'rgba(206,218,198,0.20)';
      c.lineWidth = 1.15;
      c.beginPath();
      c.arc(C0, C0, R - 0.9, 0, TAU);
      c.stroke();
      const hx = C0 - R * 0.36, hy = C0 - R * 0.40;
      const hl = c.createRadialGradient(hx, hy, 0, hx, hy, R * 0.32);
      hl.addColorStop(0, 'rgba(255,255,252,0.98)');
      hl.addColorStop(0.45, 'rgba(255,255,248,0.58)');
      hl.addColorStop(1, 'rgba(255,255,248,0)');
      c.fillStyle = hl;
      c.beginPath();
      c.arc(hx, hy, R * 0.32, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(222,232,210,0.20)';
      c.beginPath();
      c.ellipse(C0 + R * 0.10, C0 + R * 0.52, R * 0.36, R * 0.17, 0, 0, TAU);
      c.fill();
      return cv;
    }

    _tableAt(tab, L) {
      const step = this._warpStep;
      const f = clamp(L, 0, 11.9) / step;
      const i = Math.floor(f), u = f - i;
      const a = tab[i] || 0;
      const b = tab[i + 1] || a;
      return lerp(a, b, u);
    }

    warpAt(L) { return this._tableAt(this._warp, L); }
    windAt(L) { return this._tableAt(this._wind, L); }

    /* =====================================================================
       LAYER 1 — 寒夜墨绿灰天幕 + 极淡水平雾带
       ===================================================================== */
    drawSky(c, L, t) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#232722');
      g.addColorStop(0.38, '#1C211B');
      g.addColorStop(0.72, '#141712');
      g.addColorStop(1, '#10120F');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);

      // 右上寒月天光
      softEllipse(c, W * 0.83, H * 0.12, W * 0.40, H * 0.40, '178,188,168', 0.085);
      // 地平冷雾
      softEllipse(c, W * 0.62, H * 0.52, W * 0.48, H * 0.22, '152,164,148', 0.055);

      // 水平雾带（极淡）
      c.save();
      for (let i = 0; i < 3; i++) {
        const y = H * (0.46 + i * 0.16) + Math.sin(t * 0.14 + i * 1.7) * 9;
        const hh = 96 + i * 58;
        const lg = c.createLinearGradient(0, y - hh, 0, y + hh);
        lg.addColorStop(0, 'rgba(160,172,154,0)');
        lg.addColorStop(0.5, `rgba(160,172,154,${0.055 - i * 0.013})`);
        lg.addColorStop(1, 'rgba(160,172,154,0)');
        c.fillStyle = lg;
        c.fillRect(0, y - hh, W, hh * 2);
      }
      c.restore();

      // 屋顶撕口后透出的天光
      softEllipse(c, 520, 712, 250, 140, '198,206,186', 0.05);
    }

    /* =====================================================================
       竹叶：细长刀形（从叶鞘出发 → 顺风下垂）
       ===================================================================== */
    blade(c, x, y, len, ang, droop, wd) {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const mx = x + ca * len * 0.52;
      const my = y + sa * len * 0.52 + droop * len * 0.24;
      const ex = x + ca * len;
      const ey = y + sa * len + droop * len;
      const nx = -sa, ny = ca;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(mx + nx * wd, my + ny * wd, ex, ey);
      c.quadraticCurveTo(mx - nx * wd * 0.72, my - ny * wd * 0.72, x, y);
      c.fill();
    }

    /* =====================================================================
       LAYER 2a — 苦竹 / 芦苇（远 / 中 / 近三层，全部随风大幅弯曲）
       ===================================================================== */
    drawReeds(c, layer, t) {
      const seed = layer.seed;
      const nc = layer.clumps;
      const fans = layer.fanN > 0 ? 4 : 0;
      c.save();
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.strokeStyle = `rgba(${layer.color},1)`;
      c.fillStyle = `rgba(${layer.color},1)`;

      for (let i = 0; i < layer.n; i++) {
        const r1 = h(seed, i * 9 + 1), r2 = h(seed, i * 9 + 2), r3 = h(seed, i * 9 + 3);
        const r4 = h(seed, i * 9 + 4), r5 = h(seed, i * 9 + 5), r6 = h(seed, i * 9 + 6);
        // 成簇：每簇 3–7 株
        const clump = i % nc;
        const ccx = (h(seed + 31, clump * 3 + 1) * (layer.x1 - layer.x0) + layer.x0) * W;
        const cw = 52 + h(seed + 31, clump * 3 + 2) * 128;
        const x = ccx + (r1 - 0.5) * cw;
        const hh = H * lerp(layer.hMin, layer.hMax, r2) * (0.84 + r5 * 0.30);
        const baseY = H * layer.yBase + (r3 - 0.5) * 16;

        // 阵风：低频 + 每株相位 + 高频抖动
        const gust =
          Math.sin(t * 1.05 + x * 0.0016) * 0.55 +
          Math.sin(t * 0.43 + i * 0.21) * 0.25 +
          Math.sin(t * 2.35 + i * 1.3) * 0.10;
        const bend = layer.bend * (0.42 + gust * 0.58) * (0.74 + r4 * 0.56);
        const tipX = x + bend * hh + Math.sin(t * 2.6 + i * 2.1) * 7 * (0.4 + layer.depth * 0.5);
        const tipY = baseY - hh * (1 - Math.abs(bend) * 0.18);
        const midX = x + bend * hh * 0.38;
        const midY = baseY - hh * 0.57;
        const w = layer.lw * (0.62 + r4 * 0.72);

        const culm = (width, alpha) => {
          c.globalAlpha = alpha;
          c.lineWidth = width;
          c.beginPath();
          c.moveTo(x, baseY);
          c.quadraticCurveTo(x + bend * hh * 0.09, midY, midX, midY);
          c.quadraticCurveTo(lerp(midX, tipX, 0.46), lerp(midY, tipY, 0.62), tipX, tipY);
          c.stroke();
        };

        if (layer.far) {
          // 远：宽幽灵描边 + 细线（雾中透出的淡影）
          culm(w * 2.6, layer.alpha * 0.30);
          culm(w, layer.alpha);
        } else if (layer.depth === 1) {
          // 中：双层描边 = 景深虚化
          c.strokeStyle = `rgba(${layer.color},1)`;
          culm(w * 1.95, layer.alpha * 0.30);
          culm(w, layer.alpha * 0.80);
        } else {
          // 近：实心黑 + 迎光侧一道冷边
          culm(w * 1.12, layer.alpha);
          c.globalAlpha = layer.alpha * 0.13;
          c.lineWidth = Math.max(1, w * 0.20);
          c.strokeStyle = 'rgba(186,198,176,1)';
          c.beginPath();
          c.moveTo(x - w * 0.52, baseY);
          c.quadraticCurveTo(x - w * 0.52 + bend * hh * 0.09, midY, midX - w * 0.5, midY);
          c.quadraticCurveTo(lerp(midX, tipX, 0.46) - w * 0.4, lerp(midY, tipY, 0.62), tipX - w * 0.34, tipY);
          c.stroke();
          c.strokeStyle = `rgba(${layer.color},1)`;
        }

        // 竹节
        if (layer.depth > 0) {
          const nodes = 4 + Math.floor(r6 * 4);
          c.globalAlpha = layer.alpha * (layer.depth === 2 ? 0.92 : 0.45);
          c.lineWidth = Math.max(1, w * (layer.depth === 2 ? 0.5 : 0.36));
          for (let k = 1; k < nodes; k++) {
            const p = k / nodes;
            const nx = lerp(x, tipX, p * p * 0.52 + p * 0.48);
            const ny = lerp(baseY, tipY, p);
            const tilt = bend * hh * 0.09 * Math.sin(p * Math.PI);
            c.beginPath();
            c.moveTo(nx - w * 0.92 + tilt, ny);
            c.lineTo(nx + w * 0.92 + tilt, ny);
            c.stroke();
          }
        }

        /* ---- 叶群：上段四处叶鞘，每处长出一把细长下垂的竹叶 ---- */
        const fanU = [0.50, 0.65, 0.79, 0.90];
        for (let b = 0; b < fans; b++) {
          const u = fanU[b] + (r6 - 0.5) * 0.05;
          const bx = lerp(x, tipX, u);
          const by = lerp(baseY, tipY, u);
          const fanLen = (96 + h(seed, i * 17 + b) * 82) * layer.leafK;
          c.globalAlpha = layer.alpha * (layer.depth === 2 ? 1 : 0.9);
          for (let k = 0; k < layer.fanN; k++) {
            const kn = layer.fanN > 1 ? k / (layer.fanN - 1) : 0.5;
            const ang = -0.10 + (kn - 0.38) * 0.80 + bend * 1.6 + Math.sin(t * 1.6 + i + k) * 0.07;
            const ln = fanLen * (0.60 + h(seed, i * 23 + b * 7 + k) * 0.80);
            const droop = 0.44 + h(seed, i * 29 + b * 5 + k) * 0.46;
            this.blade(c, bx + (k - layer.fanN * 0.5) * 5.0, by + (k % 2) * 4.0,
              ln, ang, droop, ln * 0.046);
          }
        }

        // 草穗（近/中层尖端）
        if (layer.depth > 0 && r6 > 0.62) {
          c.globalAlpha = layer.alpha * 0.55;
          c.lineWidth = Math.max(0.8, w * 0.2);
          for (let k = 0; k < 4; k++) {
            const a = -Math.PI * 0.5 + (k - 1.5) * 0.17 + bend * 2.2;
            c.beginPath();
            c.moveTo(tipX, tipY);
            c.lineTo(tipX + Math.cos(a) * (8 + k * 3) * (0.7 + bend * 2), tipY + Math.sin(a) * (14 + k * 4));
            c.stroke();
          }
        }
      }
      c.restore();
    }

    /* 远层与中层之间的雾（3 团，托住中景的暗色剪影） */
    drawHaze(c, L) {
      const puffs = [
        [0.60, 0.700, 660, 130, 0.105, 0.0],
        [0.86, 0.585, 520, 104, 0.090, 1.7],
        [0.44, 0.850, 720, 130, 0.070, 3.1]
      ];
      for (let i = 0; i < puffs.length; i++) {
        const p = puffs[i];
        const x = p[0] * W + Math.sin(L * 0.16 + p[5]) * 72;
        const y = p[1] * H + Math.cos(L * 0.11 + p[5]) * 11;
        softEllipse(c, x, y, p[2], p[3], '158,170,152', p[4]);
      }
    }

    /* =====================================================================
       LAYER 2b — 破败草堂（屋顶被风掀开一角）
       几何：脊线 (330, 0.62H)，左檐 (-30, 0.822H)，右檐 (748, 0.828H)
       ===================================================================== */
    hutPaths(c, lift) {
      const ridgeY = H * 0.62 - lift;
      // 屋身：顶边贴着屋顶内缘（被屋顶压住，不留缝）
      c.beginPath();
      c.moveTo(72, 830 - lift);
      c.quadraticCurveTo(150, 776 - lift, 330, 756 - lift);
      c.quadraticCurveTo(540, 786 - lift, 688, 830 - lift);
      c.lineTo(718, H + 30);
      c.lineTo(22, H + 30);
      c.closePath();
      c.__body = true;
    }

    roofPath(c, lift) {
      const ridgeY = H * 0.62 - lift;
      const eL = H * 0.822, eR = H * 0.828;
      c.beginPath();
      c.moveTo(-30, eL);
      c.quadraticCurveTo(150, 772 - lift, 330, ridgeY);            // 左坡（近乎直，略有塌陷）
      c.lineTo(472, 748 - lift);                                   // 右坡上段
      c.lineTo(506, 698 - lift);                                   // 被风掀起的一角（撕口上翘）
      c.lineTo(556, 760 - lift);
      c.lineTo(614, 806 - lift);                                   // 撕开的碎边
      c.lineTo(748, eR);                                           // 右檐
      c.lineTo(766, 962);                                          // 檐口外唇
      c.quadraticCurveTo(560, 812 - lift, 330, 784 - lift);        // 内缘（回程）
      c.quadraticCurveTo(150, 806 - lift, -30, 992);
      c.closePath();
    }

    drawHut(c, L, t) {
      const ent = HUB.multiEntrance(L, 0.02, { duration: 1.05, rise: 26, scaleFrom: 0.975, blur: 7 });
      if (ent.p <= 0.001) return;
      const lift = smoothstep(0.4, 3.0, L) * 8 + Math.sin(t * 1.35) * 2.2;
      const ridgeY = H * 0.62 - lift;
      const r = DFS.rng(4417);

      c.save();
      c.translate(336, H * 0.86);
      c.scale(ent.scale, ent.scale);
      c.translate(-336, -H * 0.86 + ent.dy);
      ent.apply(c);

      /* ---------- 屋身 ---------- */
      this.hutPaths(c, lift);
      const bg = c.createLinearGradient(0, 760 - lift, 0, H);
      bg.addColorStop(0, 'rgba(11,13,9,0.97)');
      bg.addColorStop(0.5, 'rgba(6,7,5,0.99)');
      bg.addColorStop(1, 'rgba(4,5,4,1)');
      c.fillStyle = bg;
      c.fill();

      // 门洞（一线冷雾从门口透出）
      c.save();
      const dg = c.createLinearGradient(0, 940, 0, H);
      dg.addColorStop(0, 'rgba(58,66,55,0.52)');
      dg.addColorStop(1, 'rgba(20,24,19,0.30)');
      c.fillStyle = dg;
      c.beginPath();
      c.moveTo(298, H);
      c.lineTo(298, 962);
      c.quadraticCurveTo(344, 930, 390, 962);
      c.lineTo(390, H);
      c.closePath();
      c.fill();
      // 窗
      c.fillStyle = 'rgba(52,60,48,0.28)';
      c.fillRect(472, 950, 52, 58);
      c.fillRect(148, 956, 42, 50);
      // 门框冷边
      c.strokeStyle = 'rgba(150,162,140,0.10)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(298, H);
      c.lineTo(298, 962);
      c.quadraticCurveTo(344, 930, 390, 962);
      c.lineTo(390, H);
      c.stroke();
      c.restore();

      /* ---------- 屋顶（even-odd 带缺口） ---------- */
      c.save();
      this.roofPath(c, lift);
      c.fillStyle = 'rgba(10,12,9,0.99)';
      c.fill('evenodd');
      c.clip('evenodd');

      // 茅草纹理：顺着两坡铺，短促、密集
      const LO = [[-30, H * 0.822], [150, 772], [330, 662]];
      const RO = [[330, 662], [540, 782], [748, H * 0.828]];
      const LI = [[-30, 992], [150, 806], [330, 784]];
      const RI = [[330, 784], [560, 812], [766, 962]];
      c.lineCap = 'round';
      for (let i = 0; i < 360; i++) {
        const left = r() < 0.52;
        const u = r();
        const P = left ? LO : RO;
        const Q = left ? LI : RI;
        const p0 = bez(P[0], P[1], P[2], u);
        const p1 = bez(Q[0], Q[1], Q[2], u);
        const v = r();
        const x = p0[0];
        const y = p0[1] + (p1[1] - p0[1]) * v * 0.94 + 3;
        const slope = left ? -0.50 : 0.46;
        const len = 15 + r() * 42;
        const light = r() > 0.70;
        c.strokeStyle = light
          ? `rgba(${120 + r() * 44},${124 + r() * 40},${102 + r() * 32},${0.06 + r() * 0.18})`
          : `rgba(${24 + r() * 32},${26 + r() * 32},${20 + r() * 26},${0.16 + r() * 0.34})`;
        c.lineWidth = 0.8 + r() * 2.0;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + Math.cos(slope) * len + (r() - 0.5) * 6, y + Math.sin(slope) * len + r() * 5);
        c.stroke();
      }
      // 檐口垂下的茅草穗
      for (let i = 0; i < 96; i++) {
        const left = r() < 0.5;
        const P = left ? LI : RI;
        const p = bez(P[0], P[1], P[2], r());
        const sway = Math.sin(t * 2.0 + i * 1.1) * 5;
        c.strokeStyle = `rgba(${30 + r() * 40},${32 + r() * 40},${26 + r() * 30},${0.20 + r() * 0.34})`;
        c.lineWidth = 0.8 + r() * 1.8;
        c.beginPath();
        c.moveTo(p[0], p[1]);
        c.quadraticCurveTo(p[0] + 3, p[1] + 12 + r() * 12, p[0] + 4 + sway, p[1] + 22 + r() * 26);
        c.stroke();
      }
      // 脊线亮边
      c.strokeStyle = 'rgba(178,192,168,0.26)';
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(-26, H * 0.822);
      c.quadraticCurveTo(120, 690 - lift, 330, ridgeY);
      c.stroke();
      c.strokeStyle = 'rgba(178,192,168,0.20)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(330, ridgeY);
      c.quadraticCurveTo(566, 706 - lift, 744, H * 0.828);
      c.stroke();
      c.restore();

      /* ---------- 被掀开的茅草翻片（薄薄一片，翘在撕口上方） ---------- */
      c.save();
      c.fillStyle = 'rgba(13,15,11,0.99)';
      c.beginPath();
      c.moveTo(468, 752 - lift);
      c.quadraticCurveTo(492, 682 - lift, 546, 700 - lift + Math.sin(t * 1.9) * 4);
      c.quadraticCurveTo(522, 742 - lift, 474, 766 - lift);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(132,138,116,0.20)';
      c.lineWidth = 1.0;
      for (let i = 0; i < 9; i++) {
        const u = i / 8;
        const sx = lerp(476, 538, u);
        const sy = lerp(764 - lift, 704 - lift, u);
        const wob = Math.sin(t * 2.2 + i) * 4;
        c.beginPath();
        c.moveTo(sx, sy);
        c.quadraticCurveTo(sx + 16 + wob, sy - 20, sx + 30 + wob * 1.6, sy - 36 - u * 10);
        c.stroke();
      }
      c.restore();

      /* ---------- 被风掀起的碎草（从右檐向右上飞） ---------- */
      c.save();
      c.lineCap = 'round';
      for (let i = 0; i < 16; i++) {
        const u = h(7717, i * 3 + 1);
        const bx = lerp(660, 800, u);
        const by = H * 0.83 + h(7717, i * 3 + 2) * 70;
        const len = 40 + h(7717, i * 3 + 3) * 60;
        const flap = Math.sin(t * 1.55 + i * 0.9) * 12;
        c.strokeStyle = `rgba(${58 + u * 40},${62 + u * 40},${50 + u * 34},${0.28 + h(7717, i * 5) * 0.30})`;
        c.lineWidth = 0.9 + (1 - u) * 1.6;
        c.beginPath();
        c.moveTo(bx, by);
        c.quadraticCurveTo(bx + len * 0.55, by - 24 + flap, bx + len, by - 56 + flap * 1.4);
        c.stroke();
      }
      c.restore();

      c.restore();
    }

    /* =====================================================================
       风中的草屑 / 被吹散文字留下的尘埃（承担「文字右侧散落粒子」）
       ===================================================================== */
    drawChaff(c, L, t) {
      const gust = smoothstep(0.3, 1.6, L);
      const dust = clamp((L - 2.5) / 0.6) * (1 - clamp((L - 5.1) / 0.7));
      const amp = gust * 0.55 + dust * 1.35;
      if (amp <= 0.01) return;
      c.save();
      c.lineCap = 'round';
      for (let i = 0; i < 44; i++) {
        const r1 = h(6601, i * 5 + 1), r2 = h(6601, i * 5 + 2), r3 = h(6601, i * 5 + 3);
        const r4 = h(6601, i * 5 + 4), r5 = h(6601, i * 5 + 5);
        const drift = (r2 * 1.3 + t * (0.010 + r1 * 0.030)) % 1.3;
        const px = (drift - 0.12) * W;
        const upper = dust > 0.3 ? (i % 2 === 0) : (i % 3 === 0);   // 吹散余尘停在文字高度
        const py = upper
          ? (0.17 + r3 * 0.24 + Math.sin(t * 0.7 + i) * 0.015) * H
          : (0.36 + r3 * 0.56 + Math.sin(t * (0.5 + r4) + i) * 0.02) * H;
        if (px < 800 && py > 630) continue;    // 别在茅屋上划出杂线
        const len = 7 + r4 * 24;
        const wob = Math.sin(t * 1.6 + i * 0.9) * 6;
        c.globalAlpha = amp * (0.08 + r5 * 0.30);
        c.strokeStyle = 'rgba(200,206,186,0.85)';
        c.lineWidth = 0.7 + r1 * 1.3;
        c.beginPath();
        c.moveTo(px, py);
        c.quadraticCurveTo(px + len * 0.5, py - 3 - r3 * 9 + wob * 0.3, px + len, py - 2 - r1 * 7 + wob);
        c.stroke();
      }
      c.restore();
    }

    /* =====================================================================
       LAYER 2c — 雨（γ 控制雨速；子弹时间凝成圆珠） + 地表暗面
       ===================================================================== */
    drawRain(c, L, tau, gamma, beadsP) {
      const rainA = smoothstep(0.35, 1.55, L) * (1 - beadsP * 1.05);
      if (rainA <= 0.005) return;
      c.save();
      c.lineCap = 'round';
      for (let li = 0; li < this.rainLayers.length; li++) {
        const ly = this.rainLayers[li];
        const span = H * 1.30;
        for (let i = 0; i < ly.n; i++) {
          const r1 = h(ly.seed, i * 3 + 1), r2 = h(ly.seed, i * 3 + 2), r3 = h(ly.seed, i * 3 + 3);
          const spd = ly.spd * (0.65 + r3 * 0.8);
          const y = ((r2 * span + tau * spd) % span) - H * 0.16;
          const x = (r1 * 1.16 - 0.08) * W - y * 0.085;
          const len = spd * ly.lenK * (0.5 + r3 * 0.9) * (0.18 + 0.82 * gamma);
          c.globalAlpha = rainA * (0.26 + r1 * 0.64) * (0.45 + 0.55 * gamma);
          c.strokeStyle = `rgba(212,220,200,${ly.a})`;
          c.lineWidth = ly.lw;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + len * 0.085, y + len);
          c.stroke();
        }
      }
      c.restore();
    }

    drawBeads(c, L, tw, p) {
      if (p <= 0.004) return;
      const dt = Math.max(0, tw - this.windAt(TL.sword));
      c.save();
      for (let i = 0; i < this.beads.length; i++) {
        const b = this.beads[i];
        const y = b.y - dt * b.drift;
        const x = b.x + Math.sin(tw * 0.30 + b.ph) * 0.9;
        const s = b.r * 2.72;
        c.globalAlpha = p * b.a;
        c.drawImage(this.beadSprites[b.spr], x - s * 0.5, y - s * 0.5, s, s);
      }
      c.restore();
    }

    /* =====================================================================
       LAYER 3a — 朱砂剑光（竖直光带，从上到下劈开夜色）
       ===================================================================== */
    drawSword(c, L) {
      if (L < TL.sword) return;
      const sp = clamp((L - TL.sword) / 0.13);
      const glow = 1 - Ease.inCubic(clamp((L - TL.sword - 0.16) / 0.62));
      if (glow <= 0.004) return;
      const x = W * 0.754;
      const top = -30, bot = H + 30;

      const g = c.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, 'rgba(216,64,42,0)');
      g.addColorStop(0.06, 'rgba(216,64,42,0.30)');
      g.addColorStop(0.30, 'rgba(216,64,42,0.90)');
      g.addColorStop(0.52, 'rgba(238,92,66,1)');
      g.addColorStop(0.76, 'rgba(216,64,42,0.90)');
      g.addColorStop(0.95, 'rgba(188,52,34,0.30)');
      g.addColorStop(1, 'rgba(188,52,34,0)');

      // 剑形光带：中段最宽、两端收细
      const band = (coreW) => {
        const N = 24;
        c.beginPath();
        for (let i = 0; i <= N; i++) {
          const u = i / N;
          const y = lerp(top, bot, u);
          const k = 0.24 + 0.76 * Math.pow(Math.sin(Math.PI * u), 0.55);
          const w = coreW * k * 0.5;
          if (i === 0) c.moveTo(x + w, y); else c.lineTo(x + w, y);
        }
        for (let i = N; i >= 0; i--) {
          const u = i / N;
          const y = lerp(top, bot, u);
          const k = 0.24 + 0.76 * Math.pow(Math.sin(Math.PI * u), 0.55);
          c.lineTo(x - coreW * k * 0.5, y);
        }
        c.closePath();
        c.fillStyle = g;
        c.fill();
      };

      c.save();
      if (sp < 1) {
        c.beginPath();
        c.rect(x - 150, top - 30, 300, (bot - top) * sp + 30);
        c.clip();
      }
      const layers = [[128, 0.045], [58, 0.10], [26, 0.22], [11, 0.90], [4.4, 1]];
      for (let i = 0; i < layers.length; i++) {
        c.globalAlpha = layers[i][1] * glow;
        band(layers[i][0]);
      }
      // 高热内芯
      c.globalAlpha = 0.92 * glow;
      c.fillStyle = 'rgba(255,206,180,0.95)';
      band(2.6);
      c.restore();

      // 下劈的锋头
      if (sp < 1) {
        const ty = top + (bot - top) * sp;
        c.save();
        c.globalCompositeOperation = 'lighter';
        const rg = c.createRadialGradient(x, ty, 0, x, ty, 100);
        rg.addColorStop(0, 'rgba(255,238,222,0.92)');
        rg.addColorStop(0.3, 'rgba(255,124,84,0.40)');
        rg.addColorStop(1, 'rgba(255,80,40,0)');
        c.fillStyle = rg;
        c.fillRect(x - 105, ty - 105, 210, 210);
        c.restore();
      }

      // 落点：火花
      const hit = clamp((L - TL.sword - 0.12) / 0.32);
      if (hit > 0 && hit < 1) {
        const e = Ease.outExpo(hit);
        const ix = x, iy = H * 0.955;
        c.save();
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 28; i++) {
          const r1 = h(5511, i * 3 + 1), r2 = h(5511, i * 3 + 2), r3 = h(5511, i * 3 + 3);
          const dir = r1 > 0.5 ? 1 : -1;
          const px = ix + dir * e * (36 + r2 * 260);
          const py = iy - e * (16 + r3 * 120) + e * e * 60;
          c.globalAlpha = (1 - hit) * (0.22 + r3 * 0.62);
          c.fillStyle = r2 > 0.6 ? 'rgba(255,192,152,1)' : 'rgba(216,64,42,1)';
          c.beginPath();
          c.arc(px, py, 1.1 + r1 * 2.4 * (1 - hit), 0, TAU);
          c.fill();
        }
        c.restore();
      }

      // 余烬红光（全片只此一处高饱和红）
      if (L < TL.sword + 0.95) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.09 * (1 - clamp((L - TL.sword) / 0.95));
        const vg = c.createRadialGradient(x, H * 0.55, 40, x, H * 0.55, W * 0.72);
        vg.addColorStop(0, 'rgba(216,64,42,1)');
        vg.addColorStop(1, 'rgba(216,64,42,0)');
        c.fillStyle = vg;
        c.fillRect(0, 0, W, H);
        c.restore();
      }
    }

    /* =====================================================================
       LAYER 3a-2 — 被吹散诗句留下的尘埃（在文字右侧继续飘）
       ===================================================================== */
    drawTextDust(c, L) {
      const p = clamp((L - 2.35) / 0.7) * (1 - clamp((L - 4.75) / 0.65));
      if (p <= 0.01) return;
      c.save();
      c.lineCap = 'round';
      for (let i = 0; i < 130; i++) {
        const r1 = h(9917, i * 4 + 1), r2 = h(9917, i * 4 + 2);
        const r3 = h(9917, i * 4 + 3), r4 = h(9917, i * 4 + 4);
        const x0 = 500 + r1 * 700;                 // 原诗行所在
        const y0 = 185 + r2 * 200;
        const spd = 70 + r3 * 210;                 // 被风带走
        const dt = Math.max(0, L - 2.35 - r4 * 0.45);
        const x = x0 + spd * dt * 1.05 + Math.sin(L * 1.4 + i) * 4;
        const y = y0 - spd * 0.34 * dt + Math.cos(L * 1.1 + i * 1.7) * 5;
        const a = p * (0.10 + r4 * 0.42) * (1 - clamp((x - 1400) / 620));
        if (a <= 0.008) continue;
        c.globalAlpha = a;
        c.fillStyle = 'rgba(228,222,202,0.95)';
        const s = 1.1 + r1 * 1.9;
        c.fillRect(x, y, s, s);
        if (r3 > 0.72) {                           // 少数拉成细丝
          c.strokeStyle = 'rgba(228,222,202,0.55)';
          c.lineWidth = 0.8;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + 10 + r2 * 18, y - 4 - r4 * 8);
          c.stroke();
        }
      }
      c.restore();
    }

    /* =====================================================================
       LAYER 3b — 三段文字
       ===================================================================== */
    drawText(c, L, tw) {
      /* ---------- 1. 八月秋高风怒号（上方 1/4 → 逐列吹散） ---------- */
      const fengText = '八月秋高风怒号';
      const fengX = W * 0.5, fengY = H * 0.25;
      const assemble = clamp((L - TL.fengIn) / 0.55);
      const dissolve = clamp((L - TL.fengIn - TL.fengHold) / TL.fengDis);

      if (L > TL.fengIn && dissolve < 0.999) {
        softEllipse(c, fengX, fengY + 4, 780, 190, '7,9,7', 0.36 * (1 - dissolve));

        const ent = HUB.multiEntrance(L, TL.fengIn, { duration: 0.62, rise: 30, scaleFrom: 0.955, blur: 7 });
        c.save();
        c.font = DFS.font(108, 500, F.serif);
        const tW = c.measureText(fengText).width;

        // 清晰字形：被风从左侧逐列吃掉（clip 从右往左退），剩下的交给粒子
        const stripped = clamp(dissolve * 0.66);
        if (stripped < 0.999) {
          c.save();
          c.translate(fengX, fengY + ent.dy);
          c.scale(ent.scale, ent.scale);
          ent.apply(c);
          c.beginPath();
          c.rect(-tW / 2 + tW * stripped, -110, tW * (1 - stripped) + 6, 220);
          c.clip();
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillStyle = `rgba(235,229,211,${0.95 * (1 - clamp((dissolve - 0.62) / 0.38) * 0.92)})`;
          c.font = DFS.font(108, 500, F.serif);
          c.fillText(fengText, 0, 0);
          c.restore();
        }

        // 离屏像素采样 → 风场逐列剥离（HUB 提供）；静置期不叠粒子，免得糊成噪点
        if (dissolve > 0.012) {
          c.save();
          HUB.offscreenWindDissolve(c, fengText, fengX, fengY, {
            size: 108, weight: 500, family: F.serif, step: 3,
            assemble, dissolve, wind: 1.2,
            color: '232,226,208', seed: 23, sizePx: 2.0
          });
          c.restore();
        }
        c.restore();

        DFS.dbgBox('feng', fengX - tW / 2, fengY - 58, fengX + tW / 2, fengY + 58);
      }

      /* ---------- 2. 大庇天下寒士（右侧竖排） ---------- */
      const dabiText = '大庇天下寒士';
      const dabiX = 1500, dabiTop = H * 0.155, dabiSize = 68, dabiGap = 1.2;
      const dabiH = dabiSize * dabiGap * 6;
      if (L > TL.dabiIn && L < TL.dabiOut + 0.45) {
        const ent = HUB.multiEntrance(L, TL.dabiIn, { duration: 0.66, rise: 36, scaleFrom: 0.90, blur: 9 });
        const ex = HUB.fastExit(L, TL.dabiOut, { duration: 0.30, blur: 8 });
        const idle = HUB.idleMicroMotion(tw, 3.7, 0.75);
        const midY = dabiTop + dabiH * 0.5;

        c.save();
        c.translate(idle.dx, idle.dy);
        c.translate(dabiX, midY + ent.dy);
        c.scale(ent.scale, ent.scale);
        c.translate(-dabiX, -midY);
        ent.apply(c);
        ex.apply(c);

        softEllipse(c, dabiX, midY, 200, dabiH * 0.62, '7,9,7', 0.32);
        c.strokeStyle = 'rgba(206,212,194,0.15)';
        c.lineWidth = 1.1;
        c.beginPath();
        c.moveTo(dabiX - 66, dabiTop + 6);
        c.lineTo(dabiX - 66, dabiTop + dabiH - 6);
        c.stroke();

        HUB.vertical(c, dabiText, {
          x: dabiX, y: dabiTop, align: 'top',
          size: dabiSize, gap: dabiGap, weight: 400, family: F.serif,
          color: 'rgba(244,240,228,0.96)'
        });
        c.restore();

        DFS.dbgBox('dabi', dabiX - 40, dabiTop, dabiX + 40, dabiTop + dabiH);
      }

      /* ---------- 3. 安得广厦千万间（中央偏上，21.0s 起完全静止） ---------- */
      const gxText = '安得广厦千万间';
      const gxSize = 100, gxTrack = 16;
      const gxX = W * 0.5, gxY = H * 0.345;
      if (L > TL.gxIn) {
        // 海报帧：风的时间在海报窗口里停住，HUB.idleMicroMotion 的相位也随之冻结
        const idle = HUB.idleMicroMotion(tw, 1.9, 1);
        const fade = 1 - clamp((L - TL.paper) / 0.7) * 0.9;

        c.save();
        c.font = DFS.font(gxSize, 500, F.serif);
        const chars = Array.from(gxText);
        const widths = chars.map((ch) => c.measureText(ch).width);
        const total = widths.reduce((a, b) => a + b, 0) + gxTrack * (chars.length - 1);

        softEllipse(c, gxX, gxY, 640, 205, '7,9,7', 0.40);

        c.translate(idle.dx, idle.dy);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        let cur = gxX - total / 2;
        for (let i = 0; i < chars.length; i++) {
          const ent = HUB.multiEntrance(L, TL.gxIn + i * 0.07, {
            duration: 0.55, rise: 26, scaleFrom: 0.90, blur: 8
          });
          if (ent.p > 0.002) {
            c.save();
            c.translate(cur + widths[i] / 2, gxY);
            c.scale(ent.scale, ent.scale);
            ent.apply(c);
            c.font = DFS.font(gxSize, 500, F.serif);
            c.fillStyle = `rgba(246,242,228,${0.97 * fade})`;
            c.fillText(chars[i], 0, 0);
            c.restore();
          }
          cur += widths[i] + gxTrack;
        }
        c.restore();

        if (fade > 0.3 && L > TL.gxIn + 0.2) {
          DFS.dbgBox('guangxia', gxX - total / 2, gxY - 66, gxX + total / 2, gxY + 66);
        }
      }
    }

    /* =====================================================================
       主绘制
       ===================================================================== */
    draw(ctx, L, t) {
      const gamma = gammaAt(L);
      const tau = this.warpAt(L);
      const tw = this.windAt(L);      // 风的时间（海报帧里几乎不流动）
      const beadsP = Ease.outCubic(clamp((L - TL.sword) / 0.50));
      const paperP = clamp((L - TL.paper) / 0.80);

      /* 镜头：子弹时间缓慢推近 + 剑光落点震屏 */
      const push = HUB.ease.inOutCubic(clamp((tw - 5.9) / 4.4));
      const zoom = 1.018 + 0.045 * push;
      const shake = HUB.cameraShake(L * FPS, {
        amp: 12, decay: 8, startFrame: TL.sword * FPS, seed: 5
      });

      ctx.save();
      ctx.translate(W / 2 + shake.x, H / 2 + shake.y);
      if (shake.rot) ctx.rotate(shake.rot);
      ctx.scale(zoom, zoom);
      ctx.translate(-W / 2, -H / 2);

      HUB.fiveLayerStack(ctx, t, {
        dark: true,
        layer1: (c) => this.drawSky(c, L, t),
        layer2: (c) => {
          this.drawReeds(c, this.reedLayers[0], tw);  // 远
          this.drawHaze(c, tw);                       // 雾（远/中之间）
          this.drawReeds(c, this.reedLayers[1], tw);  // 中
          // 地表暗面：把整片草与茅屋压到地上
          const gg = c.createLinearGradient(0, H * 0.90, 0, H);
          gg.addColorStop(0, 'rgba(4,6,4,0)');
          gg.addColorStop(1, 'rgba(3,4,3,0.72)');
          c.fillStyle = gg;
          c.fillRect(0, H * 0.90, W, H * 0.10);
          this.drawHut(c, L, tw);                     // 草堂
          this.drawChaff(c, L, tw);                   // 风里的草屑
          this.drawReeds(c, this.reedLayers[2], tw);  // 近
          this.drawRain(c, L, tau, gamma, beadsP);    // 雨 → 悬浮圆珠
          this.drawBeads(c, L, tw, beadsP);
        },
        layer3: (c) => {
          this.drawSword(c, L);
          this.drawTextDust(c, L);
          this.drawText(c, L, tw);
        },
        grade: 'cold',
        grain: 0.0,          // 全片颗粒由 app.js 第五层统一叠加，这里不重复（保住海报帧的静止度）
        vignette: 0.30,
        vignetteMid: 0.05
      });

      ctx.restore();

      /* 纸白交棒 */
      if (paperP > 0.001) {
        ctx.save();
        ctx.globalAlpha = Ease.inOutCubic(paperP);
        DFS.drawPaper(ctx, { zoom: 1.02 });
        ctx.restore();
      }

      /* 调试状态（QA 探针） */
      DFS.dbg({ rainScale: gamma, s03Beads: this.beads.length });
    }

    hudDark(L) { return L < 9.55; }
  };
})(window.DFS);
