/* =========================================================================
   app.js — 主时间轴 / 帧函数 / 交叉溶解 / HUD 合成
   心智模型：整片是帧号的纯函数 f(t)，无挂钟时间、无 Math.random。
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, FPS, clamp, smoothstep } = DFS;

  DFS.sceneRegistry = DFS.sceneRegistry || {};

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d', { alpha: false });
  const sceneBuf = document.createElement('canvas');
  sceneBuf.width = W; sceneBuf.height = H;
  const sctx = sceneBuf.getContext('2d', { alpha: false });
  const loading = document.getElementById('loading');
  const hint = document.getElementById('hint');

  let STORY = null, HUD = null, chapters = [];

  /* ---------- 场景装配 ---------- */
  function build() {
    chapters = STORY.chapters.map((ch) => {
      const S = DFS.sceneRegistry[ch.scene];
      if (!S) console.warn('missing scene', ch.scene);
      return {
        ch,
        scene: S ? new S() : null,
        fadeIn: ch.fadeIn ?? 0,
        fadeOut: ch.fadeOut ?? 0
      };
    });
    HUD = new DFS.Hud(STORY.hud);
  }

  /* ---------- 调试状态（QA 探针读取） ---------- */
  function resetDebug() {
    window.DEBUG_STATE = {
      textBoxes: [], counters: {}, hud: null, typeField: 0, gullParticles: 0,
      goldBalls: 0, stamp: null, cards: [], camera: null
    };
  }
  DFS.dbg = function (o) { Object.assign(window.DEBUG_STATE, o); };
  DFS.dbgBox = function (id, x1, y1, x2, y2, extra) {
    (window.DEBUG_STATE.textBoxes || (window.DEBUG_STATE.textBoxes = []))
      .push(Object.assign({ id, x1, y1, x2, y2 }, extra || {}));
  };
  window.DEBUG_STATE = { textBoxes: [], counters: {}, hud: null, typeField: 0, gullParticles: 0 };

  /* ---------- 主绘制 ---------- */
  function render(t) {
    t = clamp(t, 0, STORY.duration);
    const frame = Math.round(t * FPS);
    resetDebug();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.fillStyle = '#070703';
    ctx.fillRect(0, 0, W, H);

    let hudDark = false;

    for (const c of chapters) {
      const s = c.ch.start, e = c.ch.end;
      if (t < s || t > e) continue;
      let w = 1;
      if (c.fadeIn > 0) w *= smoothstep(s, s + c.fadeIn, t);
      if (c.fadeOut > 0) w *= 1 - smoothstep(e - c.fadeOut, e, t);
      if (w <= 0.002) continue;
      const local = t - s;
      // 场景先画到离屏缓冲，再整体合成——隔离场景内部的 globalAlpha / filter / transform
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.globalAlpha = 1;
      sctx.globalCompositeOperation = 'source-over';
      sctx.filter = 'none';
      sctx.clearRect(0, 0, W, H);
      try {
        c.scene && c.scene.draw(sctx, local, t, c.ch);
      } catch (err) {
        console.error('scene error', c.ch.id, err);
      }
      ctx.save();
      ctx.globalAlpha = w;
      ctx.drawImage(sceneBuf, 0, 0);
      ctx.restore();
      if (c.scene && c.scene.hudDark) hudDark = !!c.scene.hudDark(local, t);
    }

    // 第五层：全局颗粒 + 暗角（覆盖画面，但不覆盖 HUD）
    DFS.drawGrainVignette(ctx, frame, { grain: 0.40, vig: 0.12, vigMid: 0.02 });

    // HUD（始终在最顶，独立淡入淡出）
    if (HUD) {
      ctx.save();
      HUD.draw(ctx, t, { dark: hudDark });
      ctx.restore();
    }

    if (DFS.DEBUG) {
      ctx.save();
      ctx.font = '16px "Courier New", monospace';
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillText(`t=${t.toFixed(2)}s  f=${frame}`, 16, H - 16);
      ctx.restore();
    }
  }

  /* ---------- 对外接口 ---------- */
  window.FPS = FPS;
  window.DURATION = 0;
  window.seek = function (timeSeconds) { render(timeSeconds); };
  window.renderFrame = function (frameIndex) { render(frameIndex / FPS); };

  DFS.DEBUG = /[?&]debug=1/.test(location.search);
  if (DFS.DEBUG && hint) hint.textContent = 'SPACE 播放/暂停 · ← → 逐帧 · ' + location.search;

  /* ---------- 启动 ---------- */
  async function boot() {
    try {
      await document.fonts.ready;
      const STORY_URL = window.STORY_URL || 'storyboard.v3.json';
      const res = await fetch(STORY_URL, { cache: 'no-store' });
      STORY = await res.json();
      DFS.STORY = STORY;
      window.DURATION = STORY.duration;
      build();
      // 预生成宣纸纹理（一次性），避免首帧卡顿
      DFS.getPaper();
      DFS.getGrain();
      render(0);
      loading.style.opacity = '0';
      setTimeout(() => loading.remove(), 450);
      window.READY = true;

      // 预览播放器（仅调试用；渲染走 seek）
      const params = new URLSearchParams(location.search);
      if (params.has('t')) {
        render(parseFloat(params.get('t')));
      } else if (!/[?&]render=1/.test(location.search)) {
        let playing = true, clock = 0, last = performance.now();
        const loop = (now) => {
          const dt = (now - last) / 1000; last = now;
          if (playing) {
            clock += dt;
            if (clock > STORY.duration) clock = 0;
            render(clock);
          }
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        window.addEventListener('keydown', (e) => {
          if (e.code === 'Space') { playing = !playing; e.preventDefault(); }
          if (e.code === 'ArrowRight') { clock = Math.min(STORY.duration, clock + 1 / FPS); render(clock); }
          if (e.code === 'ArrowLeft') { clock = Math.max(0, clock - 1 / FPS); render(clock); }
        });
        window.__getClock = () => clock;
      } else {
        render(0);
      }
    } catch (err) {
      loading.textContent = 'BOOT ERROR: ' + err.message;
      console.error(err);
    }
  }
  boot();

})(window.DFS);
