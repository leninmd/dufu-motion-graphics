/* =========================================================================
   scenes/s03_thatched.js — 24.1–38.3s「荣枯咫尺」（L = 0 .. 14.2）
   青绿山水一帧之内被战火吃掉，铜门合拢，微距→雪下手→拉起旷野，两极静帧。

     0.00–1.90  24.1–26.0  宋代麻纸 + 青绿山水（RidgeCloud 16000 点，平视横移）+ 山脚云海
     1.90–2.25  26.0–26.35 一帧蚀变：黑红焦土自四边向中心 multiply 吃掉；点云插值到 #1B1512
     2.25–4.90  26.35–29.0 铜铸宫门合拢 → 28.0 闪白 + 震屏 + 600 颗火星
     4.90–6.10  29.0–30.2 微距：倾覆镏金银杯 / 酒浆沿冰裂流开
     6.10–7.30  30.2–31.4 下摇：雪层下的一只小手
     7.30–8.90  31.4–33.0 猛烈拉起：黑白暴风雪旷野 + 烽火台毒烟
     8.90–14.2  33.0–38.3 两极对立静帧（金 / 雪白 / 米白）
   全部确定性：只用 DFS.hash / DFS.rng；无 Math.random / Date.now / 大范围 ctx.filter
   屏上文字只取自 DFS.STORY.texts，无一字杜撰。
   ========================================================================= */
