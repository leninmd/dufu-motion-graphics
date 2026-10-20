/* =========================================================================
   s05_boat.js — 33.1–37.9s（L 0–4.8s）烽火家书 · 万金压信
   纸白底 → 万金计数器（1 → 10,000）→ 260 颗金球自底部与两侧涌入、
   堆满下半屏并把中央竖排家书向内挤压 →「烽火连三月 / 家书抵万金」
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease, rng } = DFS;
  const HUB = DFS.HUB;
  const T = DFS.THEME;

  const CX = 960;
  const LET = { y: 470, hw: 160, hh: 210 };   // 320 × 420 的信笺
  const N_COLS = 26, N_ROWS = 10, N_BALLS = N_COLS * N_ROWS;  // 260

  DFS.sceneRegistry['s05'] = class Scene05V2 {
    constructor() {
      this.balls = [];
      this.pinch = [];
      this._buildPile();
      this._buildLetterInk();
      // 空气里的金屑
      const r = rng(3311);
      this.dust = Array.from({ length: 64 }, () => ({
        x: r() * W, y: H * (0.16 + r() * 0.42), rad: 0.7 + r() * 2.1,
        ph: r() * 6.283, sp: 0.35 + r() * 1.1, a: 0.15 + r() * 0.5
      }));
    }

    /* ---------------- 金球堆 ---------------- */
    _buildPile() {
      const rnd = rng(91733);
      const cellW = W / N_COLS;
      const rowStep = 86;
      const balls = [];
      for (let row = 0; row < N_ROWS; row++) {
        const near = 1 - row / (N_ROWS - 1);      // 1 = 最前排（底部）
        for (let c = 0; c < N_COLS; c++) {
          const hex = (row % 2) ? cellW * 0.5 : 0;
          const x = c * cellW + cellW * 0.5 + hex + (rnd() - 0.5) * cellW * 0.55 - cellW * 0.25;
          const edge = Math.abs(x - CX) / (W * 0.5);
          // 丘形：两侧低，中央高（与金色基床的轮廓咬合）
          const y = 1046 - row * rowStep + edge * edge * 150 + (rnd() - 0.5) * 34;
          const rad = clamp(lerp(32, 86, near) * (0.58 + rnd() * 0.68) * (1 - edge * 0.10), 30, 90);
          // 入场：底部 58% / 左侧 21% / 右侧 21%
          const roll = rnd();
          let sx, sy;
          if (roll < 0.58) { sx = x + (rnd() - 0.5) * 130; sy = H + 240 + rnd() * 240; }
          else if (roll < 0.79) { sx = -240 - rnd() * 260; sy = y + 60 + rnd() * 150; }
          else { sx = W + 240 + rnd() * 260; sy = y + 60 + rnd() * 150; }
          const delay = 0.03 + (1 - near) * 0.46 + rnd() * 0.22;
          balls.push({ x, y, r: rad, near, sx, sy, delay, tone: rnd(), ph: rnd() * 6.283 });
        }
      }
      balls.sort((a, b) => (a.y - b.y) || (a.r - b.r));
      this.balls = balls;
      this.pinch = balls.filter((b) => Math.abs(b.x - CX) < 208 && b.y > 236 && b.y > 0 && b.y < 754);
      this.pinchSet = new Set(this.pinch);
    }

    /* ---------------- 家书上的淡墨小楷 ---------------- */
    _buildLetterInk() {
      const src = '三月烽火连家书抵万金身在长安心在故园不知老母可曾添衣' +
                  '儿女尚小乱世飘零若得一字可抵千金夜半灯下执笔难言惟愿平安勿念';
      const rnd = rng(4821);
      this.inkChars = [];
      let idx = 0;
      for (let c = 0; c < 5; c++) {
        const col = [];
        for (let k = 0; k < 15; k++) {
          col.push({
            ch: src.charAt(idx % src.length),
            a: 0.34 + rnd() * 0.30,
            dx: (rnd() - 0.5) * 1.4,
            dy: (rnd() - 0.5) * 1.4
          });
          idx++;
        }
        this.inkChars.push(col);
      }
    }

    /* ---------------- 单颗金球 ---------------- */
    _ball(ctx, x, y, r, tone, a) {
      ctx.save();
      ctx.globalAlpha = a;
      // 接触阴影（压在下层球上）
      ctx.fillStyle = 'rgba(56,36,9,0.24)';
      ctx.beginPath();
      ctx.ellipse(x + r * 0.05, y + r * 0.66, r * 0.92, r * 0.30, 0, 0, 6.28318);
      ctx.fill();
      // 球体：径向渐变（高光 #F2D79A → #C59B46 → #8A6320 → #5B3E12）
      const hi = tone < 0.25 ? '#E9C079' : tone > 0.78 ? '#FBE5B2' : '#F2D79A';
      const g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.44, r * 0.05, x, y, r * 1.02);
      g.addColorStop(0, hi);
      g.addColorStop(0.30, '#C59B46');
      g.addColorStop(0.72, '#8A6320');
      g.addColorStop(1, '#5B3E12');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.28318);
      ctx.fill();
      // 明暗差：让堆体有前后层次
      if (tone < 0.30) {
        ctx.globalAlpha = a * 0.13;
        ctx.fillStyle = 'rgba(46,28,4,1)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28318); ctx.fill();
      } else if (tone > 0.82) {
        ctx.globalAlpha = a * 0.08;
        ctx.fillStyle = 'rgba(255,238,196,1)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28318); ctx.fill();
      }
      // 底部环境反光（球与球之间的暖光）
      ctx.globalAlpha = a * 0.55;
      ctx.strokeStyle = 'rgba(255,216,150,0.30)';
      ctx.lineWidth = Math.max(1.1, r * 0.055);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.90, Math.PI * 0.20, Math.PI * 0.80);
      ctx.stroke();
      // 左上高光点
      ctx.globalAlpha = a * 0.95;
      ctx.fillStyle = 'rgba(255,250,230,0.92)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.40, y - r * 0.44, r * 0.17, r * 0.13, -0.7, 0, 6.28318);
      ctx.fill();
      ctx.globalAlpha = a * 0.28;
      ctx.beginPath();
      ctx.ellipse(x - r * 0.34, y - r * 0.38, r * 0.35, r * 0.29, -0.7, 0, 6.28318);
      ctx.fill();
      ctx.restore();
    }

    /* ---------------- 金色基床（保证覆盖率的整块金属） ---------------- */
    _bedTopY(x) {
      const u = (x - CX) / (W * 0.5);
      return 246 + 152 * u * u + Math.sin(x * 0.0075 + 1.2) * 14;
    }

    _bedPath(ctx) {
      ctx.beginPath();
      ctx.moveTo(-60, H + 60);
      for (let x = -60; x <= W + 60; x += 20) ctx.lineTo(x, this._bedTopY(x));
      ctx.lineTo(W + 60, H + 60);
      ctx.closePath();
    }

    _drawBed(ctx) {
      this._bedPath(ctx);
      const g = ctx.createLinearGradient(0, 240, 0, H);
      g.addColorStop(0, '#CFA45C');
      g.addColorStop(0.20, '#B0863B');
      g.addColorStop(0.55, '#87601F');
      g.addColorStop(1, '#3F2D0B');
      ctx.fillStyle = g;
      ctx.fill();

      ctx.save();
      this._bedPath(ctx);
      ctx.clip();
      // 堆积体上缘的暗带（球与球之间的缝隙阴影）
      ctx.strokeStyle = 'rgba(44,28,6,0.24)';
      ctx.lineWidth = 92;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let x = -60; x <= W + 60; x += 20) {
        const y = this._bedTopY(x);
        if (x === -60) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // 两侧与底部的沉暗
      const side = ctx.createLinearGradient(0, 0, W, 0);
      side.addColorStop(0, 'rgba(28,18,3,0.60)');
      side.addColorStop(0.17, 'rgba(28,18,3,0)');
      side.addColorStop(0.83, 'rgba(28,18,3,0)');
      side.addColorStop(1, 'rgba(28,18,3,0.60)');
      ctx.fillStyle = side;
      ctx.fillRect(0, 0, W, H);
      const bot = ctx.createLinearGradient(0, H - 320, 0, H);
      bot.addColorStop(0, 'rgba(24,15,2,0)');
      bot.addColorStop(1, 'rgba(24,15,2,0.66)');
      ctx.fillStyle = bot;
      ctx.fillRect(0, H - 320, W, 320);
      ctx.restore();
    }

    /* ---------------- 金球群（含挤压推移） ---------------- */
    _drawPile(ctx, L, t, sq) {
      this._drawBed(ctx);
      const zipped = Array.from(this.pinchSet);
      for (const b of this.balls) {
        const p = clamp((L - b.delay) / 0.95);
        if (p <= 0) continue;
        const e = Ease.outExpo(p);
        let x = lerp(b.sx, b.x, e);
        let y = lerp(b.sy, b.y, e);
        if (p < 1) y += Math.sin(p * Math.PI) * 9;
        // 挤压：信笺所在的横带里，球被顶到信笺两侧
        if (y > 236 && y < 756) {
          const half = LET.hw * (1 - 0.12 * sq) + b.r + 3;
          const dx = x - CX;
          if (Math.abs(dx) < half) x = CX + (dx < 0 ? -1 : 1) * half;
        }
        const mm = HUB.idleMicroMotion(t, b.ph);
        x += mm.dx * 0.5 * p;
        y += mm.dy * 0.4 * p;
        if (this.pinchSet.has(b)) continue;      // 压边球稍后画在信笺之上
        this._ball(ctx, x, y, b.r, b.tone, clamp(p * 3) * (0.74 + 0.26 * b.near));
      }
      return zipped;
    }

    /* ---------------- 信笺 ---------------- */
    _letterPath(ctx, hw, hh, sq) {
      const rnd = rng(7721);
      const jit = 2.4 + sq * 1.6;
      const N = 16;
      // 逆时针一圈：右（上→下）→ 下（右→左）→ 左（下→上）→ 上（左→右）
      const edge = (ax, ay, bx, by, wob) => {
        for (let i = 1; i <= N; i++) {
          const u = i / N;
          const x = lerp(ax, bx, u) + (rnd() - 0.5) * jit * 0.55;
          const y = lerp(ay, by, u) + (rnd() - 0.5) * jit * 0.55;
          const nx = -(by - ay), ny = (bx - ax);
          const nl = Math.hypot(nx, ny) || 1;
          ctx.lineTo(x + (nx / nl) * Math.sin(u * Math.PI * 3 + wob) * jit * 0.8,
                     y + (ny / nl) * Math.sin(u * Math.PI * 3 + wob) * jit * 0.8);
        }
      };
      ctx.beginPath();
      ctx.moveTo(hw + (rnd() - 0.5) * jit, -hh + (rnd() - 0.5) * jit);
      edge(hw, -hh, hw, hh, 0.4);
      edge(hw, hh, -hw, hh, 2.1);
      edge(-hw, hh, -hw, -hh, 4.0);
      edge(-hw, -hh, hw, -hh, 5.6);
      ctx.closePath();
    }

    _drawLetter(ctx, L, sq) {
      const hw = LET.hw * (1 - 0.12 * sq);          // 宽度收窄 12%
      const hh = LET.hh * (1 + 0.055 * sq);         // 高度略增
      const rot = -0.040 + Math.sin(L * 1.55) * 0.016 + sq * 0.058;
      const cx = CX + Math.sin(L * 1.1) * 2.5;
      const cy = LET.y + Math.sin(L * 1.35) * 3.5;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      // 投影
      ctx.shadowColor = 'rgba(52,34,10,0.50)';
      ctx.shadowBlur = 46;
      ctx.shadowOffsetY = 24;
      this._letterPath(ctx, hw, hh, sq);
      ctx.fillStyle = '#F4EAD5';
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 纸色渐变 + 内阴影
      const pg = ctx.createLinearGradient(-hw, -hh, hw, hh);
      pg.addColorStop(0, '#FCF7EA');
      pg.addColorStop(0.55, '#F3E9D3');
      pg.addColorStop(1, '#E1D2B2');
      ctx.fillStyle = pg;
      ctx.fill();

      ctx.save();
      this._letterPath(ctx, hw, hh, sq);
      ctx.clip();

      // 折痕
      ctx.strokeStyle = 'rgba(124,104,72,0.16)';
      ctx.lineWidth = 1.4;
      for (let i = 1; i <= 3; i++) {
        const yy = -hh + (hh * 2 / 4) * i;
        ctx.beginPath();
        ctx.moveTo(-hw, yy); ctx.lineTo(hw, yy);
        ctx.stroke();
      }
      // 5 列淡墨小楷
      const cellH = (hh * 1.70) / 15;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = DFS.font(15, 400, T.fonts.kai);
      ctx.fillStyle = 'rgba(52,36,16,1)';
      for (let k = 0; k < 5; k++) {
        const colX = 112 - k * 56;
        const col = this.inkChars[k];
        for (let i = 0; i < 15; i++) {
          const it = col[i];
          ctx.globalAlpha = it.a;
          ctx.fillText(it.ch, colX + it.dx, -hh * 0.85 + (i + 0.5) * cellH + it.dy);
        }
      }
      ctx.globalAlpha = 1;
      // 两侧被金球压出的暗部
      const band = 30 + 22 * sq;
      const lp = ctx.createLinearGradient(-hw, 0, -hw + band, 0);
      lp.addColorStop(0, `rgba(96,64,22,${0.30 + 0.14 * sq})`);
      lp.addColorStop(1, 'rgba(96,64,22,0)');
      ctx.fillStyle = lp;
      ctx.fillRect(-hw, -hh, band, hh * 2);
      const rp = ctx.createLinearGradient(hw, 0, hw - band, 0);
      rp.addColorStop(0, `rgba(96,64,22,${0.30 + 0.14 * sq})`);
      rp.addColorStop(1, 'rgba(96,64,22,0)');
      ctx.fillStyle = rp;
      ctx.fillRect(hw - band, -hh, band, hh * 2);
      // 中部的鼓胀受光（被挤反而顶起来）
      const boost = ctx.createRadialGradient(-hw * 0.1, -hh * 0.15, 10, 0, 0, hh * 1.1);
      boost.addColorStop(0, `rgba(255,252,240,${0.20 * sq})`);
      boost.addColorStop(1, 'rgba(255,252,240,0)');
      ctx.fillStyle = boost;
      ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
      ctx.restore();

      // 起毛的边
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = 'rgba(252,246,232,0.75)';
      ctx.lineWidth = 1.6;
      this._letterPath(ctx, hw, hh, sq);
      ctx.stroke();
      ctx.restore();
    }

    /* ---------------- 压在信笺上的边缘球 ---------------- */
    _drawPinch(ctx, L, t, sq) {
      for (const b of this.pinch) {
        const p = clamp((L - b.delay) / 0.95);
        if (p <= 0) continue;
        const e = Ease.outExpo(p);
        let x = lerp(b.sx, b.x, e);
        let y = lerp(b.sy, b.y, e);
        if (y > 236 && y < 756) {
          const half = LET.hw * (1 - 0.12 * sq) + b.r + 3;
          const dx = x - CX;
          if (Math.abs(dx) < half) x = CX + (dx < 0 ? -1 : 1) * half;
        }
        const mm = HUB.idleMicroMotion(t, b.ph);
        x += mm.dx * 0.5 * p;
        y += mm.dy * 0.4 * p;
        this._ball(ctx, x, y, b.r, b.tone, clamp(p * 3) * (0.74 + 0.26 * b.near));
      }
    }

    /* ---------------- 万金计数器 ---------------- */
    _counter(ctx, L, t) {
      const value = Math.round(1 + 9999 * Ease.outExpo(clamp((L - 0.15) / 3.2)));
      DFS.dbg({ counters: { wanjin: value } });
      const txt = DFS.km(value);
      const e = HUB.multiEntrance(L, 0.12, { duration: 0.65, rise: 28, scaleFrom: 0.94 });
      const mm = HUB.idleMicroMotion(t, 1.4);

      const x = 120, yNum = 112;
      ctx.save();
      ctx.globalAlpha = e.alpha;
      const dy = e.dy + mm.dy * 0.6;
      // 标签
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = DFS.font(28, 500, T.fonts.serif);
      ctx.fillStyle = 'rgba(34,26,12,0.72)';
      ctx.fillText('家 书 · 万 金', x, 52 + dy);
      // 数字
      ctx.save();
      ctx.translate(0, dy);
      const wNum = HUB.monoNums(ctx, txt, x, yNum, 72, {
        color: 'rgba(26,19,9,0.94)', weight: 700, align: 'left', tracking: 72 * 0.06
      });
      ctx.font = DFS.font(26, 400, T.fonts.serif);
      ctx.fillStyle = 'rgba(34,26,12,0.55)';
      ctx.textAlign = 'left';
      ctx.fillText('金', x + wNum + 14, yNum + 2);
      ctx.restore();
      // 细刻线
      ctx.globalAlpha = e.alpha * 0.55;
      ctx.strokeStyle = 'rgba(168,43,27,0.9)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, 158 + dy);
      ctx.lineTo(x + 300, 158 + dy);
      ctx.stroke();
      ctx.restore();

      DFS.dbgBox('wanjin-counter', 104, 30, 470, 178);
      return { value, txt };
    }

    /* ---------------- 主绘制 ---------------- */
    draw(ctx, L, t) {
      DFS.dbg({ goldBalls: N_BALLS });
      const sq = Ease.inOutCubic(clamp((L - 0.55) / 3.05));   // 挤压进度
      const dim = clamp((L - 4.1) / 0.5) * 0.4;               // 37.2s 后压暗 40%

      HUB.fiveLayerStack(ctx, t, {
        dark: false,
        grade: 'warm',
        grain: 0.40,
        vignette: 0.26,
        vignetteMid: 0.04,
        layer1: (c) => {
          DFS.drawPaper(c, { zoom: 1.02 + L * 0.004 });
          // 大片暖光，压在纸面右下，为金球留出反光环境
          const g = c.createRadialGradient(W * 0.5, H * 0.94, 80, W * 0.5, H * 0.94, H * 0.95);
          g.addColorStop(0, 'rgba(214,166,86,0.30)');
          g.addColorStop(0.55, 'rgba(198,150,72,0.10)');
          g.addColorStop(1, 'rgba(198,150,72,0)');
          c.fillStyle = g;
          c.fillRect(0, 0, W, H);
          DFS.drawGradientMesh(c, t, {
            c1: 'rgba(255,248,226,0.50)', c2: 'rgba(122,92,44,0.20)'
          });
        },
        layer2: (c) => {
          this._drawPile(c, L, t, sq);
          this._drawLetter(c, L, sq);
          this._drawPinch(c, L, t, sq);
          // 金屑
          c.save();
          c.globalCompositeOperation = 'lighter';
          for (const d of this.dust) {
            const a = d.a * (0.4 + 0.6 * Math.sin(t * d.sp + d.ph) ** 2) * clamp((L - 0.5) / 1.2);
            if (a <= 0.01) continue;
            c.globalAlpha = a;
            c.fillStyle = 'rgba(244,214,150,1)';
            c.beginPath();
            c.arc(d.x + Math.sin(t * 0.4 + d.ph) * 14, d.y - L * 6, d.rad, 0, 6.28318);
            c.fill();
          }
          c.restore();
        },
        layer3: (c) => {
          this._counter(c, L, t);
          // 小朱印「万金」
          const sp = clamp((L - 0.5) / 0.9);
          if (sp > 0.001) {
            HUB.inkStampSplash(c, 508, 108, sp, 23, {
              size: 84, text: '万金', chars: 'multi', rotate: -0.05
            });
          }
          this._poem(c, L, t);
        }
      });

      if (dim > 0.001) {
        ctx.save();
        ctx.globalAlpha = dim;
        ctx.fillStyle = '#0B0906';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    /* ---------------- 「烽火连三月 / 家书抵万金」 ---------------- */
    _poem(ctx, L, t) {
      const lines = [
        { text: '烽火连三月', y: 906, start: 1.80 },
        { text: '家书抵万金', y: 982, start: 1.98 }
      ];
      const inA = clamp((L - 1.72) / 0.55);
      if (inA <= 0.002) return;
      const exit = HUB.fastExit(L, 4.02, { duration: 0.34, rise: 10, blur: 4 });
      const mm = HUB.idleMicroMotion(t, 2.2);
      const size = 66, tracking = 14, weight = 500;
      ctx.save();
      ctx.globalAlpha *= exit.alpha;
      // 纸色羽化衬底（黑字绝不压在暗金缝里）——椭圆内渐变，边缘不留硬边
      ctx.save();
      ctx.translate(CX, 946);
      ctx.scale(1, 0.26);
      const haze = ctx.createRadialGradient(0, 0, 40, 0, 0, 660);
      haze.addColorStop(0, 'rgba(242,233,214,0.88)');
      haze.addColorStop(0.55, 'rgba(240,230,208,0.50)');
      haze.addColorStop(1, 'rgba(238,228,206,0)');
      ctx.fillStyle = haze;
      ctx.beginPath();
      ctx.arc(0, 0, 660, 0, 6.28318);
      ctx.fill();
      ctx.restore();

      for (const ln of lines) {
        const e = HUB.multiEntrance(L, ln.start - 0.06, { duration: 0.6, rise: 30, scaleFrom: 0.94 });
        if (e.alpha <= 0.002) continue;
        ctx.save();
        ctx.globalAlpha = exit.alpha * e.alpha;
        ctx.translate(mm.dx * 0.4, e.dy + mm.dy * 0.5);
        DFS.textIn(ctx, ln.text, {
          x: CX, y: ln.y, size, weight, family: T.fonts.serif,
          color: 'rgba(22,15,6,0.95)', align: 'center', tracking,
          t: L, start: ln.start, dur: 0.58, stagger: 0.055, rise: 24, from: 0.94, blur: 4
        });
        ctx.restore();
        // 包围盒
        ctx.font = DFS.font(size, weight, T.fonts.serif);
        const chars = Array.from(ln.text);
        let tw = 0;
        for (const ch of chars) tw += ctx.measureText(ch).width;
        tw += tracking * (chars.length - 1);
        DFS.dbgBox(ln.text === '烽火连三月' ? 'jiashu1' : 'jiashu2',
          CX - tw / 2, ln.y - size * 0.52, CX + tw / 2, ln.y + size * 0.52);
      }
      ctx.restore();
    }

    hudDark() { return false; }
  };
})(window.DFS);
