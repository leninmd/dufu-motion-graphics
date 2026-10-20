/* =========================================================================
   s06_timeline.js — 37.7–54.9s（L 0–17.2s）月涌大江 · 沙鸥 · 4,739 公里
   湘江寒夜（月光走廊 + 孤舟）→ 160 粒子水墨沙鸥 → 冲入月光 / 宣纸白 →
   「诗是吾家事」飞白枯笔 → 朱印「少陵野老」→ 一生轨迹 7 节点 → 核心金句
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease, rng } = DFS;
  const HUB = DFS.HUB;
  const T = DFS.THEME;

  const MOON = { x: 960, y: H * 0.22, r: 50 };
  const HZ = H * 0.52;
  const N_GULL = 160;

  const STATIONS = [
    { name: '巩县', year: '712', km: 0 },
    { name: '兖州', year: '736', km: 705 },
    { name: '长安', year: '746', km: 1037 },
    { name: '秦州', year: '759', km: 2600 },
    { name: '成都', year: '760', km: 3100 },
    { name: '夔州', year: '766', km: 3880 },
    { name: '潭州', year: '770', km: 4739 }
  ];

  const bez2 = (p0, p1, p2, u) => {
    const v = 1 - u;
    return {
      x: v * v * p0.x + 2 * v * u * p1.x + u * u * p2.x,
      y: v * v * p0.y + 2 * v * u * p1.y + u * u * p2.y
    };
  };

  DFS.sceneRegistry['s06'] = class Scene06V2 {
    constructor() {
      this.stationX = STATIONS.map((s, i) => lerp(160, 1760, i / (STATIONS.length - 1)));
      this.gull = this._buildGull();
      const r = rng(5511);
      this.stars = Array.from({ length: 150 }, () => ({
        x: r() * W, y: r() * HZ * 0.94, s: 0.7 + r() * 1.7,
        ph: r() * 6.283, a: 0.14 + r() * 0.76
      }));
      const c = rng(881);
      this.wisps = Array.from({ length: 7 }, () => ({
        x: W * (0.10 + c() * 0.80), y: HZ * (0.30 + c() * 0.62),
        w: 220 + c() * 460, h: 26 + c() * 46, a: 0.05 + c() * 0.10
      }));
    }

    /* ================= 160 颗发光微粒：两段贝塞尔翼形 + 身体椭圆 ================= */
    _wingCurves(sgn) {
      // 远翼（左）短一点，制造透视
      const k = sgn > 0 ? 1 : 0.80;
      return {
        up: [{ x: 2 * sgn * k, y: -4 }, { x: 62 * sgn * k, y: -62 }, { x: 172 * sgn * k, y: -104 }],
        lo: [{ x: 0, y: 14 }, { x: 56 * sgn * k, y: -18 }, { x: 152 * sgn * k, y: -74 }]
      };
    }

    _buildGull() {
      const rnd = rng(6613);
      const pts = [];
      for (const sgn of [-1, 1]) {
        const { up, lo } = this._wingCurves(sgn);
        for (let i = 0; i < 58; i++) {
          const u = clamp((i + 0.5 + (rnd() - 0.5) * 0.7) / 58);
          // 30% 压在翼缘勾剪影，70% 铺满翼面
          const edge = (i % 10) < 3;
          const v = edge ? (rnd() < 0.5 ? 0.02 + rnd() * 0.10 : 0.88 + rnd() * 0.10) : 0.06 + rnd() * 0.88;
          const a = bez2(up[0], up[1], up[2], u);
          const b = bez2(lo[0], lo[1], lo[2], u);
          pts.push({
            wing: sgn, u, x: lerp(b.x, a.x, v), y: lerp(b.y, a.y, v) + Math.sin(Math.PI * u) * 8 * (1 - v),
            s: 1.1 + rnd() * 2.0, ph: rnd() * 6.283, br: 0.60 + rnd() * 0.40
          });
        }
      }
      // 身体椭圆 28
      for (let i = 0; i < 28; i++) {
        const a = rnd() * 6.283, d = Math.sqrt(rnd());
        pts.push({
          wing: 0, u: 0, x: 4 + Math.cos(a) * 32 * d, y: Math.sin(a) * 13 * d,
          s: 1.3 + rnd() * 2.0, ph: rnd() * 6.283, br: 0.70 + rnd() * 0.30
        });
      }
      // 头 / 喙 8
      for (let i = 0; i < 8; i++) {
        const a = rnd() * 6.283, d = Math.sqrt(rnd());
        pts.push({
          wing: 0, u: 0, x: 40 + Math.cos(a) * 10 * d, y: -6 + Math.sin(a) * 7 * d,
          s: 1.2 + rnd() * 1.5, ph: rnd() * 6.283, br: 0.8 + rnd() * 0.2
        });
      }
      // 尾 8
      for (let i = 0; i < 8; i++) {
        pts.push({
          wing: 0, u: 0, x: -34 - rnd() * 22, y: -7 + rnd() * 14,
          s: 1.0 + rnd() * 1.2, ph: rnd() * 6.283, br: 0.45 + rnd() * 0.35
        });
      }
      // 翼形轮廓（极淡的衬底，让剪影成立）
      this.wingOutline = [-1, 1].map((sgn) => {
        const { up, lo } = this._wingCurves(sgn);
        const poly = [];
        for (let i = 0; i <= 14; i++) poly.push(bez2(up[0], up[1], up[2], i / 14));
        for (let i = 14; i >= 0; i--) poly.push(bez2(lo[0], lo[1], lo[2], i / 14));
        return poly;
      });
      return pts;
    }

    /* ================= 夜：天 / 水 / 舟 / 鸥 ================= */
    _drawNight(ctx, L, t) {
      // 夜空
      const g = ctx.createLinearGradient(0, 0, 0, HZ + 8);
      g.addColorStop(0, '#070A08');
      g.addColorStop(0.55, '#10160F');
      g.addColorStop(1, '#26301F');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, HZ + 10);

      // 星
      ctx.save();
      for (const s of this.stars) {
        const a = s.a * (0.50 + 0.50 * Math.sin(t * 1.25 + s.ph));
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(238,236,214,1)';
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
      ctx.restore();

      // 月边的薄云
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const w of this.wisps) {
        const x = w.x + Math.sin(t * 0.05 + w.y) * 40;
        const wg = ctx.createRadialGradient(x, w.y, 0, x, w.y, w.w * 0.5);
        wg.addColorStop(0, `rgba(206,210,190,${w.a})`);
        wg.addColorStop(1, 'rgba(206,210,190,0)');
        ctx.fillStyle = wg;
        ctx.save();
        ctx.translate(x, w.y);
        ctx.scale(1, w.h / (w.w * 0.5));
        ctx.beginPath(); ctx.arc(0, 0, w.w * 0.5, 0, 6.28318); ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // 水面 + 月光走廊
      HUB.waterMoonShader(ctx, W, H, t, {
        horizon: HZ,
        moonX: MOON.x,
        moonY: MOON.y,
        moonR: MOON.r + 16 * clamp((L - 7.2) / 1.6),
        rows: 170,
        seed: 4242
      });

      // 地平线薄雾
      const mg = ctx.createLinearGradient(0, HZ - 90, 0, HZ + 70);
      mg.addColorStop(0, 'rgba(190,198,178,0)');
      mg.addColorStop(0.52, 'rgba(190,198,178,0.12)');
      mg.addColorStop(1, 'rgba(190,198,178,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(0, HZ - 90, W, 160);

      this._drawBoat(ctx, L, t);
      this._drawGull(ctx, L, t);
      this._drawNightPoem(ctx, L, t);

      DFS.drawGrainVignette(ctx, Math.round(t * DFS.FPS), { grain: 0.42, vig: 0.30, vigMid: 0.05 });
    }

    _drawBoat(ctx, L, t) {
      const a = clamp((L - 0.45) / 1.2) * (1 - clamp((L - 8.55) / 0.5));
      if (a <= 0.01) return;
      const bx = lerp(640, 980, Ease.inOutCubic(clamp(L / 8.9))) + Math.sin(t * 0.62) * 5;
      const by = H * 0.663 + Math.sin(t * 1.15) * 4.2 + Math.sin(t * 2.4) * 1.6;
      ctx.save();
      // 舟下压暗，切断月光碎屑
      const dg = ctx.createRadialGradient(bx, by + 8, 4, bx, by + 8, 140);
      dg.addColorStop(0, `rgba(5,7,5,${0.66 * a})`);
      dg.addColorStop(1, 'rgba(5,7,5,0)');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.ellipse(bx, by + 10, 140, 32, 0, 0, 6.28318);
      ctx.fill();
      // 月光镶边 + 墨色船身
      DFS.boat(ctx, bx - 2.6, by - 2.4, 0.55, {
        color: '198,200,172', alpha: 0.40 * a, t, figure: true, figureColor: '206,206,180'
      });
      DFS.boat(ctx, bx, by, 0.55, {
        color: '6,8,6', alpha: 0.97 * a, t, figure: true, figureColor: '5,7,5'
      });
      // 尾迹
      ctx.globalAlpha = a * 0.30;
      ctx.strokeStyle = 'rgba(226,226,202,1)';
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 5; k++) {
        const d = 46 + k * 26;
        const yy = by + 12 + Math.sin(t * 1.4 + k) * 2.5;
        ctx.globalAlpha = a * (0.26 - k * 0.042);
        ctx.beginPath();
        ctx.moveTo(bx - d, yy);
        ctx.lineTo(bx - d - 26 - k * 10, yy + 1.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawGull(ctx, L, t) {
      const p = clamp((L - 4.3) / 3.9);
      if (p <= 0.001) return;
      const fade = 1 - clamp((L - 7.60) / 0.95);
      if (fade <= 0.01) return;
      const ge = Ease.inOutCubic(p);
      const gx = lerp(760, 958, ge);
      const gy = lerp(470, 300, ge) - Math.sin(ge * Math.PI) * 22;
      const gs = lerp(0.88, 0.66, ge);
      const rot = -0.42 + Math.sin(t * 0.9) * 0.045 + ge * 0.05;
      const flap = Math.sin(t * 7.4);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // 尾迹：24 颗渐隐星点
      for (let k = 1; k < 25; k++) {
        const q = clamp(p - k * 0.0092);
        const qe = Ease.inOutCubic(q);
        const tx = lerp(760, 958, qe);
        const ty = lerp(470, 300, qe) - Math.sin(qe * Math.PI) * 22;
        const al = Math.pow(1 - k / 25, 1.9) * 0.34 * fade;
        if (al <= 0.01) continue;
        ctx.globalAlpha = al;
        ctx.fillStyle = 'rgba(220,230,255,1)';
        const rr = 2.2 * (1 - k / 25) + 0.4;
        ctx.beginPath();
        ctx.arc(tx + Math.sin(k * 1.7 + t) * 2, ty + Math.cos(k * 1.3) * 2, rr, 0, 6.28318);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(rot);
      ctx.scale(gs, gs);

      // 1) 墨形：在月亮前形成剪影，也压住白粒子的浮散
      ctx.globalAlpha = fade * 0.62;
      ctx.fillStyle = 'rgba(9,13,10,1)';
      for (const poly of this.wingOutline) {
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(4, 0, 36, 14, 0, 0, 6.28318);
      ctx.fill();

      // 2) 白色发光微粒
      ctx.globalAlpha = fade;
      ctx.globalCompositeOperation = 'lighter';

      // 极淡的翼形衬底
      ctx.fillStyle = 'rgba(176,198,232,0.16)';
      for (const poly of this.wingOutline) {
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y + Math.sin(t * 7.4) * 2);
        for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(4, 0, 36, 14, 0, 0, 6.28318);
      ctx.fill();

      // 身体柔光
      const bg = ctx.createRadialGradient(4, 0, 2, 4, 0, 58);
      bg.addColorStop(0, 'rgba(226,236,255,0.22)');
      bg.addColorStop(1, 'rgba(226,236,255,0)');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(4, 0, 58, 0, 6.28318); ctx.fill();

      // 微粒：外发光 + 实心核（双翼正弦扑动）
      for (const pt of this.gull) {
        let px = pt.x, py = pt.y;
        if (pt.wing) {
          const ang = -flap * 0.10 * Math.pow(pt.u, 0.85) * (pt.wing > 0 ? 1 : -1);
          const cs = Math.cos(ang), sn = Math.sin(ang);
          px = pt.x * cs - pt.y * sn;
          py = pt.x * sn + pt.y * cs + flap * 6 * Math.pow(pt.u, 1.2);
        }
        const tw = 0.78 + 0.22 * Math.sin(t * 6.2 + pt.ph);
        // 光晕
        ctx.globalAlpha = fade * 0.085 * pt.br;
        ctx.fillStyle = 'rgba(210,226,255,1)';
        ctx.beginPath(); ctx.arc(px, py, pt.s * 3.8, 0, 6.28318); ctx.fill();
        // 核
        ctx.globalAlpha = fade * (0.55 + 0.45 * pt.br) * tw;
        ctx.fillStyle = 'rgba(250,252,255,1)';
        const s = pt.s * 1.25;
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
      }
      ctx.restore();
    }

    _drawNightPoem(ctx, L, t) {
      const cols = [
        { text: '飘飘何所似', x: 420, start: 5.05 },
        { text: '天地一沙鸥', x: 340, start: 5.42 }
      ];
      const exit = HUB.fastExit(L, 8.35, { duration: 0.3, rise: 10, blur: 6 });
      if (exit.alpha <= 0.01) return;
      for (const c of cols) {
        const e = HUB.multiEntrance(L, c.start - 0.1, { duration: 0.75, rise: 34, scaleFrom: 0.95 });
        if (e.alpha <= 0.002) continue;
        const mm = HUB.idleMicroMotion(t, c.x * 0.01);
        ctx.save();
        ctx.globalAlpha = e.alpha * exit.alpha;
        ctx.translate(mm.dx * 0.5, e.dy + mm.dy * 0.6);
        HUB.vertical(ctx, c.text, {
          x: c.x, y: 272, size: 56, gap: 1.24, color: 'rgba(238,242,238,0.90)', weight: 400
        });
        ctx.restore();
        DFS.dbgBox(c.text === '飘飘何所似' ? 'gull-line-1' : 'gull-line-2',
          c.x - 34, 262, c.x + 34, 272 + 56 * 1.24 * 5);
      }
    }

    /* ================= 纸：诗 / 印 / 轨迹 / 金句 ================= */
    _drawPaperScene(ctx, L, t) {
      HUB.fiveLayerStack(ctx, t, {
        dark: false,
        grade: 'warm',
        grain: 0.40,
        vignette: 0.22,
        vignetteMid: 0.03,
        layer1: (c) => {
          DFS.drawPaper(c, { zoom: 1.015 });
          DFS.drawGradientMesh(c, t, {
            c1: 'rgba(255,250,232,0.55)', c2: 'rgba(120,104,78,0.12)'
          });
        },
        layer2: (c) => {
          // 极淡的纸背墨晕（只在诗行下方，可忽略）
          c.save();
          c.globalAlpha = 0.5;
          DFS.drawInkWash(c, { x: 960, y: 400, r: 260, seed: 71, alpha: 0.02 });
          c.restore();
        },
        layer3: (c) => {
          this._poemShi(c, L, t);
          this._stamp(c, L, t);
          this._timeline(c, L, t);
          this._quote(c, L, t);
        }
      });
    }

    _poemShi(ctx, L, t) {
      const assemble = clamp((L - 8.75) / 1.15);
      const dissolve = clamp((L - 12.10) / 1.25);
      if (assemble <= 0.001 || dissolve >= 1) return;
      const chars = Array.from('诗是吾家事');
      const size = 126, step = size * 1.055;
      const y0 = 430 - step * (chars.length - 1) / 2;
      for (let i = 0; i < chars.length; i++) {
        HUB.offscreenWindDissolve(ctx, chars[i], 960, y0 + i * step, {
          size, weight: 500, family: T.fonts.kai,
          assemble, dissolve, wind: 0.85,
          color: '30,22,11', seed: 17 + i * 3, sizePx: 2.4, step: 3
        });
      }
      DFS.dbgBox('poem-shi', 960 - 74, y0 - 76, 960 + 74, y0 + (chars.length - 1) * step + 76);
    }

    _stamp(ctx, L, t) {
      const p = clamp((L - 10.88) / 0.95);
      if (p <= 0.001) return;
      HUB.inkStampSplash(ctx, 1350, 608, p, 41, {
        size: 150, text: '少陵野老', chars: 'multi', rotate: -0.04
      });
    }

    _timeline(ctx, L, t) {
      const T0 = 11.90, T1 = 14.40;
      const p = clamp((L - T0) / (T1 - T0));
      if (p <= 0) return;
      const prog = Ease.outCubic(p);
      const x0 = 160, x1 = 1760, y = H * 0.70;
      const xEnd = lerp(x0, x1, prog);

      ctx.save();
      // 轨迹线：底光 + 主线 + 起笔的重墨
      ctx.strokeStyle = 'rgba(216,56,30,1)';
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(xEnd, y); ctx.stroke();
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(xEnd, y); ctx.stroke();
      // 手绘的墨渍
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const u = (i + 0.5) / 14;
        const xx = lerp(x0, xEnd, u);
        if (xx > xEnd) break;
        ctx.beginPath();
        ctx.moveTo(xx, y - 4 - (i % 3));
        ctx.lineTo(xx, y + 4 + (i % 2));
        ctx.stroke();
      }
      // 扫过的笔头
      if (p < 0.999) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(255,232,208,1)';
        ctx.beginPath(); ctx.arc(xEnd, y, 4.2, 0, 6.28318); ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = 'rgba(216,56,30,1)';
        ctx.beginPath(); ctx.arc(xEnd, y, 13, 0, 6.28318); ctx.fill();
      }
      ctx.restore();

      let lastP = 0;
      for (let i = 0; i < STATIONS.length; i++) {
        const st = STATIONS[i];
        const sx = this.stationX[i];
        const np = Ease.outExpo(clamp((xEnd - sx + 22) / 64));
        if (np <= 0.002) continue;
        lastP = np;
        const isEnd = i === STATIONS.length - 1;
        ctx.save();
        ctx.globalAlpha = np;
        // 刻度
        ctx.strokeStyle = isEnd ? 'rgba(198,40,22,1)' : 'rgba(190,52,32,0.88)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, y - 17 * np);
        ctx.lineTo(sx, y + 17 * np);
        ctx.stroke();
        // 圆点
        ctx.fillStyle = isEnd ? 'rgba(198,40,22,1)' : 'rgba(198,52,32,0.95)';
        ctx.beginPath(); ctx.arc(sx, y, 4.6 * (0.6 + 0.4 * np), 0, 6.28318); ctx.fill();
        ctx.fillStyle = 'rgba(248,240,224,0.9)';
        ctx.beginPath(); ctx.arc(sx, y, 1.7, 0, 6.28318); ctx.fill();
        // 地名
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = DFS.font(26, 500, T.fonts.serif);
        ctx.fillStyle = 'rgba(30,22,10,0.92)';
        ctx.fillText(st.name, sx, y - 46);
        // 年份
        HUB.monoNums(ctx, st.year, sx, y + 34, 16, {
          color: 'rgba(64,50,30,0.66)', weight: 500, align: 'center', tracking: 1.4
        });
        // 里程
        HUB.monoNums(ctx, DFS.km(st.km), sx, y + 58, 14, {
          color: isEnd ? 'rgba(190,44,26,0.95)' : 'rgba(70,56,34,0.48)',
          weight: 500, align: 'center', tracking: 1.2
        });
        // 终点的扩散红光
        if (isEnd) {
          for (let k = 0; k < 3; k++) {
            const ph = ((L - T1) / 1.35 + k / 3) % 1;
            const rr = 8 + ph * 62;
            ctx.globalAlpha = (1 - ph) * 0.42;
            ctx.strokeStyle = 'rgba(206,48,26,1)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(sx, y, rr, 0, 6.28318); ctx.stroke();
          }
          ctx.globalAlpha = np * (0.55 + 0.45 * Math.sin(L * 5.6));
          ctx.fillStyle = 'rgba(214,50,28,1)';
          ctx.beginPath(); ctx.arc(sx, y, 5.2, 0, 6.28318); ctx.fill();
        }
        ctx.restore();
        DFS.dbgBox('timeline-node-' + i, sx - 62, y - 62, sx + 62, y + 70);
      }
      if (p > 0.02) {
        DFS.dbgBox('timeline', x0 - 10, y - 66, x1 + 10, y + 74);
      }
      return lastP;
    }

    _quote(ctx, L, t) {
      const lines = [
        { text: '他一生走了四千七百公里，', size: 40, y: 212, start: 13.30, weight: 500 },
        { text: '留下一千四百多首诗。', size: 40, y: 270, start: 13.52, weight: 500 },
        { text: '没有一首，是写给自己看的。', size: 54, y: 346, start: 13.80, weight: 600, hl: '写给自己' }
      ];
      const x = 170;
      const mm = HUB.idleMicroMotion(t, 5.2);
      let maxW = 0, top = 1e9, bot = -1e9, any = false;
      for (const ln of lines) {
        const e = HUB.multiEntrance(L, ln.start, { duration: 0.62, rise: 26, scaleFrom: 0.97, blur: 5 });
        if (e.alpha <= 0.002) continue;
        const ex = HUB.fastExit(L, 16.30, { duration: 0.32, rise: 10, blur: 5 });
        if (ex.alpha <= 0.002) continue;
        any = true;
        ctx.save();
        ctx.globalAlpha = e.alpha * ex.alpha;
        ctx.translate(0, e.dy + mm.dy * 0.7);
        const w = HUB.quote(ctx, ln.text, {
          x, y: ln.y, size: ln.size, weight: ln.weight,
          color: 'rgba(24,17,7,0.95)',
          highlight: ln.hl, highlightColor: '#C1341E',
          tracking: ln.size * 0.02
        });
        ctx.restore();
        maxW = Math.max(maxW, w);
        top = Math.min(top, ln.y - ln.size * 0.66);
        bot = Math.max(bot, ln.y + ln.size * 0.66);
      }
      if (any) DFS.dbgBox('core-quote', x - 8, top, x + maxW + 10, bot);
    }

    /* ================= 主绘制 ================= */
    draw(ctx, L, t) {
      DFS.dbg({ gullParticles: N_GULL });
      const portal = clamp((L - 8.8) / 0.8);
      if (portal < 0.999) {
        // cinematicPortalWipe 内部用 easeInExpo，这里先把进度反解，使圆孔按 easeInOutCubic 匀速张开
        const want = Ease.inOutCubic(portal);
        const fed = clamp(1 + Math.log2(Math.max(1e-7, want)) / 10, 0, 1);
        HUB.cinematicPortalWipe(ctx, MOON.x, MOON.y, fed,
          (c) => this._drawNight(c, L, t),
          (c) => this._drawPaperScene(c, L, t),
          { edgeColor: 'rgba(255,248,222,0.85)' });
      } else {
        this._drawPaperScene(ctx, L, t);
      }
    }

    hudDark(L) { return L < 9.0; }
  };
})(window.DFS);
