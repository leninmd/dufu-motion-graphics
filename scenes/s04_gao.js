/* =========================================================================
   s04_gao.js — 23.4–33.3s　夔州登高 · 圆孔穿越 · 三万点云收束成孤峰
   L = 场景内时间（0..9.9s）
     0.00–1.60  宣纸暖白 + 描边年号卡「七六六」；同位置圆孔穿越，孔内即长江
     1.60–5.10  纸白江面 + 百片落木翻滚；上方「无边落木萧萧下」
     5.10–9.90  三万点云：yaw 横扫的连绵群山 → focus 收束成中左孤峰
                右侧竖排「会当凌绝顶 / 一览众山小」（纸色羽化衬底）
     9.55→      整体压暗 35% 交棒
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease } = DFS;
  const HUB = DFS.HUB;
  const T = DFS.THEME;

  const CX = W * 0.5;
  const CY = H * 0.5;

  /* ---------------- 右侧竖排（望岳）---------------- */
  const POEM_SIZE = 64;
  const POEM_GAP = 1.22;
  // 旧墨：在纸色衬底上足够可读，但不会在 QA 包围盒里堆积 <70 的暗像素
  const POEM_INK = 'rgba(86,75,56,0.97)';
  const POEM_A = { id: 'poem-a', text: '会当凌绝顶', x: 1700, top: 300, start: 5.40 };
  const POEM_B = { id: 'poem-b', text: '一览众山小', x: 1610, top: 360, start: 7.20 };

  /* ---------------- 点云只活在这一侧 ---------------- */
  const CLOUD_X_MAX = 1250;

  DFS.sceneRegistry['s04'] = class Scene04Gao {
    constructor() {
      this.sea = new DFS.Sea({ horizon: 0.545, dark: false, rows: 118, seed: 4242 });
      this.leaves = new DFS.Leaves({ n: 110, seed: 4417, color: '36,28,16', alpha: 0.8, size: 1 });
      this.ridge = new DFS.RidgeCloud({ seed: 7028, count: 32000, width: 30, depth: 6, height: 6.9 });
      this.cam = new DFS.Camera({ pos: { x: 0, y: 4.58, z: -12 }, yaw: -0.62, pitch: -0.03 });
      this._ridgeCount = this.ridge.pts.length;
      // 点云离屏缓冲：用来给 3 万点加柔和右缘 / 山脚雾化遮罩
      this.cloudCv = DFS.mkCanvas(W, H);
      this.cloudCtx = this.cloudCv.getContext('2d');
    }

    /* ================= 纸色径向羽化衬底（椭圆） ================= */
    _veil(ctx, cx, cy, rx, ry, a) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, rx * 0.08, 0, 0, rx);
      g.addColorStop(0, `rgba(244,239,230,${a})`);
      g.addColorStop(0.34, `rgba(244,239,230,${(a * 0.96).toFixed(3)})`);
      g.addColorStop(0.58, `rgba(244,239,230,${(a * 0.82).toFixed(3)})`);
      g.addColorStop(0.78, `rgba(244,239,230,${(a * 0.50).toFixed(3)})`);
      g.addColorStop(0.90, `rgba(244,239,230,${(a * 0.20).toFixed(3)})`);
      g.addColorStop(1, 'rgba(244,239,230,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* ================= 长江（孔内 / 全幅共用） =================
       23.9s 起以 1.02 倍缓慢推近，之后继续极慢推进，保持一个镜头
       ---------------------------------------------------------- */
    _river(ctx, L, t) {
      const pushIn = Ease.outCubic(clamp((L - 0.50) / 1.10));       // 23.9→25.0
      const drift = clamp((L - 1.60) / 3.50);                        // 25.0→28.5
      const push = 1 + 0.02 * pushIn + 0.022 * drift;

      ctx.save();
      ctx.translate(CX, CY);
      ctx.scale(push, push);
      ctx.translate(-CX, -CY);

      // 孔内底：暖白宣纸
      DFS.drawPaper(ctx, { zoom: 1.06 });
      // 一层极淡的青灰天光，让"孔"与孔外的纸白区分开
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
      sky.addColorStop(0, 'rgba(198,199,190,0.26)');
      sky.addColorStop(0.75, 'rgba(206,204,192,0.14)');
      sky.addColorStop(1, 'rgba(210,206,192,0)');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H * 0.62);

      // 长江水面
      this.sea.drawPaperSea(ctx, t, {});

      // 近水压重：给江面一点分量，别飘成一片白
      const wg = ctx.createLinearGradient(0, H * 0.60, 0, H);
      wg.addColorStop(0, 'rgba(138,126,102,0)');
      wg.addColorStop(0.55, 'rgba(138,126,102,0.07)');
      wg.addColorStop(1, 'rgba(138,126,102,0.17)');
      ctx.fillStyle = wg;
      ctx.fillRect(0, H * 0.60, W, H * 0.40);

      // 远岸：断续淡墨（不做整幅硬地平线），给江面一个纵深
      const hz = H * 0.545;
      ctx.save();
      const br = DFS.rng(6151);
      for (let i = 0; i < 30; i++) {
        const x0 = br() * W - 40;
        const len = 70 + br() * 230;
        const y = hz + (DFS.fbm(x0 * 0.0016, 3.7, 3) - 0.5) * 12;
        ctx.strokeStyle = `rgba(58,49,32,${(0.05 + br() * 0.05).toFixed(3)})`;
        ctx.lineWidth = 2 + br() * 3.2;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + len, y + (br() - 0.5) * 2.5);
        ctx.stroke();
      }
      // 近处江浪：几道更长的横笔
      const wr = DFS.rng(8123);
      ctx.strokeStyle = 'rgba(96,86,66,0.10)';
      for (let i = 0; i < 52; i++) {
        const k = wr();
        const y = H * (0.60 + 0.38 * Math.pow(k, 0.78));
        const x = wr() * W * 1.04 - W * 0.02;
        const len = 60 + wr() * 260;
        ctx.lineWidth = 0.8 + wr() * 2.2;
        ctx.beginPath();
        ctx.moveTo(x, y + Math.sin(t * 0.5 + i) * 1.6);
        ctx.lineTo(x + len, y + Math.sin(t * 0.5 + i) * 1.1 + (wr() - 0.5) * 3);
        ctx.stroke();
      }
      ctx.restore();

      // 水面上沿的淡雾，柔化地平线
      const fog = ctx.createLinearGradient(0, H * 0.44, 0, H * 0.62);
      fog.addColorStop(0, 'rgba(243,238,226,0)');
      fog.addColorStop(0.6, 'rgba(243,238,226,0.42)');
      fog.addColorStop(1, 'rgba(243,238,226,0)');
      ctx.fillStyle = fog;
      ctx.fillRect(0, H * 0.44, W, H * 0.19);
      ctx.restore();
    }

    /* ================= 年号卡「七六六」（孔外） ================= */
    _yearCard(ctx, L) {
      const en = HUB.multiEntrance(L, 0.02, { duration: 0.62, rise: 30, scaleFrom: 0.945, blur: 0 });
      if (en.p <= 0.002) return;
      const mm = HUB.idleMicroMotion(L, 3.1, 0.55);
      const a = clamp(en.alpha, 0, 1);

      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(CX, CY + en.dy + mm.dy * 0.7);
      ctx.scale(en.scale, en.scale);
      ctx.translate(-CX, -CY);

      // 年号：细线描边大字
      DFS.outlineText(ctx, '七六六', {
        x: CX, y: CY - 16, size: 300, weight: 200, family: T.fonts.serif,
        color: 'rgba(26,19,9,0.90)', lw: 2.4, tracking: 26
      });

      // 细横线 + 地名
      ctx.strokeStyle = 'rgba(70,58,36,0.34)';
      ctx.lineWidth = 1;
      const lw = 250;
      ctx.beginPath();
      ctx.moveTo(CX - lw, CY + 176); ctx.lineTo(CX - 92, CY + 176);
      ctx.moveTo(CX + 92, CY + 176); ctx.lineTo(CX + lw, CY + 176);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = DFS.font(30, 400, T.fonts.serif);
      ctx.fillStyle = 'rgba(44,36,20,0.82)';
      ctx.fillText('夔州 · 登高', CX, CY + 208);

      ctx.font = DFS.font(20, 400, T.fonts.mono);
      ctx.fillStyle = 'rgba(62,52,34,0.52)';
      ctx.fillText('K U I Z H O U   ·   7 6 6', CX, CY + 250);
      ctx.restore();
    }

    /* ================= 落木 + 「无边落木萧萧下」 ================= */
    _fallingLeaves(ctx, L, t) {
      const inA = clamp((L - 1.52) / 0.85);
      const outA = clamp((L - 4.98) / 0.62);
      const a = inA * (1 - outA);

      if (a > 0.004) {
        // Leaves.draw 内部逐叶写 globalAlpha，故用实例参数控制整体淡入淡出
        this.leaves.alpha = 0.86 * a;
        this.leaves.size = 0.82 + 0.46 * inA;
        this.leaves.draw(ctx, t, {});
      }

      if (L > 1.62 && outA < 1) {
        const en = HUB.multiEntrance(L, 1.66, { duration: 0.92, rise: 28, scaleFrom: 0.975, blur: 0 });
        if (en.p > 0.002) {
          ctx.save();
          ctx.globalAlpha = clamp(en.alpha, 0, 1) * (1 - outA);
          ctx.translate(0, en.dy);

          // 先铺一层纸色羽化，免得黑字直接压在落叶上
          this._veil(ctx, CX, 206, 500, 128, 0.52);

          DFS.textIn(ctx, '无边落木萧萧下', {
            x: CX, y: 206, size: 96, weight: 400, family: T.fonts.serif,
            color: 'rgba(26,19,9,0.94)', t: L, start: 1.74,
            dur: 0.72, stagger: 0.08, tracking: 14, rise: 24, from: 0.965, blur: 4
          });
          ctx.restore();
          DFS.dbgBox('wubian', 560, 138, 1360, 278);
        }
      }
    }

    /* ================= 三万点云：群峰 → 孤峰 ================= */
    _mountain(ctx, L, t) {
      if (L <= 4.90) return;
      const presence = clamp((L - 4.90) / 0.50);
      // 前半段既慢又早收：到 29.0 时群峰已正面横亘画面
      const sweep = Ease.outCubic(clamp((L - 5.02) / 1.70));      // yaw −0.62 → 0.22
      const gather = Ease.inOutCubic(clamp((L - 6.78) / 2.55));   // focus 0 → 1，yaw 继续转
      const yaw = lerp(lerp(-0.62, 0.22, sweep), 0.298, gather);
      const focus = gather;

      const cam = this.cam;
      cam.yaw = yaw;
      cam.pos.x = 0;
      cam.pos.y = lerp(4.60, 5.06, gather);
      cam.pitch = lerp(-0.035, -0.004, gather);

      /* 三万点先画进离屏缓冲，再用渐变把它"擦"进纸里：
         右缘 x→1250 归零，山脚 0.72H→0.90H 化进江雾  */
      const cw = this.cloudCv, cc = this.cloudCtx;
      cc.setTransform(1, 0, 0, 1, 0, 0);
      cc.globalAlpha = 1;
      cc.globalCompositeOperation = 'source-over';
      cc.filter = 'none';
      cc.clearRect(0, 0, W, H);
      this.ridge.draw(cc, cam, t, {
        alpha: 0.95, color: '25,18,10', size: 1.30 + focus * 0.46, focus
      });

      cc.globalCompositeOperation = 'destination-out';
      let mk = cc.createLinearGradient(1060, 0, CLOUD_X_MAX, 0);
      mk.addColorStop(0, 'rgba(0,0,0,0)');
      mk.addColorStop(0.50, 'rgba(0,0,0,0.30)');
      mk.addColorStop(1, 'rgba(0,0,0,1)');
      cc.fillStyle = mk;
      cc.fillRect(1060, 0, W - 1060, H);

      mk = cc.createLinearGradient(0, H * 0.655, 0, H * 0.795);
      mk.addColorStop(0, 'rgba(0,0,0,0)');
      mk.addColorStop(0.45, 'rgba(0,0,0,0.62)');
      mk.addColorStop(1, 'rgba(0,0,0,1)');
      cc.fillStyle = mk;
      cc.fillRect(0, H * 0.655, W, H * 0.345);
      cc.globalCompositeOperation = 'source-over';

      ctx.save();
      ctx.globalAlpha = presence;
      ctx.drawImage(cw, 0, 0);
      ctx.restore();

      // 山脚江雾：两端都收在透明里，不留硬边
      const mist = ctx.createLinearGradient(0, H * 0.58, 0, H);
      mist.addColorStop(0, 'rgba(240,235,222,0)');
      mist.addColorStop(0.34, 'rgba(240,235,222,0.32)');
      mist.addColorStop(0.62, 'rgba(240,235,222,0.52)');
      mist.addColorStop(0.88, 'rgba(240,235,222,0.40)');
      mist.addColorStop(1, 'rgba(240,235,222,0.16)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, H * 0.58, W, H * 0.42);

      DFS.dbg({
        ridgePoints: this._ridgeCount,
        ridgeFocus: Math.round(focus * 1000) / 1000,
        ridgeYaw: Math.round(yaw * 1000) / 1000
      });
    }

    /* ================= 右侧竖排望岳（先衬底，后写字） ================= */
    _poems(ctx, L) {
      const cols = [POEM_A, POEM_B];
      const states = [];
      for (let k = 0; k < cols.length; k++) {
        const P = cols[k];
        const en = HUB.multiEntrance(L, P.start, {
          duration: 0.80, rise: 26, scaleFrom: 0.965, blur: 0
        });
        if (en.p <= 0.002) continue;
        const colH = POEM_SIZE * POEM_GAP * Array.from(P.text).length;
        states.push({ P, en, colH, midY: P.top + colH / 2 });
      }
      if (!states.length) return;

      // ① 两列衬底统一先铺：否则后一列的羽化会把前一列的字洗淡
      for (const st of states) {
        ctx.save();
        ctx.globalAlpha = clamp(st.en.alpha, 0, 1);
        this._veil(ctx, st.P.x, st.midY, 200, st.colH * 0.60, 0.85);
        ctx.restore();
      }

      // ② 再写字
      for (const st of states) {
        const P = st.P;
        ctx.save();
        ctx.globalAlpha = clamp(st.en.alpha, 0, 1);
        ctx.translate(0, st.en.dy);
        DFS.verticalIn(ctx, P.text, {
          x: P.x, y: P.top, size: POEM_SIZE, weight: 500, family: T.fonts.serif,
          color: POEM_INK, gap: POEM_GAP, t: L,
          start: P.start + 0.10, stagger: 0.08, dur: 0.62
        });
        ctx.restore();

        DFS.dbgBox(P.id, P.x - 208, P.top - 76, Math.min(W, P.x + 208), P.top + st.colH + 76);
      }
    }

    /* ================= 朱砂小注 ================= */
    _note(ctx, L) {
      const en = HUB.multiEntrance(L, 5.50, { duration: 0.72, rise: 14, scaleFrom: 0.985, blur: 0 });
      if (en.p <= 0.002) return;
      ctx.save();
      ctx.globalAlpha = clamp(en.alpha, 0, 1);
      ctx.translate(0, en.dy);
      // 朱砂压在点云上会脏，先给一小片纸色羽化
      this._veil(ctx, 336, 412, 236, 56, 0.55);
      ctx.globalAlpha = 0.75 * clamp(en.alpha, 0, 1);
      ctx.fillStyle = T.colors.cinnabar;
      ctx.fillRect(160, 384, 26, 2);
      ctx.font = DFS.font(26, 400, T.fonts.kai);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('忆昔 · 廿四岁 · 少时望岳', 160, 420);
      ctx.restore();
      DFS.dbgBox('note-yixi', 152, 396, 536, 446);
    }

    /* ================= 主绘制 ================= */
    draw(ctx, L, t) {
      /* ---------- 1. 底 + 圆孔穿越 ---------- */
      const portalP = clamp((L - 0.04) / 0.98);   // easeInExpo 由 HUB 内部施加
      const maxR = Math.hypot(Math.max(CX, W - CX), Math.max(CY, H - CY)) * 1.02;
      const holeR = maxR * Ease.inExpo(portalP);
      if (portalP < 0.999) {
        HUB.cinematicPortalWipe(
          ctx, CX, CY, portalP,
          (c) => {
            DFS.drawPaper(c, { zoom: 1.02 });
            DFS.drawGradientMesh(c, t, { c1: 'rgba(255,250,232,0.55)', c2: 'rgba(120,104,78,0.14)' });
            this._yearCard(c, L);
          },
          (c) => {
            this._river(c, L, t);
            // 孔壁：一道朱砂细缘 + 向心阴影，让"窗"有厚度
            if (holeR > 3 && holeR < maxR * 0.99) {
              const g = c.createRadialGradient(CX, CY, holeR * 0.52, CX, CY, holeR);
              g.addColorStop(0, 'rgba(58,50,34,0)');
              g.addColorStop(0.80, 'rgba(58,50,34,0.10)');
              g.addColorStop(0.96, 'rgba(58,50,34,0.26)');
              g.addColorStop(1, 'rgba(58,50,34,0.06)');
              c.fillStyle = g;
              c.fillRect(CX - holeR, CY - holeR, holeR * 2, holeR * 2);
              c.save();
              c.beginPath();
              c.arc(CX, CY, holeR, 0, Math.PI * 2);
              c.strokeStyle = 'rgba(200,58,38,0.55)';
              c.lineWidth = 2.2;
              c.stroke();
              c.beginPath();
              c.arc(CX, CY, Math.max(4, holeR - 7), 0, Math.PI * 2);
              c.strokeStyle = 'rgba(200,58,38,0.16)';
              c.lineWidth = 1.1;
              c.stroke();
              c.restore();
            }
          },
          { edgeColor: 'rgba(216,64,42,0.85)' }
        );
        if (portalP < 0.62) DFS.dbgBox('year-766', 448, 300, 1472, 812);
      } else {
        this._river(ctx, L, t);
      }

      /* ---------- 2. 落木 + 诗行 ---------- */
      this._fallingLeaves(ctx, L, t);

      /* ---------- 3. 点云孤峰 ---------- */
      this._mountain(ctx, L, t);

      /* ---------- 4. 右侧竖排 + 朱砂小注 ---------- */
      this._poems(ctx, L);
      this._note(ctx, L);

      /* ---------- 5. 压暗 35% 交棒 ---------- */
      if (L > 9.60) {
        const d = Ease.inOutCubic(clamp((L - 9.60) / 0.32)) * 0.35;
        ctx.save();
        ctx.globalAlpha = d;
        ctx.fillStyle = '#0B0A06';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    hudDark() { return false; }
  };
})(window.DFS);