(function (DFS) {
  'use strict';

  const { W, H, clamp, lerp, Ease, smoothstep, hash, FPS } = DFS;
  const V3 = DFS.V3;
  const HUB = DFS.HUB;
  const T = DFS.THEME;
  const TAU = Math.PI * 2;
  const h = hash;

  const SCENE_START = 24.1;          // 章节起点（t = L + 24.1）

  /* ---------------- 场景内时间轴（秒） ---------------- */
  const TL = {
    light: 0.42,      // 24.52 右上冷光
    rot: 1.90,        // 26.00 蚀变起点
    rotEnd: 2.25,     // 26.35 蚀变完成
    gateIn: 2.25,     // 26.35 铜门起
    hit: 3.90,        // 28.00 相撞
    macro: 4.90,      // 29.00 微距
    pan: 6.10,        // 30.20 下摇
    pull: 7.30,       // 31.40 拉起
    hold: 8.90        // 33.00 静帧
  };

  /* ---------------- 色板 ---------------- */
  const JADE = [62, 86, 74];          // 青绿点云（契约色）
  const CHAR = [27, 21, 18];          // #1B1512 焦黑
  const BRONZE_HI = '#6B5A3A';
  const BRONZE_LO = '#2A2118';
  const SPARK = '232,163,74';         // #E8A34A
  const GOLD = '#C59B27';
  const SNOWTXT = '#F4EFE6';

  /* ---------------- 小工具 ---------------- */
  const mixRGB = (a, b, p) => [
    Math.round(lerp(a[0], b[0], p)),
    Math.round(lerp(a[1], b[1], p)),
    Math.round(lerp(a[2], b[2], p))
  ];
  const cs = (c) => `${c[0]},${c[1]},${c[2]}`;

  function softEllipse(c, x, y, rx, ry, color, a, mid = 0.5) {
    if (a <= 0.002 || rx <= 0.5 || ry <= 0.5) return;
    c.save();
    c.translate(x, y);
    c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(${color},${a})`);
    g.addColorStop(mid, `rgba(${color},${a * 0.42})`);
    g.addColorStop(1, `rgba(${color},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, rx, 0, TAU);
    c.fill();
    c.restore();
  }

  function vGrad(c, y0, y1, stops) {
    const g = c.createLinearGradient(0, y0, 0, y1);
    for (const s of stops) g.addColorStop(s[0], s[1]);
    return g;
  }

  /** 可旋转的柔光团（光柱 / 反光都用它，边缘没有直边） */
  function softBlob(c, x, y, rx, ry, rot, color, a, mid = 0.5) {
    if (a <= 0.002 || rx <= 0.5 || ry <= 0.5) return;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(${color},${a})`);
    g.addColorStop(mid, `rgba(${color},${a * 0.42})`);
    g.addColorStop(1, `rgba(${color},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, rx, 0, TAU);
    c.fill();
    c.restore();
  }

  const bez2 = (a, b, d, u) => {
    const iu = 1 - u;
    return [iu * iu * a[0] + 2 * iu * u * b[0] + u * u * d[0],
            iu * iu * a[1] + 2 * iu * u * b[1] + u * u * d[1]];
  };
  const bez3 = (a, b, d, e, u) => {
    const iu = 1 - u;
    return [
      iu * iu * iu * a[0] + 3 * iu * iu * u * b[0] + 3 * iu * u * u * d[0] + u * u * u * e[0],
      iu * iu * iu * a[1] + 3 * iu * iu * u * b[1] + 3 * iu * u * u * d[1] + u * u * u * e[1]
    ];
  };

  /** 沿一条三次贝塞尔扫出一条「由窄到宽（或反之）」的带子 */
  function taper3(c, a, b, d, e, w0, w1, fill, N = 56) {
    const Lp = [], Rp = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const p = bez3(a, b, d, e, u);
      const p2 = bez3(a, b, d, e, Math.min(1, u + 0.01));
      let tx = p2[0] - p[0], ty = p2[1] - p[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      const w = lerp(w0, w1, Math.pow(u, 0.85)) * 0.5;
      Lp.push([p[0] - ty * w, p[1] + tx * w]);
      Rp.push([p[0] + ty * w, p[1] - tx * w]);
    }
    c.beginPath();
    c.moveTo(Lp[0][0], Lp[0][1]);
    for (let i = 1; i < Lp.length; i++) c.lineTo(Lp[i][0], Lp[i][1]);
    for (let i = Rp.length - 1; i >= 0; i--) c.lineTo(Rp[i][0], Rp[i][1]);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }

  /** 沿二次贝塞尔扫出一条两端都收的细带（手指） */
  function taper2(c, a, b, d, w0, w1, fill, N = 22) {
    const Lp = [], Rp = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const p = bez2(a, b, d, u);
      const p2 = bez2(a, b, d, Math.min(1, u + 0.02));
      let tx = p2[0] - p[0], ty = p2[1] - p[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      const w = lerp(w0, w1, u) * 0.5;
      Lp.push([p[0] - ty * w, p[1] + tx * w]);
      Rp.push([p[0] + ty * w, p[1] - tx * w]);
    }
    c.beginPath();
    c.moveTo(Lp[0][0], Lp[0][1]);
    for (let i = 1; i < Lp.length; i++) c.lineTo(Lp[i][0], Lp[i][1]);
    for (let i = Rp.length - 1; i >= 0; i--) c.lineTo(Rp[i][0], Rp[i][1]);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.beginPath();
    c.arc(d[0], d[1], Math.max(1.2, w1 * 0.5), 0, TAU);
    c.fill();
  }

  DFS.sceneRegistry['s03'] = class Scene03RongKu {
    constructor() {
      /* ---------- 青绿山水：一万六千点 ---------- */
      this.ridge = new DFS.RidgeCloud({ seed: 7207, count: 16000, width: 30, depth: 7.4, height: 6.4 });
      this.cam = new DFS.Camera({ pos: { x: 0, y: 4.34, z: -13.9 }, yaw: 0, pitch: 0 });
      this._ridgePts = this.ridge.pts.length;

      /* ---------- 确定性烘焙 ---------- */
      this.strokes = this._bakeStrokes(940);
      this.moss = this._bakeMoss(360);
      this.sparks = this._bakeSparks(600);
      this.embers = this._bakeEmbers(96);
      this.blizzard = this._bakeBlizzard();
      this.glitter = this._bakeGlitter(230);
      this.cracks = this._bakeCracks();
      this.windStrokes = this._bakeWindStrokes(210);
      this.drift = this._bakeSnowDrift();
      this.frost = this._bakeFrost(40);
    }

    /* =====================================================================
       烘焙
       ===================================================================== */
    _bakeStrokes(n) {
      const out = [];
      const R = this.ridge;
      for (let i = 0; i < n; i++) {
        const layer = i % 3 === 0 ? 2 : (i % 2 === 0 ? 1 : 0);
        const x = (h(3121, i * 6 + 1) - 0.5) * R.width * 0.9;
        const u = Math.pow(h(3121, i * 6 + 2), 0.62);
        const y = Math.max(0, R._ridge(x, layer) * R.height * (0.62 + 0.19 * layer)) * u;
        out.push({
          layer, x, y,
          len: 5 + h(3121, i * 6 + 3) * 22,
          w: 1.4 + h(3121, i * 6 + 4) * 2.6,
          a: 0.06 + h(3121, i * 6 + 5) * 0.14,
          dx: (h(3121, i * 6 + 6) - 0.5) * 0.30
        });
      }
      return out;
    }

    _bakeMoss(n) {
      const out = [];
      const R = this.ridge;
      for (let i = 0; i < n; i++) {
        const layer = 2;                       // 只长在最前一层脊线上，位置才不会"飘"
        const x = (h(5171, i * 5 + 1) - 0.5) * R.width * 0.95;
        const y = Math.max(0, R._ridge(x, layer) * R.height * (0.62 + 0.19 * layer)) *
                  (0.94 + h(5171, i * 5 + 2) * 0.08);
        out.push({
          layer, x, y,
          r: 1.1 + h(5171, i * 5 + 3) * 2.2,
          a: 0.08 + h(5171, i * 5 + 4) * 0.16
        });
      }
      return out;
    }

    _bakeSparks(n) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const r1 = h(9211, i * 7 + 1), r2 = h(9211, i * 7 + 2), r3 = h(9211, i * 7 + 3);
        const r4 = h(9211, i * 7 + 4), r5 = h(9211, i * 7 + 5), r6 = h(9211, i * 7 + 6);
        out.push({
          y0: -30 + r1 * (H + 60),
          dir: r2 < 0.5 ? -1 : 1,
          vx: 150 + r3 * 860,
          vy: -(110 + r4 * 560),
          life: 0.52 + r5 * 0.98,
          size: 1 + r6 * 2,              // 1–3 px
          hot: r3 > 0.7,
          ph: r4 * TAU
        });
      }
      return out;
    }

    _bakeEmbers(n) {
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push({
          x: h(4513, i * 5 + 1) * W,
          y: h(4513, i * 5 + 2) * H,
          r: 0.8 + h(4513, i * 5 + 3) * 2.2,
          sp: 8 + h(4513, i * 5 + 4) * 26,
          a: 0.18 + h(4513, i * 5 + 5) * 0.55,
          ph: h(4513, i * 5 + 2) * TAU
        });
      }
      return out;
    }

    _bakeBlizzard() {
      const layers = [
        { n: 240, spd: 0.26, len: [40, 170], a: [0.08, 0.22], w: [0.9, 1.8] },
        { n: 110, spd: 0.48, len: [110, 340], a: [0.10, 0.26], w: [1.2, 2.6] },
        { n: 46, spd: 0.84, len: [220, 600], a: [0.06, 0.16], w: [2.2, 4.2] }
      ];
      let k = 0;
      return layers.map((ly) => {
        const items = [];
        for (let i = 0; i < ly.n; i++, k++) {
          items.push({
            x0: h(6111, k * 4 + 1) * 1.4,
            y: h(6111, k * 4 + 2),
            len: lerp(ly.len[0], ly.len[1], h(6111, k * 4 + 3)),
            a: lerp(ly.a[0], ly.a[1], h(6111, k * 4 + 4)),
            w: lerp(ly.w[0], ly.w[1], h(6111, k * 4 + 1)),
            slope: -0.04 - h(6111, k * 4 + 2) * 0.06,
            ph: h(6111, k * 4 + 3) * TAU
          });
        }
        return { spd: ly.spd, items };
      });
    }

    _bakeGlitter(n) {
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push({
          x: 300 + h(3319, i * 5 + 1) * 1260,
          y: 1210 + h(3319, i * 5 + 2) * 600,
          r: 0.7 + h(3319, i * 5 + 3) * 2.1,
          a: 0.25 + h(3319, i * 5 + 4) * 0.6,
          ph: h(3319, i * 5 + 5) * TAU
        });
      }
      return out;
    }

    /** 冰裂：短促、分叉、低反差 */
    _bakeCracks() {
      const r = DFS.rng(5519);
      const out = [];
      for (let i = 0; i < 26; i++) {
        let x = 180 + r() * 1600;
        let y = 240 + r() * 860;
        let ang = (r() - 0.5) * 1.6;
        const pts = [[x, y]];
        const seg = 2 + Math.floor(r() * 3);
        for (let k = 0; k < seg; k++) {
          ang += (r() - 0.5) * 0.9;
          const l = 22 + r() * 58;
          x += Math.cos(ang) * l;
          y += Math.sin(ang) * l * 0.45;
          pts.push([x, y]);
        }
        out.push({ pts, w: 0.5 + r() * 0.8, a: 0.05 + r() * 0.09 });
        if (r() > 0.4) {
          const b = pts[1 + Math.floor(r() * Math.max(1, pts.length - 2))];
          let bx = b[0], by = b[1];
          let ba = ang + (r() > 0.5 ? 1 : -1) * (0.7 + r() * 0.5);
          const bp = [[bx, by]];
          for (let k = 0; k < 2 + Math.floor(r() * 2); k++) {
            ba += (r() - 0.5) * 0.8;
            const l = 16 + r() * 44;
            bx += Math.cos(ba) * l;
            by += Math.sin(ba) * l * 0.45;
            bp.push([bx, by]);
          }
          out.push({ pts: bp, w: 0.4 + r() * 0.6, a: 0.04 + r() * 0.07 });
        }
      }
      return out;
    }

    _bakeWindStrokes(n) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const k = h(8171, i * 5 + 1);
        const band = Math.pow(k, 1.5);
        out.push({
          x: -300 + h(8171, i * 5 + 2) * (W + 600),
          y: H * 0.605 + 8 + band * H * 0.40,
          len: 46 + band * 300 + h(8171, i * 5 + 3) * 140,
          a: 0.05 + h(8171, i * 5 + 4) * 0.15,
          w: 0.9 + band * 2.4,
          ph: h(8171, i * 5 + 5) * TAU
        });
      }
      return out;
    }

    _bakeSnowDrift() {
      const r = DFS.rng(6637);
      const blobs = [];
      for (let i = 0; i < 10; i++) {
        blobs.push({
          x: 260 + r() * 1400,
          y: 1290 + r() * 420,
          rx: 190 + r() * 330,
          ry: 52 + r() * 96,
          a: 0.30 + r() * 0.34
        });
      }
      return blobs;
    }

    _bakeFrost(n) {
      const r = DFS.rng(7741);
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push({
          x: 200 + r() * 1520,
          y: 380 + r() * 940,
          len: 8 + r() * 30,
          ang: r() * TAU,
          a: 0.06 + r() * 0.12
        });
      }
      return out;
    }

    /* =====================================================================
       山水：三层剪影 + 一万六千点 + 皴 + 苔点
       ===================================================================== */
    _ridgePath(c, layer) {
      const R = this.ridge;
      const cam = this.cam;
      const zc = (layer - 1) * R.depth * 0.52;
      const hMax = R.height * (0.62 + 0.19 * layer);
      const N = 150;
      const span = R.width * 0.92;            // 远超出两侧画框
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const x = lerp(-span, span, i / N);
        const y = Math.max(0, R._ridge(x, layer) * hMax);
        const p = cam.project({ x, y, z: zc });
        if (p) pts.push([p.x, p.y]);
      }
      if (pts.length < 3) return false;
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.lineTo(pts[pts.length - 1][0], H + 400);
      c.lineTo(pts[0][0], H + 400);
      c.closePath();
      return true;
    }

    _mountains(c, L, t, pan, rotP) {
      const cam = this.cam;
      cam.pos.x = pan;

      const fills = [
        mixRGB([112, 150, 138], [44, 36, 30], rotP),
        mixRGB([72, 112, 98], [35, 29, 24], rotP),
        mixRGB([40, 74, 60], [27, 22, 18], rotP)
      ];
      const alphas = [0.24, 0.34, 0.46];

      for (let i = 0; i < 3; i++) {
        if (!this._ridgePath(c, i)) continue;
        c.fillStyle = `rgba(${cs(fills[i])},${(alphas[i] * (1 - rotP * 0.25)).toFixed(3)})`;
        c.fill();
      }

      // 皴笔
      c.save();
      c.lineCap = 'round';
      const ink = mixRGB([26, 44, 38], [12, 9, 8], rotP);
      for (const s of this.strokes) {
        const zc = (s.layer - 1) * this.ridge.depth * 0.52;
        const p = cam.project({ x: s.x, y: s.y, z: zc });
        if (!p || p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) continue;
        c.globalAlpha = s.a * (1 - rotP * 0.4);
        c.strokeStyle = `rgba(${cs(ink)},1)`;
        c.lineWidth = s.w;
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(p.x + s.len * s.dx, p.y + s.len);
        c.stroke();
      }
      c.restore();

      // 一万六千点
      const pc = mixRGB(JADE, CHAR, rotP);
      this.ridge.draw(c, cam, t, {
        alpha: 0.92, color: cs(pc), size: 1.34 + rotP * 0.30
      });

      // 脊线苔点
      c.save();
      const mossInk = mixRGB([20, 34, 30], [10, 8, 7], rotP);
      for (const m of this.moss) {
        const zc = (m.layer - 1) * this.ridge.depth * 0.52;
        const p = cam.project({ x: m.x, y: m.y, z: zc });
        if (!p || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
        c.globalAlpha = m.a * (1 - rotP * 0.35);
        c.fillStyle = `rgba(${cs(mossInk)},1)`;
        c.beginPath();
        c.arc(p.x, p.y, m.r, 0, TAU);
        c.fill();
      }
      c.restore();
    }

    /** 山脚化进云里（单条连续渐变，不留接缝） */
    _mist(c, rotP) {
      const paper = mixRGB([246, 241, 229], [92, 70, 54], rotP);
      const g = vGrad(c, H * 0.58, H, [
        [0, `rgba(${cs(paper)},0)`],
        [0.36, `rgba(${cs(paper)},0.36)`],
        [0.62, `rgba(${cs(paper)},0.62)`],
        [1, `rgba(${cs(paper)},0.92)`]
      ]);
      c.fillStyle = g;
      c.fillRect(0, H * 0.58, W, H * 0.42);
    }

    /** 云海：几道横雾带 + 背光，才不是一片白 */
    _mistBands(c, rotP) {
      const lit = mixRGB([251, 248, 240], [96, 72, 56], rotP);
      const shade = mixRGB([172, 182, 176], [48, 36, 28], rotP);
      const r = DFS.rng(5171);
      for (let i = 0; i < 7; i++) {
        const y = H * 0.705 + i * H * 0.040 + r() * 16;
        const w = 520 + r() * 720;
        const x = (i % 2 ? 0.62 : 0.34) * W + (r() - 0.5) * 320 + Math.sin(i * 1.7) * 60;
        softEllipse(c, x, y, w, 30 + r() * 26, cs(lit), 0.30, 0.5);
        softEllipse(c, x + 46, y + 24 + r() * 12, w * 0.86, 16 + r() * 14, cs(shade), 0.12, 0.5);
      }
    }

    _cloudSea(c, t, rotP) {
      const lit = mixRGB([252, 249, 240], [78, 58, 46], rotP);
      const shade = mixRGB([150, 162, 156], [36, 27, 21], rotP);
      V3.cloudBank(c, t, {
        count: 24, alpha: 0.16 * (1 - rotP * 0.3), color: cs(shade),
        y0: H * 0.75, y1: H * 0.98
      });
      V3.cloudBank(c, t, {
        count: 32, alpha: 0.30 * (1 - rotP * 0.3), color: cs(lit),
        y0: H * 0.69, y1: H * 0.96
      });
      V3.cloudBank(c, t, {
        count: 12, alpha: 0.12, color: cs(lit),
        y0: H * 0.60, y1: H * 0.72
      });
    }

    /** 右上那一斜冷光：一道，用一串柔光团堆出来，边缘不带直线 */
    _lightShaft(c, L, a) {
      if (a <= 0.004) return;
      const x0 = 1812, y0 = -80, x1 = 946, y1 = 792;
      const ang = Math.atan2(y1 - y0, x1 - x0);
      c.save();
      c.globalCompositeOperation = 'screen';
      for (let i = 0; i < 13; i++) {
        const u = i / 12;
        const x = lerp(x0, x1, u);
        const y = lerp(y0, y1, u);
        const rx = lerp(150, 300, u);
        const ry = lerp(20, 62, u);
        const al = (0.075 - u * 0.045) * a;
        softBlob(c, x, y, rx, ry, ang, '206,230,244', al, 0.46);
      }
      // 内芯：更细更亮
      for (let i = 0; i < 11; i++) {
        const u = i / 10;
        const x = lerp(1816, 1052, u);
        const y = lerp(-70, 686, u);
        const al = (0.075 - u * 0.055) * a;
        softBlob(c, x, y, lerp(80, 150, u), lerp(7, 16, u), ang, '248,253,255', al, 0.42);
      }
      c.restore();
    }

    /* =====================================================================
       镜头 1 / 2 — 青绿山水（可带蚀变）
       ===================================================================== */
    shotLandscape(ctx, L, t, rotP) {
      const pan = lerp(-3.0, 3.15, smoothstep(0, TL.rotEnd, L));
      const lightA = clamp((L - TL.light) / 0.55);

      V3.eight(ctx, t, {
        l1: (c) => {
          V3.paper(c, { zoom: 1.05 });
          c.save();
          c.globalCompositeOperation = 'soft-light';
          const g = c.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, 'rgba(88,144,158,0.66)');
          g.addColorStop(0.38, 'rgba(60,112,102,0.46)');
          g.addColorStop(0.70, 'rgba(88,114,88,0.28)');
          g.addColorStop(1, 'rgba(126,114,88,0.18)');
          c.fillStyle = g;
          c.fillRect(0, 0, W, H);
          c.restore();
          softEllipse(c, 1500, 236, 560, 480, '255,247,216', 0.32);
          softEllipse(c, 620, 450, 800, 260, '228,238,234', 0.18);
        },
        l2: (c) => {
          this._mountains(c, L, t, pan, rotP);
          this._mist(c, rotP);
          this._cloudSea(c, t, rotP);
          this._mistBands(c, rotP);
        },
        l3: (c) => {
          if (lightA > 0.002) {
            V3.volumetricLight(c, t, {
              count: 7, alpha: 0.028 * lightA, color: '208,226,236', seed: 14
            });
          }
        },
        l5: (c) => this._lightShaft(c, L, lightA),
        grade: 'cold',
        dust: true,
        dustAlpha: 0.28 + rotP * 0.34,
        dustOpts: {
          count: 150,
          color: rotP > 0.25 ? '190,76,42' : '228,206,158',
          seed: 4711
        },
        grain: 0.34,
        vignette: 0.26,
        vignetteMid: 0.04
      });

      if (rotP > 0) this._corrosion(ctx, L, rotP);
    }

    _corrosion(c, L, rotP) {
      const q = rotP;
      const cx = W * 0.50, cy = H * 0.47;
      const R = lerp(W * 1.06, 14, Math.pow(q, 0.92));

      c.save();
      c.globalCompositeOperation = 'multiply';

      const g = c.createRadialGradient(cx, cy, Math.max(0.5, R * 0.26), cx, cy, Math.max(1, R));
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.50, 'rgba(150,56,30,0.10)');
      g.addColorStop(0.78, 'rgba(78,28,16,0.52)');
      g.addColorStop(0.92, 'rgba(36,17,12,0.90)');
      g.addColorStop(1, 'rgba(16,10,8,0.99)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);

      const n = 96;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + h(6613, i * 3 + 1) * 0.28;
        const rr = R * (0.84 + h(6613, i * 3 + 2) * 0.26);
        const bx = cx + Math.cos(a) * rr;
        const by = cy + Math.sin(a) * rr * 0.76;
        const br = 18 + h(6613, i * 3 + 3) * 96;
        const bg = c.createRadialGradient(bx, by, 0, bx, by, br);
        bg.addColorStop(0, 'rgba(10,7,6,0.95)');
        bg.addColorStop(0.62, 'rgba(26,14,10,0.50)');
        bg.addColorStop(1, 'rgba(44,24,14,0)');
        c.fillStyle = bg;
        c.beginPath();
        c.arc(bx, by, br, 0, TAU);
        c.fill();
      }

      if (q > 0.55) {
        c.globalAlpha = Math.pow(clamp((q - 0.55) / 0.45), 1.7) * 0.92;
        c.fillStyle = '#150F0C';
        c.fillRect(0, 0, W, H);
        c.globalAlpha = 1;
      }
      c.restore();

      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 52; i++) {
        const a = (i / 52) * TAU + h(7741, i * 3 + 1) * 0.3;
        const rr = R * (0.88 + h(7741, i * 3 + 2) * 0.16);
        const bx = cx + Math.cos(a) * rr;
        const by = cy + Math.sin(a) * rr * 0.76;
        const s = 1.2 + h(7741, i * 3 + 3) * 3.2;
        c.globalAlpha = (1 - q * 0.45) * (0.35 + h(7741, i * 3 + 2) * 0.5);
        c.fillStyle = 'rgba(232,128,62,1)';
        c.fillRect(bx, by, s, s);
      }
      c.restore();
    }

    /* =====================================================================
       镜头 3 — 铜铸宫门（26.35–29.0）
       ===================================================================== */
    _charredBackdrop(c, L, t) {
      const g = vGrad(c, 0, H, [
        [0, '#090705'],
        [0.42, '#0E0B09'],
        [0.72, '#0B0806'],
        [1, '#050403']
      ]);
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);

      this.cam.pos.x = 3.15;
      for (let i = 0; i < 3; i++) {
        if (!this._ridgePath(c, i)) continue;
        c.fillStyle = `rgba(${cs(mixRGB([112, 150, 138], [54, 42, 34], 1))},${(0.14 + i * 0.06).toFixed(3)})`;
        c.fill();
      }
      softEllipse(c, W * 0.52, H * 0.60, W * 0.66, H * 0.28, '168,60,30', 0.15);
      const gl = vGrad(c, H * 0.82, H, [
        [0, 'rgba(120,42,20,0)'],
        [1, 'rgba(150,58,26,0.18)']
      ]);
      c.fillStyle = gl;
      c.fillRect(0, H * 0.82, W, H * 0.18);

      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const em of this.embers) {
        const y = ((em.y - t * em.sp) % H + H) % H;
        const x = em.x + Math.sin(t * 0.6 + em.ph) * 14;
        c.globalAlpha = em.a * (0.5 + 0.5 * Math.sin(t * 2.1 + em.ph));
        c.fillStyle = 'rgba(226,118,54,1)';
        c.fillRect(x, y, em.r, em.r);
      }
      c.restore();
    }

    _gateLeaf(c, xOuter, xInner, L) {
      const x0 = Math.min(xOuter, xInner);
      const x1 = Math.max(xOuter, xInner);
      if (x1 < -60 || x0 > W + 60) return;
      const dir = xInner > xOuter ? 1 : -1;
      const top = -50, bot = H;
      const w = x1 - x0;

      c.save();
      c.beginPath();
      c.rect(x0, top, w, bot - top);
      c.clip();

      const g = c.createLinearGradient(xOuter, 0, xInner, 0);
      g.addColorStop(0, BRONZE_LO);
      g.addColorStop(0.30, '#372C1E');
      g.addColorStop(0.62, '#4D3E26');
      g.addColorStop(0.86, BRONZE_HI);
      g.addColorStop(1, '#8E7844');
      c.fillStyle = g;
      c.fillRect(x0, top, w, bot - top);

      let vg = vGrad(c, top, 180, [
        [0, 'rgba(8,6,4,0.74)'],
        [1, 'rgba(8,6,4,0)']
      ]);
      c.fillStyle = vg;
      c.fillRect(x0, top, w, 230);
      vg = vGrad(c, H - 200, H, [
        [0, 'rgba(8,6,4,0)'],
        [1, 'rgba(12,8,5,0.58)']
      ]);
      c.fillStyle = vg;
      c.fillRect(x0, H - 200, w, 200);

      const step = 46;
      const nRib = Math.ceil(w / step) + 2;
      for (let k = 0; k < nRib; k++) {
        const rx = xInner - dir * (26 + k * step);
        if (rx < x0 - 6 || rx > x1 + 6) continue;
        c.globalAlpha = 0.85;
        c.strokeStyle = 'rgba(12,9,6,0.62)';
        c.lineWidth = 3.4;
        c.beginPath();
        c.moveTo(rx, top);
        c.lineTo(rx, bot);
        c.stroke();
        c.globalAlpha = 0.55;
        c.strokeStyle = 'rgba(198,170,116,0.30)';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(rx + dir * 3.0, top);
        c.lineTo(rx + dir * 3.0, bot);
        c.stroke();
      }
      c.globalAlpha = 1;

      for (const yy of [176, 566, 952]) {
        c.strokeStyle = 'rgba(10,7,5,0.66)';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(x0, yy);
        c.lineTo(x1, yy);
        c.stroke();
        c.strokeStyle = 'rgba(206,178,122,0.22)';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(x0, yy + 5.5);
        c.lineTo(x1, yy + 5.5);
        c.stroke();
      }

      const rowStep = 112, colStep = 104;
      const rows = Math.ceil((bot - top) / rowStep) + 1;
      const cols = Math.ceil(w / colStep) + 1;
      for (let rI = 0; rI < rows; rI++) {
        const ny = top + 62 + rI * rowStep;
        if (ny < top + 24 || ny > bot - 20) continue;
        const stagger = (rI % 2) * (colStep * 0.5);
        for (let cI = 0; cI < cols; cI++) {
          const nx = xInner - dir * (72 + cI * colStep + stagger);
          if (nx < x0 + 16 || nx > x1 - 6) continue;
          const ng = c.createRadialGradient(nx - 4, ny - 5, 1, nx, ny, 15);
          ng.addColorStop(0, '#8E7846');
          ng.addColorStop(0.55, '#5D4B2C');
          ng.addColorStop(1, '#2E2418');
          c.fillStyle = ng;
          c.beginPath();
          c.arc(nx, ny, 13, 0, TAU);
          c.fill();
          c.fillStyle = 'rgba(240,220,168,0.55)';
          c.beginPath();
          c.arc(nx - 4.2, ny - 4.6, 2.6, 0, TAU);
          c.fill();
          c.strokeStyle = 'rgba(8,6,4,0.55)';
          c.lineWidth = 1.6;
          c.beginPath();
          c.arc(nx, ny, 13.6, 0, TAU);
          c.stroke();
        }
      }

      const eg = c.createLinearGradient(xInner - dir * 130, 0, xInner, 0);
      eg.addColorStop(0, 'rgba(255,214,150,0)');
      eg.addColorStop(1, 'rgba(255,214,150,0.14)');
      c.fillStyle = eg;
      c.fillRect(Math.min(xInner - dir * 130, xInner), top, 130, bot - top);

      c.restore();
    }

    _seam(c, L, e, dt) {
      const x = W * 0.5;
      const hot = Math.pow(e, 2.4);
      if (hot <= 0.01 && dt < 0) return;
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(x - 70, 0, x + 70, 0);
      g.addColorStop(0, 'rgba(255,176,86,0)');
      g.addColorStop(0.40, `rgba(255,182,100,${(0.10 * hot).toFixed(3)})`);
      g.addColorStop(0.5, `rgba(255,228,182,${(0.30 * hot).toFixed(3)})`);
      g.addColorStop(0.60, `rgba(255,182,100,${(0.10 * hot).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,176,86,0)');
      c.fillStyle = g;
      c.fillRect(x - 70, 0, 140, H);

      const coreA = hot * 0.75;
      if (coreA > 0.01) {
        const cg = c.createLinearGradient(x - 3.4, 0, x + 3.4, 0);
        cg.addColorStop(0, 'rgba(255,236,198,0)');
        cg.addColorStop(0.5, `rgba(255,246,224,${coreA.toFixed(3)})`);
        cg.addColorStop(1, 'rgba(255,236,198,0)');
        c.fillStyle = cg;
        c.fillRect(x - 3.4, 0, 6.8, H);
      }

      if (dt >= 0) {
        const fade = 1 - clamp(dt / 1.6);
        const gw = 6 + 46 * clamp(dt / 0.9);
        const g2 = c.createLinearGradient(x - gw, 0, x + gw, 0);
        g2.addColorStop(0, 'rgba(255,236,200,0)');
        g2.addColorStop(0.5, `rgba(255,246,224,${(0.46 * fade).toFixed(3)})`);
        g2.addColorStop(1, 'rgba(255,236,200,0)');
        c.fillStyle = g2;
        c.fillRect(x - gw, 0, gw * 2, H);
      }
      c.restore();
    }

    _sparks(c, dt) {
      if (dt < 0 || dt > 1.55) return;
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = 1500;
      for (const s of this.sparks) {
        if (dt > s.life) continue;
        const x = W * 0.5 + s.dir * (10 + s.vx * dt);
        const y = s.y0 + s.vy * dt + 0.5 * g * dt * dt;
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        const k = 1 - dt / s.life;
        c.globalAlpha = k * k * (0.55 + 0.45 * Math.sin(s.ph + dt * 30));
        c.fillStyle = s.hot ? 'rgba(255,226,168,1)' : `rgba(${SPARK},1)`;
        const sz = s.size * (0.6 + k * 0.6);
        const tx = x - s.dir * (s.vx * 0.016);
        const ty = y - (s.vy + g * dt) * 0.016;
        c.strokeStyle = c.fillStyle;
        c.lineWidth = Math.max(1, sz * 0.7);
        c.beginPath();
        c.moveTo(tx, ty);
        c.lineTo(x, y);
        c.stroke();
        c.fillRect(x - sz * 0.5, y - sz * 0.5, sz, sz);
      }
      c.restore();
    }

    _impactFlash(c, dt) {
      if (dt < 0 || dt > 0.10) return;
      const a = 1 - clamp(dt / 0.09);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = `rgba(255,252,244,${(a * 0.92).toFixed(3)})`;
      c.fillRect(-60, -60, W + 120, H + 120);
      const g = c.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, W * 0.62);
      g.addColorStop(0, `rgba(255,240,206,${(a * 0.55).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,220,160,0)');
      c.fillStyle = g;
      c.fillRect(-60, -60, W + 120, H + 120);
      c.restore();
    }

    shotGates(ctx, L, t) {
      const closeP = clamp((L - TL.gateIn) / (TL.hit - TL.gateIn));
      const e = Math.pow(closeP, 1.75);
      const dt = L - TL.hit;

      const absFrame = Math.round(t * FPS);
      const shake = dt >= -0.001
        ? HUB.cameraShake(absFrame, {
            amp: 18, decay: 6, seed: 17,
            startFrame: Math.round((SCENE_START + TL.hit) * FPS)
          })
        : { x: 0, y: 0, rot: 0 };

      ctx.fillStyle = '#070605';
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(W / 2 + shake.x, H / 2 + shake.y);
      if (shake.rot) ctx.rotate(shake.rot);
      ctx.translate(-W / 2, -H / 2);

      V3.eight(ctx, t, {
        l1: (c) => this._charredBackdrop(c, L, t),
        l2: (c) => {
          const half = lerp(1000, 0, e);
          const xE = W * 0.5 - half;
          const xL = W * 0.5 + half;
          if (half > 6) {
            const sg = c.createLinearGradient(xE, 0, xE + 150, 0);
            sg.addColorStop(0, 'rgba(4,3,2,0.85)');
            sg.addColorStop(1, 'rgba(4,3,2,0)');
            c.fillStyle = sg;
            c.fillRect(xE, 0, 150, H);
            const sg2 = c.createLinearGradient(xL, 0, xL - 150, 0);
            sg2.addColorStop(0, 'rgba(4,3,2,0.85)');
            sg2.addColorStop(1, 'rgba(4,3,2,0)');
            c.fillStyle = sg2;
            c.fillRect(xL - 150, 0, 150, H);
          }
          this._gateLeaf(c, xE - 1980, xE, L);
          this._gateLeaf(c, xL + 1980, xL, L);
          this._seam(c, L, e, dt);
        },
        l3: (c) => this._sparks(c, dt),
        l4: (c) => this._impactFlash(c, dt),
        grade: 'warm',
        dust: true,
        dustAlpha: 0.34 + (dt > 0 ? 0.22 : 0),
        dustOpts: { count: 130, color: '196,86,46', seed: 4901 },
        grain: 0.40,
        vignette: 0.34,
        vignetteMid: 0.05
      });

      ctx.restore();
    }

    /* =====================================================================
       镜头 4 — 微距（杯 / 酒）→ 下摇（雪下的手）
       ===================================================================== */
    _macroGround(c, L, t) {
      const g = vGrad(c, 60, 2200, [
        [0, '#22272C'],
        [0.16, '#171B1F'],
        [0.42, '#101316'],
        [0.60, '#0C0F12'],
        [0.74, '#161C22'],
        [1, '#0A0D10']
      ]);
      c.fillStyle = g;
      c.fillRect(-300, 40, W + 600, 2260);

      softEllipse(c, 1120, 420, 840, 330, '146,168,182', 0.12);
      softEllipse(c, 420, 780, 720, 340, '8,10,12', 0.55);
      softEllipse(c, 1660, 1020, 660, 300, '8,10,12', 0.45);
      softEllipse(c, 960, 1240, 940, 360, '118,138,152', 0.09);
      softEllipse(c, 1420, 1560, 620, 240, '128,146,160', 0.07);
      // 霜斑（地面上不匀的白）
      const rf = DFS.rng(6171);
      for (let i = 0; i < 16; i++) {
        const x = 120 + rf() * 1700;
        const y = 240 + rf() * 1100;
        softEllipse(c, x, y, 90 + rf() * 190, 30 + rf() * 60, '168,188,202', 0.035 + rf() * 0.05);
      }

      c.save();
      c.globalCompositeOperation = 'lighter';
      c.lineCap = 'round';
      for (const ck of this.cracks) {
        c.strokeStyle = `rgba(198,218,230,${ck.a})`;
        c.lineWidth = ck.w;
        c.beginPath();
        c.moveTo(ck.pts[0][0], ck.pts[0][1]);
        for (let i = 1; i < ck.pts.length; i++) c.lineTo(ck.pts[i][0], ck.pts[i][1]);
        c.stroke();
      }
      for (const f of this.frost) {
        c.globalAlpha = f.a;
        c.strokeStyle = 'rgba(214,230,240,1)';
        c.lineWidth = 0.9;
        const ca = Math.cos(f.ang), sa = Math.sin(f.ang);
        c.beginPath();
        c.moveTo(f.x, f.y);
        c.lineTo(f.x + ca * f.len, f.y + sa * f.len * 0.35);
        c.stroke();
      }
      c.restore();
    }

    _macroThreshold(c) {
      const g = vGrad(c, -160, 126, [
        [0, '#1B160F'],
        [0.7, '#2A2118'],
        [1, '#3C3020']
      ]);
      c.fillStyle = g;
      c.fillRect(-140, -180, W + 280, 310);
      // 门底的竖向铜条（暗示门面，但不抢戏）
      c.globalAlpha = 0.35;
      for (let i = 0; i < 26; i++) {
        const x = -60 + i * 78;
        c.strokeStyle = 'rgba(12,9,6,0.8)';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x, -180);
        c.lineTo(x, 126);
        c.stroke();
        c.strokeStyle = 'rgba(196,168,112,0.35)';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(x + 3, -180);
        c.lineTo(x + 3, 126);
        c.stroke();
      }
      c.globalAlpha = 1;
      // 底沿铜光
      c.strokeStyle = 'rgba(206,172,110,0.26)';
      c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(-140, 124);
      c.lineTo(W + 140, 124);
      c.stroke();
      // 门底投在地上的暗影
      const sh = vGrad(c, 124, 330, [
        [0, 'rgba(4,5,7,0.78)'],
        [1, 'rgba(4,5,7,0)']
      ]);
      c.fillStyle = sh;
      c.fillRect(-140, 124, W + 280, 210);
    }

    _macroLight(c) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      softEllipse(c, 1010, 210, 92, 300, '255,232,190', 0.24, 0.40);
      softEllipse(c, 1012, 210, 40, 280, '255,244,214', 0.26, 0.38);
      softEllipse(c, 1030, 470, 360, 160, '255,224,176', 0.24, 0.45);
      softEllipse(c, 1036, 448, 160, 74, '255,238,204', 0.22, 0.45);
      c.restore();
    }

    /** 倾覆的镏金银杯：凸弧剖面（碗），不是直筒喇叭 */
    _cup(c, L) {
      const cx = 1046, cy = 640, tilt = -0.06;
      const R0 = 190;                 // 口半径
      const AX1 = 318;                // 口到圈足
      const rAt = (u) => R0 * Math.sqrt(Math.max(0.03, 1 - Math.pow(0.94 * u, 2)))
        + 4.5 * Math.sin(u * 7.4);

      softEllipse(c, 990, 878, 380, 70, '3,4,5', 0.82);
      softEllipse(c, 860, 906, 300, 48, '3,4,5', 0.52);

      c.save();
      c.translate(cx, cy);
      c.rotate(tilt);

      const NU = 88;
      const top = [], bot = [];
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        const x = u * AX1;
        top.push([x, -rAt(u)]);
        bot.push([x, rAt(u)]);
      }
      const bodyPath = () => {
        c.beginPath();
        c.moveTo(top[0][0], top[0][1]);
        for (let i = 1; i < top.length; i++) c.lineTo(top[i][0], top[i][1]);
        for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
        c.closePath();
      };

      bodyPath();
      const bg = c.createLinearGradient(0, -R0, 0, R0);
      bg.addColorStop(0, '#E7EBED');
      bg.addColorStop(0.13, '#BEC6CA');
      bg.addColorStop(0.34, '#828B92');
      bg.addColorStop(0.56, '#474E54');
      bg.addColorStop(0.74, '#5D666C');
      bg.addColorStop(0.90, '#98A1A7');
      bg.addColorStop(1, '#C0C7CC');
      c.fillStyle = bg;
      c.fill();

      c.save();
      bodyPath();
      c.clip();

      // 贴地的反光暗面
      let hg = vGrad(c, 26, R0, [
        [0, 'rgba(10,12,14,0)'],
        [1, 'rgba(10,12,14,0.55)']
      ]);
      c.fillStyle = hg;
      c.fillRect(0, 18, AX1, R0);

      // 门缝光落在银器上的长高光（沿碗的弧度走）
      softBlob(c, 92, -rAt(0.24) * 0.70, 150, 26, -0.10, '255,252,240', 0.55, 0.45);
      softBlob(c, 214, -rAt(0.52) * 0.68, 96, 17, -0.22, '255,252,240', 0.34, 0.45);
      // 冷反光
      softBlob(c, 150, -rAt(0.34) * 0.16, 150, 60, 0.02, '196,222,238', 0.14, 0.5);
      // 口沿内侧的镏金暖光
      softBlob(c, 26, 4, 60, 150, 0, '214,164,78', 0.28, 0.5);
      // 底部的金反光
      softBlob(c, 266, rAt(0.76) * 0.66, 100, 36, 0.1, '196,150,72', 0.16, 0.5);

      // 锤揲起伏
      c.globalAlpha = 0.08;
      c.strokeStyle = 'rgba(255,255,255,1)';
      c.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const yy = -R0 * 0.58 + i * 58;
        c.beginPath();
        c.moveTo(4, yy);
        c.bezierCurveTo(110, yy - 8, 230, yy + 6, AX1, yy - 4);
        c.stroke();
      }
      c.globalAlpha = 1;

      // 器身中线的一道细金箍（环一周 → 侧视一竖条）
      c.fillStyle = 'rgba(196,154,76,0.38)';
      c.fillRect(214, -rAt(0.67) - 4, 6.5, rAt(0.67) * 2 + 8);
      c.fillStyle = 'rgba(246,216,150,0.26)';
      c.fillRect(215.5, -rAt(0.67) - 4, 2, rAt(0.67) * 2 + 8);

      c.restore();

      // 口沿（椭圆 + 内壁 + 沿口的厚度）
      c.save();
      c.translate(2, 0);
      c.rotate(-0.04);
      c.beginPath();
      c.ellipse(0, 0, 58, R0, 0, 0, TAU);
      const ig = c.createLinearGradient(-58, -60, 48, 80);
      ig.addColorStop(0, '#171310');
      ig.addColorStop(0.40, '#3A2D1F');
      ig.addColorStop(0.68, '#100D0A');
      ig.addColorStop(1, '#3A2A18');
      c.fillStyle = ig;
      c.fill();
      c.save();
      c.beginPath();
      c.ellipse(0, 0, 55, R0 - 3, 0, 0, TAU);
      c.clip();
      // 内壁的远侧受光（一道弯月）
      softBlob(c, -20, -R0 * 0.52, 46, 66, 0.2, '236,214,176', 0.40, 0.5);
      softBlob(c, 10, -R0 * 0.20, 60, 50, 0, '150,140,120', 0.10, 0.5);
      // 杯底残酒
      softBlob(c, 2, R0 * 0.56, 34, 66, 0, '104,16,13', 0.72, 0.5);
      softBlob(c, -4, R0 * 0.48, 16, 30, 0, '176,62,42', 0.30, 0.5);
      c.restore();
      // 金口沿（外亮内暗的两道，才像有厚度）
      c.strokeStyle = 'rgba(214,172,88,0.98)';
      c.lineWidth = 15;
      c.beginPath();
      c.ellipse(0, 0, 58, R0, 0, 0, TAU);
      c.stroke();
      c.strokeStyle = 'rgba(255,236,178,0.85)';
      c.lineWidth = 3.4;
      c.beginPath();
      c.ellipse(-1.4, -1.6, 61, R0 + 3, 0, Math.PI * 0.74, Math.PI * 1.58);
      c.stroke();
      c.strokeStyle = 'rgba(120,86,40,0.55)';
      c.lineWidth = 2.6;
      c.beginPath();
      c.ellipse(0.8, 1.4, 52, R0 - 4, 0, Math.PI * -0.38, Math.PI * 0.30);
      c.stroke();
      c.restore();

      // 圈足：比端面小一圈，且被器身包住
      c.save();
      c.translate(AX1 - 6, 0);
      c.beginPath();
      c.ellipse(0, 0, 20, 50, 0, 0, TAU);
      c.fillStyle = 'rgba(12,10,9,0.96)';
      c.fill();
      c.strokeStyle = 'rgba(190,146,70,0.95)';
      c.lineWidth = 9;
      c.beginPath();
      c.ellipse(0, 0, 18, 48, 0, 0, TAU);
      c.stroke();
      c.strokeStyle = 'rgba(250,222,158,0.55)';
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(-1, -1, 22, 52, 0, Math.PI * 0.72, Math.PI * 1.56);
      c.stroke();
      c.restore();

      // 口沿与器身交界的一道暗缝
      c.strokeStyle = 'rgba(12,10,8,0.5)';
      c.lineWidth = 2.6;
      c.beginPath();
      c.ellipse(6, 0, 54, R0 - 6, 0, -Math.PI * 0.44, Math.PI * 0.44);
      c.stroke();

      c.restore();
    }

    _wine(c, L, t) {
      const MY = 176;                  // 口沿下唇的高度
      c.save();
      c.translate(1046, 636);
      c.rotate(-0.06);

      // 主股：从杯口下缘淌到地面洼处
      taper3(c, [-24, MY], [-150, 250], [-280, 330], [-430, 372],
        44, 112, 'rgba(44,8,9,0.96)');
      // 更淡的一层铺开
      taper3(c, [-14, MY + 24], [-180, 292], [-320, 372], [-506, 418],
        28, 150, 'rgba(58,11,11,0.55)');
      // 细流：沿冰裂分出去
      taper3(c, [-20, MY - 14], [-126, 214], [-214, 262], [-338, 284],
        10, 30, 'rgba(66,13,13,0.62)');
      taper3(c, [-30, MY + 46], [-70, 330], [-170, 430], [-292, 470],
        8, 26, 'rgba(52,9,10,0.45)');

      // 湿光
      c.globalAlpha = 0.26;
      c.strokeStyle = 'rgba(226,142,112,0.95)';
      c.lineWidth = 4.2;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(-30, MY - 8);
      c.bezierCurveTo(-158, 238, -286, 318, -434, 360);
      c.stroke();
      c.globalAlpha = 0.12;
      c.strokeStyle = 'rgba(255,214,180,0.95)';
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(-30, MY - 18);
      c.bezierCurveTo(-158, 228, -286, 308, -434, 350);
      c.stroke();
      c.globalAlpha = 1;
      c.restore();

      // 洼处的一摊
      const px = 552, py = 966;
      const r0 = DFS.rng(9311);
      c.save();
      c.beginPath();
      const pts = [];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        const rr = 0.76 + r0() * 0.40;
        pts.push([px + Math.cos(a) * 176 * rr, py + Math.sin(a) * 60 * rr]);
      }
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= pts.length; i++) {
        const p = pts[i % pts.length];
        const q = pts[(i + 1) % pts.length];
        c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      c.closePath();
      c.fillStyle = 'rgba(34,6,7,0.97)';
      c.fill();
      softEllipse(c, px - 34, py - 8, 120, 38, '78,14,14', 0.5, 0.55);
      softEllipse(c, px + 56, py + 12, 84, 26, '18,3,4', 0.55, 0.55);
      // 镜面高光
      c.globalAlpha = 0.30;
      c.fillStyle = 'rgb(222,144,110)';
      c.beginPath();
      c.ellipse(px - 52, py - 22, 66, 8, -0.07, 0, TAU);
      c.fill();
      c.globalAlpha = 0.14;
      c.beginPath();
      c.ellipse(px + 58, py + 2, 34, 5, 0.05, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
      c.restore();
    }

    /* ---------------- 雪 + 雪下的手 ---------------- */
    _driftShape(c, x0, y0, w, amp, fill) {
      c.beginPath();
      c.moveTo(x0, y0);
      const n = 4;
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        const x = x0 + w * u;
        const y = y0 + Math.sin(u * 6.0 + x0 * 0.01) * amp - u * amp * 0.3;
        c.quadraticCurveTo(x - w / n * 0.5, y - amp * 0.7, x, y);
      }
      c.lineTo(x0 + w, 2200);
      c.lineTo(x0, 2200);
      c.closePath();
      c.fillStyle = fill;
      c.fill();
    }

    _snow(c, L, t) {
      // 三层雪坡：边缘各不相同，才不像一条白带
      this._driftShape(c, -320, 1392, 1200, 26, 'rgba(212,221,229,0.95)');
      this._driftShape(c, 700, 1300, 1250, 34, 'rgba(224,232,239,0.96)');
      const sg = vGrad(c, 1180, 1900, [
        [0, 'rgba(240,245,249,0.98)'],
        [0.22, 'rgba(210,220,229,0.97)'],
        [0.55, 'rgba(160,172,186,0.96)'],
        [1, 'rgba(92,104,120,0.96)']
      ]);
      this._driftShape(c, -320, 1252, 2600, 22, sg);

      // 雪脊亮线（只描最上缘，不横穿画面）
      c.save();
      c.strokeStyle = 'rgba(250,253,255,0.62)';
      c.lineWidth = 3.4;
      c.beginPath();
      c.moveTo(-320, 1252);
      for (let i = 1; i <= 4; i++) {
        const u = i / 4;
        const x = -320 + 2600 * u;
        const y = 1252 + Math.sin(u * 6.0 + -320 * 0.01) * 22 - u * 22 * 0.3;
        c.quadraticCurveTo(x - 2600 / 4 * 0.5, y - 22 * 0.7, x, y);
      }
      c.stroke();
      // 上缘的一道暗（雪坡背光的边界）
      c.strokeStyle = 'rgba(44,56,74,0.30)';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(-320, 1264);
      for (let i = 1; i <= 4; i++) {
        const u = i / 4;
        const x = -320 + 2600 * u;
        const y = 1266 + Math.sin(u * 6.0 - 3.2) * 22 - u * 22 * 0.3;
        c.quadraticCurveTo(x - 2600 / 4 * 0.5, y - 22 * 0.7, x, y);
      }
      c.stroke();
      c.restore();

      // 雪面的起伏：顺着坡走的暗带（体积感）
      c.save();
      for (let i = 0; i < 7; i++) {
        const y = 1312 + i * 76;
        c.globalAlpha = 0.15 - i * 0.012;
        c.strokeStyle = 'rgba(78,94,114,1)';
        c.lineWidth = 18 + i * 8;
        c.beginPath();
        c.moveTo(-320, y + 40);
        c.bezierCurveTo(300, y - 22, 900, y + 44, 1500, y - 10);
        c.bezierCurveTo(1800, y - 38, 2100, y + 18, 2300, y);
        c.stroke();
      }
      c.restore();

      // 雪堆
      for (const b of this.drift) {
        softEllipse(c, b.x, b.y, b.rx, b.ry, '236,242,247', b.a, 0.5);
        softEllipse(c, b.x + b.rx * 0.10, b.y + b.ry * 0.96, b.rx * 0.82, b.ry * 0.46,
          '74,88,104', b.a * 0.55, 0.55);
      }

      // 手底下的雪窝
      softEllipse(c, 946, 1466, 330, 84, '58,72,94', 0.54, 0.55);
      softEllipse(c, 950, 1502, 230, 46, '36,48,70', 0.44, 0.55);

      // 雪粒微光
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const g of this.glitter) {
        const a = g.a * (0.30 + 0.70 * Math.max(0, Math.sin(t * 1.6 + g.ph)));
        c.globalAlpha = a * 0.75;
        c.fillStyle = 'rgba(246,252,255,1)';
        c.fillRect(g.x, g.y, g.r, g.r);
      }
      c.restore();
    }

    /** 雪层下的一只小手：一小块青紫手背 + 5 根极细弧线，半埋，不写实
     *  局部坐标里 +x 指向指尖，手腕在 -x 方向没入雪中。 */
    _hand(c, L, t) {
      const X = 926, Y = 1442, ROT = -2.02;     // 指尖朝左上

      c.save();
      c.translate(X, Y);
      c.rotate(ROT);

      // 手背：拉长的一块，往手腕方向收
      c.beginPath();
      c.moveTo(6, -58);
      c.bezierCurveTo(-40, -62, -96, -56, -152, -44);
      c.bezierCurveTo(-178, -38, -182, 34, -156, 40);
      c.bezierCurveTo(-100, 54, -42, 62, 8, 58);
      c.bezierCurveTo(20, 30, 20, -30, 6, -58);
      c.closePath();
      const hb = c.createLinearGradient(-150, -50, 30, 60);
      hb.addColorStop(0, 'rgba(104,92,116,0.94)');
      hb.addColorStop(0.42, 'rgba(86,74,92,0.85)');
      hb.addColorStop(1, 'rgba(48,40,56,0.84)');
      c.fillStyle = hb;
      c.fill();
      // 指节的一道亮脊
      c.globalAlpha = 0.34;
      c.strokeStyle = 'rgba(184,192,204,1)';
      c.lineWidth = 4.4;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(-120, -34);
      c.quadraticCurveTo(-50, -54, 6, -40);
      c.stroke();
      c.globalAlpha = 1;

      // 5 根手指：短、细、略垂，扇面只有 ±12°
      const fingers = [
        { y: -46, len: 52, w0: 14, w1: 6.0, ang: -0.24 },
        { y: -24, len: 64, w0: 15.5, w1: 6.6, ang: -0.10 },
        { y: 0, len: 68, w0: 16, w1: 6.8, ang: 0.04 },
        { y: 24, len: 60, w0: 15, w1: 6.4, ang: 0.16 },
        { y: 46, len: 50, w0: 13, w1: 5.8, ang: 0.30 }
      ];
      for (let i = 0; i < fingers.length; i++) {
        const f = fingers[i];
        const a = [4, f.y];
        const cx1 = f.len * 0.60;
        const cy1 = f.y + Math.sin(f.ang) * f.len * 0.60 + 6;
        const tip = [f.len, f.y + Math.sin(f.ang) * f.len + 14];
        taper2(c, a, [cx1, cy1], tip, f.w0, f.w1, 'rgba(132,120,144,0.80)');
        // 受光的一线
        c.globalAlpha = 0.28;
        c.strokeStyle = 'rgba(206,202,214,1)';
        c.lineWidth = 2.2;
        c.beginPath();
        c.moveTo(a[0] + 2, a[1] - 4);
        c.quadraticCurveTo(cx1, cy1 - 4, tip[0], tip[1] - 3);
        c.stroke();
        c.globalAlpha = 1;
      }

      // 半埋：雪盖住手腕这一段（边缘不规则）
      const cov = c.createLinearGradient(-150, 0, -10, 0);
      cov.addColorStop(0, 'rgba(238,244,248,0.98)');
      cov.addColorStop(0.62, 'rgba(234,240,245,0.90)');
      cov.addColorStop(1, 'rgba(232,238,243,0)');
      c.fillStyle = cov;
      c.beginPath();
      c.moveTo(-190, -80);
      c.bezierCurveTo(-150, -46, -150, 26, -168, 72);
      c.lineTo(-92, 96);
      c.bezierCurveTo(-76, 40, -86, -30, -104, -86);
      c.closePath();
      c.fill();
      c.restore();

      // 压在手背/指根上的碎雪
      for (let i = 0; i < 9; i++) {
        const a = h(8821, i * 3 + 1) * TAU;
        const rr = 30 + h(8821, i * 3 + 2) * 96;
        const px = X + Math.cos(a) * rr * 1.2 + 26;
        const py = Y + 16 + Math.sin(a) * rr * 0.32;
        softEllipse(c, px, py, 16 + h(8821, i * 3 + 3) * 34, 8 + h(8821, i * 3 + 3) * 11,
          '242,247,251', 0.66, 0.5);
      }
    }

    _macroWorld(c, L, t) {
      this._macroGround(c, L, t);
      this._macroThreshold(c);
      this._macroLight(c);
      this._cup(c, L);
      this._wine(c, L, t);
      this._snow(c, L, t);
      this._hand(c, L, t);

      // 近景压角（浅景深的重量感，不用 blur）
      const g = vGrad(c, 1780, H + 260, [
        [0, 'rgba(6,7,9,0)'],
        [1, 'rgba(6,7,9,0.90)']
      ]);
      c.fillStyle = g;
      c.fillRect(-300, 1780, W + 600, 640);
    }

    shotMacro(ctx, L, t) {
      const k = clamp((L - TL.pan) / (TL.pull - TL.pan));
      const panY = Ease.inOutCubic(k) * 880;          // 下摇
      const push = 1.0 + 0.055 * clamp((L - TL.macro) / (TL.pull - TL.macro));

      V3.eight(ctx, t, {
        l1: (c) => {
          c.fillStyle = '#07080A';
          c.fillRect(0, 0, W, H);
        },
        l2: (c) => {
          c.save();
          c.beginPath();
          c.rect(0, 0, W, H);
          c.clip();
          c.translate(W / 2, H * 0.50);
          c.scale(push, push);
          c.translate(-W / 2, -H * 0.50 - panY);
          this._macroWorld(c, L, t);
          c.restore();
        },
        l3: (c) => {
          c.save();
          c.globalCompositeOperation = 'lighter';
          const g = c.createLinearGradient(0, 0, 0, H * 0.62);
          g.addColorStop(0, 'rgba(220,232,244,0.09)');
          g.addColorStop(1, 'rgba(220,232,244,0)');
          c.fillStyle = g;
          c.fillRect(0, 0, W, H * 0.62);
          c.restore();
        },
        grade: 'cold',
        dust: true,
        dustAlpha: 0.22,
        dustOpts: { count: 120, color: '206,214,222', seed: 4111 },
        grain: 0.42,
        vignette: 0.38,
        vignetteMid: 0.06
      });
    }

    /* =====================================================================
       镜头 5 — 猛烈拉起：黑白暴风雪旷野（31.4–33.0）+ 静帧（33.0–38.3）
       ===================================================================== */
    _wasteWorld(c, L, t, rush) {
      const hz = H * 0.605;

      const g = vGrad(c, hz, H * 1.42, [
        [0, '#6E767D'],
        [0.07, '#525A61'],
        [0.24, '#383E43'],
        [0.52, '#232930'],
        [0.78, '#191D21'],
        [1, '#0F1215']
      ]);
      c.fillStyle = g;
      c.fillRect(-W * 0.7, hz, W * 2.4, H * 1.0);

      // 地平线上被风刮起的雪雾
      const rr = DFS.rng(4417);
      for (let i = 0; i < 14; i++) {
        const x = -120 + i * 165 + rr() * 110;
        softEllipse(c, x, hz - 10 + rr() * 34, 250 + rr() * 210, 26 + rr() * 40,
          '196,204,212', 0.10 + rr() * 0.16);
      }

      // 雪面风纹
      c.save();
      c.lineCap = 'round';
      for (const s of this.windStrokes) {
        const y = s.y + Math.sin(t * 0.6 + s.ph) * 2.4;
        c.globalAlpha = s.a * (0.7 + 0.3 * Math.sin(t * 1.4 + s.ph));
        c.strokeStyle = 'rgba(228,234,240,1)';
        c.lineWidth = s.w;
        c.beginPath();
        c.moveTo(s.x - rush * 90, y);
        c.lineTo(s.x - rush * 90 + s.len, y + 2.2);
        c.stroke();
      }
      c.restore();

      softEllipse(c, 380, hz + 46, 470, 44, '132,142,150', 0.12);
      softEllipse(c, 1520, hz + 64, 570, 50, '132,142,150', 0.09);

      // ---- 烽火台：梯形剪影 ----
      const bx = W * 0.5, by = hz + 6;
      const botH = 100, topH = 64, topY = by - 198;
      c.save();
      c.fillStyle = 'rgba(8,10,11,0.97)';
      c.beginPath();
      c.moveTo(bx - botH, by);
      c.lineTo(bx - topH, topY);
      c.lineTo(bx + topH, topY);
      c.lineTo(bx + botH, by);
      c.closePath();
      c.fill();
      for (let i = -1; i <= 1; i++) {
        c.fillRect(bx + i * 40 - 16, topY - 18, 32, 20);
      }
      c.strokeStyle = 'rgba(196,206,214,0.30)';
      c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(bx + botH, by);
      c.lineTo(bx + topH, topY);
      c.stroke();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.26 + 0.12 * Math.sin(t * 2.1);
      c.fillStyle = 'rgba(206,116,58,1)';
      c.fillRect(bx - 6, topY - 30, 12, 10);
      c.restore();

      // ---- 三团深灰毒烟：沿上升轴排开的软团，被风吹向左 ----
      const rise = Math.max(0, L - TL.pull);
      for (let k = 0; k < 3; k++) {
        const baseY = topY - 24 - k * 44;
        const cy = baseY - rise * (11 + k * 4);
        const cx = bx + Math.sin(L * 0.24 + k * 2.4) * (12 + k * 10);
        for (let j = 0; j < 6; j++) {
          const u = j / 5;
          const r1 = h(3313, k * 23 + j * 3 + 1);
          const r2 = h(3313, k * 23 + j * 3 + 2);
          const r3 = h(3313, k * 23 + j * 3 + 3);
          const px = cx - 46 * u + (r1 - 0.5) * 54;
          const py = cy - u * 104 + (r2 - 0.5) * 26;
          const rad = (30 + u * 46) * (0.82 + r3 * 0.40);
          softEllipse(c, px, py, rad, rad * 0.84, '132,138,144', 0.15 * (1 - u * 0.30), 0.45);
          softEllipse(c, px + 5, py + 5, rad * 0.52, rad * 0.46, '54,58,62', 0.22 * (1 - u * 0.22), 0.45);
        }
      }

      // 前景压角
      const fg = vGrad(c, H * 0.88, H * 1.1, [
        [0, 'rgba(10,12,14,0)'],
        [1, 'rgba(10,12,14,0.90)']
      ]);
      c.fillStyle = fg;
      c.fillRect(-W * 0.7, H * 0.88, W * 2.4, H * 0.22);
    }

    _blizzard(c, L, t, rush) {
      c.save();
      c.lineCap = 'round';
      for (const ly of this.blizzard) {
        for (const s of ly.items) {
          const x = ((s.x0 + t * ly.spd) % 1.4) * W - W * 0.2;
          const y = s.y * H + Math.sin(t * 0.8 + s.ph) * 7;
          const len = s.len * (1 + rush * 0.7);
          c.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(t * 2.3 + s.ph));
          c.strokeStyle = 'rgba(240,245,250,1)';
          c.lineWidth = s.w;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + len, y + len * s.slope);
          c.stroke();
        }
      }
      // 近景的雪雾团（让风有"团"的感觉）
      for (let i = 0; i < 5; i++) {
        const x = ((i * 0.27 + t * 0.05) % 1.3) * W - W * 0.1;
        const y = H * (0.30 + 0.12 * i) + Math.sin(t * 0.5 + i) * 12;
        softEllipse(c, x, y, 220, 70, '235,241,246', 0.05 + 0.03 * Math.sin(t * 0.9 + i), 0.5);
      }
      c.restore();
    }

    _wasteSky(c, L, t) {
      const g = vGrad(c, 0, H, [
        [0, '#14181C'],
        [0.28, '#1F2429'],
        [0.50, '#2C3238'],
        [0.60, '#3A424A'],
        [0.66, '#2F353B'],
        [1, '#0B0D10']
      ]);
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      softEllipse(c, W * 0.5, H * 0.60, W * 0.66, H * 0.18, '198,206,212', 0.12);
    }

    /* =====================================================================
       排版：两极对立静帧
       ===================================================================== */
    _texts(ctx, L, t) {
      const st = DFS.STORY.texts;

      const scrimA = clamp((L - 9.55) / 0.8) * 0.66;
      if (scrimA > 0.01) {
        softEllipse(ctx, W * 0.5, 802, 780, 210, '6,7,8', scrimA, 0.55);
      }

      const br = HUB.idleMicroMotion(t, 2.3, 0.55);

      /* ---- 左：朱门酒肉臭（金漆） ---- */
      const eL = HUB.multiEntrance(L, 9.02, { duration: 0.95, rise: 24, scaleFrom: 0.972, blur: 0 });
      if (eL.p > 0.002) {
        const a = clamp(eL.alpha);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(0, eL.dy + br.dy * 0.35);
        const m = V3.inkText(ctx, st.s03_left, {
          x: 460, y: 300, size: 84, weight: 900, family: T.fonts.heavy,
          color: GOLD, tracking: 8, seed: 5
        });
        ctx.restore();
        if (m) DFS.dbgBox('s03_left', 460 - m.w / 2, 300 - m.h / 2, 460 + m.w / 2, 300 + m.h / 2);
        ctx.save();
        ctx.globalAlpha = a * 0.55;
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(460 - 232, 384);
        ctx.lineTo(460 + 232, 384);
        ctx.stroke();
        ctx.restore();
      }

      /* ---- 右：路有冻死骨（雪白） ---- */
      const eR = HUB.multiEntrance(L, 9.18, { duration: 0.95, rise: 24, scaleFrom: 0.972, blur: 0 });
      if (eR.p > 0.002) {
        const a = clamp(eR.alpha);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(0, eR.dy - br.dy * 0.35);
        const m = V3.inkText(ctx, st.s03_right, {
          x: 1460, y: 300, size: 84, weight: 900, family: T.fonts.heavy,
          color: SNOWTXT, tracking: 8, seed: 7
        });
        ctx.restore();
        if (m) DFS.dbgBox('s03_right', 1460 - m.w / 2, 300 - m.h / 2, 1460 + m.w / 2, 300 + m.h / 2);
        ctx.save();
        ctx.globalAlpha = a * 0.42;
        ctx.strokeStyle = SNOWTXT;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(1460 - 232, 384);
        ctx.lineTo(1460 + 232, 384);
        ctx.stroke();
        ctx.restore();
      }

      /* ---- 中央下方两行（米白） ---- */
      const eA = HUB.multiEntrance(L, 9.62, { duration: 0.90, rise: 18, scaleFrom: 0.985, blur: 0 });
      if (eA.p > 0.002) {
        const a = clamp(eA.alpha);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(0, eA.dy);
        const m = V3.inkText(ctx, st.s03_a, {
          x: W * 0.5, y: 760, size: 46, weight: 500, family: T.fonts.serif,
          color: 'rgba(244,239,230,0.94)', tracking: 2, seed: 11
        });
        ctx.restore();
        if (m) DFS.dbgBox('s03_a', W * 0.5 - m.w / 2, 760 - m.h / 2, W * 0.5 + m.w / 2, 760 + m.h / 2);
      }

      const eB = HUB.multiEntrance(L, 9.86, { duration: 0.90, rise: 18, scaleFrom: 0.985, blur: 0 });
      if (eB.p > 0.002) {
        const a = clamp(eB.alpha);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(0, eB.dy);
        const m = V3.inkText(ctx, st.s03_b, {
          x: W * 0.5, y: 840, size: 46, weight: 500, family: T.fonts.serif,
          color: 'rgba(238,232,220,0.90)', tracking: 2, seed: 13
        });
        ctx.restore();
        if (m) DFS.dbgBox('s03_b', W * 0.5 - m.w / 2, 840 - m.h / 2, W * 0.5 + m.w / 2, 840 + m.h / 2);
      }
    }

    shotWide(ctx, L, t) {
      const p = clamp((L - TL.pull) / 1.15);
      const e = Ease.outQuint(p);
      const zoom = lerp(2.02, 1.0, e);
      const ty = lerp(-780, 0, e);
      const rush = 1 - e;

      V3.eight(ctx, t, {
        l1: (c) => this._wasteSky(c, L, t),
        l2: (c) => {
          c.save();
          c.translate(W / 2, H * 0.605);
          c.scale(zoom, zoom);
          c.translate(-W / 2, -H * 0.605 + ty);
          this._wasteWorld(c, L, t, rush);
          c.restore();
        },
        l4: (c) => this._blizzard(c, L, t, rush),
        grade: 'ash',
        dust: true,
        dustAlpha: 0.26,
        dustOpts: { count: 140, color: '212,218,224', seed: 4127 },
        grain: 0.46,
        vignette: 0.34,
        vignetteMid: 0.06
      });

      this._texts(ctx, L, t);
    }

    /* =====================================================================
       主绘制
       ===================================================================== */
    draw(ctx, L, t) {
      if (L < TL.rot) {
        this.shotLandscape(ctx, L, t, 0);
      } else if (L < TL.gateIn) {
        this.shotLandscape(ctx, L, t, clamp((L - TL.rot) / (TL.rotEnd - TL.rot)));
      } else if (L < TL.macro) {
        this.shotGates(ctx, L, t);
      } else if (L < TL.pull) {
        this.shotMacro(ctx, L, t);
      } else {
        this.shotWide(ctx, L, t);
      }
      DFS.dbg({
        s03Ridge: this._ridgePts,
        s03Sparks: this.sparks.length
      });
    }

    hudDark(L) { return L > 1.92; }
  };
})(window.DFS);
