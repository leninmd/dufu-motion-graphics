/* =========================================================================
   hud.js — 右上角「贬谪时空坐标 + 累计里程」状态栏
   参考片装置：地点 · 中文纪年 · 事件 / 累计公里数（数字滚动）
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, clamp, lerp, Ease } = DFS;
  const T = DFS.THEME;

  DFS.Hud = class Hud {
    constructor(cues) {
      this.cues = cues.slice().sort((a, b) => a.t - b.t);
      this.x = W - 82;
      this.y1 = 86;
      this.y2 = 130;
      this.size1 = 27;
      this.size2 = 24;
      this.state = { alpha: 0 };
    }

    _cueAt(t) {
      let cur = null, prev = null;
      for (const c of this.cues) {
        if (c.t <= t) { prev = cur; cur = c; } else break;
      }
      return { cur, prev };
    }

    draw(ctx, t, opts = {}) {
      const { cur, prev } = this._cueAt(t);
      if (!cur) return;
      const hide = cur.hide === true;
      const targetAlpha = hide ? 0 : 1;
      // 淡入淡出（快出慢入）
      const since = t - cur.t;
      let a;
      if (hide) a = clamp(1 - since / 0.22);
      else a = clamp((since) / 0.45);
      a = Ease.outCubic(a) * targetAlpha;
      if (a <= 0.002) return;

      const slide = (1 - Ease.outExpo(clamp(since / 0.55))) * 18;
      const kmFrom = prev ? prev.km : cur.km;
      const kp = Ease.inOutCubic(clamp((since - 0.10) / 1.6));
      const km = lerp(kmFrom, cur.km, kp);

      const line1 = `${cur.place} · ${cur.year} · ${cur.event}`;
      const line2 = `${DFS.km(km)} km`;
      const col = opts.dark ? T.colors.hudDark : T.colors.hudLight;

      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';

      // 地点行（宋体，中字距）
      ctx.font = DFS.font(this.size1, 400, T.fonts.serif);
      ctx.fillStyle = col;
      this._spaced(ctx, line1, this.x + slide, this.y1, this.size1 * 0.14);

      // 里程行（等宽数字，细字距）
      ctx.font = DFS.font(this.size2, 400, T.fonts.mono);
      ctx.fillStyle = col;
      this._spaced(ctx, line2, this.x + slide * 0.6, this.y2, this.size2 * 0.10, 0.9);

      // 极细的状态刻线（参考片中隐约存在的细节）
      ctx.globalAlpha = a * 0.28;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x + slide - 6, this.y2 + 10);
      ctx.lineTo(this.x + slide - 6 - 34, this.y2 + 10);
      ctx.stroke();
      ctx.restore();
    }

    _spaced(ctx, text, right, y, tracking, alphaMul = 1) {
      const chars = Array.from(text);
      let total = 0;
      const ws = chars.map((c) => { const w = ctx.measureText(c).width; total += w; return w; });
      total += tracking * (chars.length - 1);
      // 从右往左排（以右边缘对齐）
      let cx = right - total;
      const base = ctx.globalAlpha;
      const prevAlign = ctx.textAlign;
      ctx.textAlign = 'left';
      chars.forEach((c, i) => {
        ctx.globalAlpha = base * alphaMul;
        ctx.fillText(c, cx, y);
        cx += ws[i] + tracking;
      });
      ctx.textAlign = prevAlign;
      ctx.globalAlpha = base;
    }
  };

})(window.DFS);
