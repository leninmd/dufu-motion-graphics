/* =========================================================================
   s02_typeworld.js — 4.4–13.6s  盛唐抱负 → 安史惊雷
   4.4–7.8  俯视活字版面缓推；「会当凌绝顶」「致君尧舜上」朱砂 3D 字块 spring 升起
   7.8–9.5  巨型斜印「落第」砸在望岳那排之上 + 震屏 + 两行灰色批注
   9.5–13.6 焦黑压顶；血红「乱」印；描边「七五五」；「国破山河在」逐字 + 朱圈
   ========================================================================= */
(function (DFS) {
  'use strict';
  const { W, H, clamp, lerp, Ease } = DFS;
  const T = DFS.THEME;
  const HUB = DFS.HUB;

  const POEM_TEXT =
    '国破山河在城春草木深感时花溅泪恨别鸟惊心烽火连三月家书抵万金白头搔更短浑欲不胜簪' +
    '会当凌绝顶一览众山小致君尧舜上再使风俗淳朱门酒肉臭路有冻死骨无边落木萧萧下不尽长江滚滚来' +
    '万里悲秋常作客百年多病独登台';

  const ROW1 = Array.from('会当凌绝顶');
  const ROW2 = Array.from('致君尧舜上');
  const GUOPO = Array.from('国破山河在');
  const ROW1_Y = 430, ROW1_SIZE = 132, ROW1_GAP = 22;
  const ROW2_Y = 650, ROW2_SIZE = 116, ROW2_GAP = 20;
  const GUOPO_Y = 600, GUOPO_SIZE = 112, GUOPO_STEP = 122;
  const STAMP_X = 1400, STAMP_Y = 310, STAMP_SIZE = 260;

  const rowWidth = (chars, size, gap) => chars.length * size + (chars.length - 1) * gap;

  DFS.sceneRegistry['s02'] = class Scene02 {
    constructor() {
      this.field = new DFS.TypeField({
        seed: 16350, rows: 40, cols: 40, spacing: 0.86,
        blockW: 0.74, blockH: 0.56, gap: 0, text: POEM_TEXT
      });
      this.cam = new DFS.Camera({ pos: { x: 0, y: 5.0, z: 9.0 }, yaw: 0, pitch: -0.88 });
      this.zFar = ((this.field.rows - 1) / 2) * this.field.spacing;
      this._stampCv = null;
    }

    /* 远端渐隐：按屏幕纵坐标把最远几排化掉，消除版面被"切断"的硬边 */
    _horizonY() {
      const p = this.cam.project({ x: 0, y: 0, z: this.zFar });
      return p ? p.y : null;
    }

    /* ---------- 印面烘焙（p=1） ---------- */
    _stampCanvas() {
      if (this._stampCv) return this._stampCv;
      const S = 480;
      const cv = DFS.mkCanvas(S, S);
      const c = cv.getContext('2d');
      c.translate(S / 2, S / 2);
      HUB.inkStampSplash(c, 0, 0, 1, 3301, {
        size: STAMP_SIZE, text: '落第', chars: 'v', rotate: -0.22
      });
      this._stampCv = cv;
      return cv;
    }

    /* ---------- 活字版面（自绘：修正 TypeField.drawFlat 的字形纵向镜像） ---------- */
    _flat(ctx, cam, t, o) {
      const items = this.field.items;
      const hw = this.field.blockW * 0.46;
      const hd = this.field.spacing * 0.44;
      const lift = o.lift || 0;
      const fogNear = o.fogNear ?? 2, fogFar = o.fogFar ?? 13;
      const alphaMul = o.alphaMul ?? 1;
      const ink = o.ink || '24,18,10';
      const inkA = o.inkA ?? 0.82;
      const plateA = o.plateA ?? 0.055;
      const list = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const y = lift * (0.2 + it.phase * 0.5);
        const p0 = cam.project({ x: it.x - hw, y, z: it.z - hd });
        if (!p0) continue;
        const p1 = cam.project({ x: it.x + hw, y, z: it.z - hd });
        const p2 = cam.project({ x: it.x + hw, y, z: it.z + hd });
        const p3 = cam.project({ x: it.x - hw, y, z: it.z + hd });
        if (!p1 || !p2 || !p3) continue;
        const z = (p0.z + p2.z) * 0.5;
        if (z > fogFar + 8) continue;
        const minX = Math.min(p0.x, p3.x), maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p0.y, p1.y), maxY = Math.max(p2.y, p3.y);
        if (maxX < -90 || minX > W + 90 || maxY < -90 || minY > H + 90) continue;
        list.push({ it, p0, p1, p3, z });
      }
      list.sort((a, b) => b.z - a.z);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let k = 0; k < list.length; k++) {
        const it = list[k].it, p0 = list[k].p0, p1 = list[k].p1, p3 = list[k].p3, z = list[k].z;
        const fog = clamp((z - fogNear) / (fogFar - fogNear));
        let a = Math.pow(1 - fog, 1.5) * alphaMul;
        if (o.topFade != null) a *= clamp((p3.y - o.topFade) / (o.topFadeSpan || 220));
        if (a < 0.02) continue;
        const ux = p1.x - p0.x, uy = p1.y - p0.y;
        const vx = p0.x - p3.x, vy = p0.y - p3.y;
        if (Math.hypot(ux, uy) < 2.4) continue;
        ctx.save();
        ctx.setTransform(ux, uy, vx, vy, p3.x, p3.y);
        ctx.globalAlpha = a * plateA;
        ctx.fillStyle = 'rgba(' + ink + ',1)';
        ctx.fillRect(0, 0, 1, 1);
        ctx.globalAlpha = a * inkA;
        ctx.translate(0.5, 0.5);
        ctx.rotate(it.rot);
        ctx.font = DFS.font(0.62 + it.phase * 0.12, 500, T.fonts.serif);
        ctx.fillText(it.ch, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }

    /* ---------- 一排朱砂立体字块：spring 错落升起 + 阴影 + settle 抖动 ---------- */
    _row(ctx, chars, cy, size, gap, startL, seed, L, outA, fall) {
      const total = rowWidth(chars, size, gap);
      const x0 = W / 2 - total / 2;
      for (let i = 0; i < chars.length; i++) {
        const st = startL + HUB.stagger(i, { frames: 5 });
        if (L <= st) continue;
        const e = clamp((L - st) / 1.05);
        const sp = HUB.springPhysics(e, { stiffness: 190, damping: 13, mass: 1, duration: 1.0 });
        const ent = HUB.multiEntrance(L, st, { duration: 0.50, rise: 0, scaleFrom: 0.90 });
        const x = x0 + i * (size + gap) + size / 2;
        const settle = Math.sin(e * 34 + i * 1.9) * 2.0 * Math.max(0, 1 - e * 1.4);
        const y = cy + (1 - sp) * 210 + settle + fall;
        const rot = (1 - sp) * (i % 2 ? 0.11 : -0.09) + 0.012 * Math.sin(i * 2.1 + seed);
        const a = clamp(ent.alpha) * outA;
        if (a < 0.01) continue;

        // 落地阴影（越接近落位越实）
        const sh = clamp(1 - (y - cy) / 210);
        if (sh > 0.02) {
          const sx = x + size * 0.10, sy = cy + size * 0.60;
          const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, size * 0.80);
          g.addColorStop(0, 'rgba(34,20,8,' + (0.34 * sh * outA).toFixed(3) + ')');
          g.addColorStop(0.55, 'rgba(34,20,8,' + (0.13 * sh * outA).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(34,20,8,0)');
          ctx.save();
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(sx, sy, size * 0.72, size * 0.26, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        DFS.redTile(ctx, {
          x, y, size, ch: chars[i], rot, alpha: a,
          scale: 0.88 + 0.12 * sp, seed: seed + i * 3, depth: 0.15
        });
      }
    }

    draw(ctx, L, t) {
      const frame = Math.round(L * DFS.FPS);

      /* ---------- 时间线 ---------- */
      const darkP = HUB.ease.inOutCubic(clamp((L - 5.10) / 0.92));
      const stampP = clamp((L - 3.40) / 0.45);
      const impactF = Math.round((3.40 + 0.45 * 0.35) * DFS.FPS);
      const shake = (frame >= impactF)
        ? HUB.cameraShake(frame, { amp: 14, decay: 7.5, startFrame: impactF, seed: 9 })
        : { x: 0, y: 0, rot: 0 };
      const rowOutA = HUB.fastExit(L, 4.86, { duration: 0.34, rise: -70 }).alpha;
      const rowFall = (1 - rowOutA) * 60;

      /* ---------- 摄像机：俯视缓推 → 暗场微降 ---------- */
      const push = HUB.ease.inOutCubic(clamp(L / 3.6));
      const sinkG = clamp((L - 5.10) / 4.20);
      const sink = -2.7 * sinkG * sinkG;
      const shk = Math.max(Math.abs(shake.x), Math.abs(shake.y)) > 0.2;
      this.cam.pos = {
        x: 0.10 * Math.sin(L * 0.30) + (shk ? shake.x / 165 : 0),
        y: lerp(5.0, 4.3, push) - darkP * 0.30 - (shk ? shake.y / 165 : 0),
        z: lerp(9.0, 7.2, push)
      };
      this.cam.pitch = lerp(-0.88, -0.80, push);
      this.cam.yaw = 0.010 * Math.sin(L * 0.35);

      DFS.dbg({ typeField: this.field.items.length });

      /* ---------- 活字地面：暗场里由墨色转为纸色浮雕 ---------- */
      const fieldA = 1 - clamp((L - 5.30) / 6.6) * 0.72;
      const ink = Math.round(lerp(24, 226, darkP)) + ',' +
        Math.round(lerp(18, 216, darkP)) + ',' +
        Math.round(lerp(10, 196, darkP));
      const inkA = lerp(0.80, 0.52, darkP);

      ctx.save();
      HUB.applyCameraShake(ctx, shake);

      HUB.fiveLayerStack(ctx, t, {
        dark: darkP > 0.5,
        grade: darkP > 0.5 ? 'cold' : 'warm',
        grain: 0.24,
        vignette: 0.16,
        vignetteMid: 0.02,
        /* ---- L1：宣纸 → 焦黑 ---- */
        layer1: (c) => {
          c.drawImage(DFS.getPaper(), -W * 0.03, -H * 0.03, W * 1.06, H * 1.06);
          if (darkP < 0.999) {
            DFS.drawGradientMesh(c, t, {
              c1: 'rgba(255,250,232,0.50)', c2: 'rgba(120,104,78,0.14)',
              a1: 1 - darkP, a2: 1 - darkP
            });
          }
          if (darkP > 0.001) {
            c.save();
            c.globalAlpha = darkP;
            DFS.drawNight(c, { inner: '#2A2925', mid: '#1C1B18', outer: '#141413' });
            c.restore();
            const og = c.createLinearGradient(0, 0, 0, H);
            og.addColorStop(0, 'rgba(20,20,19,' + (0.20 * darkP).toFixed(3) + ')');
            og.addColorStop(0.55, 'rgba(14,14,13,' + (0.44 * darkP).toFixed(3) + ')');
            og.addColorStop(1, 'rgba(6,6,6,' + (0.82 * darkP).toFixed(3) + ')');
            c.fillStyle = og;
            c.fillRect(0, 0, W, H);
          }
        },
        /* ---- L2：活字版面（俯视推进 → 重力下沉） ---- */
        layer2: (c) => {
          if (fieldA > 0.01) {
            this._flat(c, this.cam, t, {
              alphaMul: fieldA, fogNear: 1.8, fogFar: 13.0,
              lift: sink, ink: ink, inkA: inkA, plateA: lerp(0.05, 0.035, darkP),
              topFade: this._horizonY(), topFadeSpan: 230
            });
          }
        },
        /* ---- L3：字块 / 印 / 年 / 诗 ---- */
        layer3: (c) => {
          /* 1) 两排朱砂字块 */
          if (L > 0.10 && rowOutA > 0.01) {
            this._row(c, ROW1, ROW1_Y, ROW1_SIZE, ROW1_GAP, 0.15, 11, L, rowOutA, rowFall);
            this._row(c, ROW2, ROW2_Y, ROW2_SIZE, ROW2_GAP, 1.90, 41, L, rowOutA, rowFall * 1.2);
          }
          if (L > 0.10 && rowOutA > 0.02) {
            const w1 = rowWidth(ROW1, ROW1_SIZE, ROW1_GAP), w2 = rowWidth(ROW2, ROW2_SIZE, ROW2_GAP);
            DFS.dbgBox('poem1', W / 2 - w1 / 2, ROW1_Y - ROW1_SIZE / 2, W / 2 + w1 / 2, ROW1_Y + ROW1_SIZE / 2);
            DFS.dbgBox('poem2', W / 2 - w2 / 2, ROW2_Y - ROW2_SIZE / 2, W / 2 + w2 / 2, ROW2_Y + ROW2_SIZE / 2);
          }

          /* 2) 巨型斜印「落第」：3.40 起 0.45s 砸满 */
          if (L > 3.40) {
            // 印下的压痕阴影，让巨印"砸进"版面而不是浮着
            if (stampP > 0.20) {
              const sa = clamp((stampP - 0.20) / 0.45);
              const g = c.createRadialGradient(STAMP_X + 14, STAMP_Y + 86, 10, STAMP_X + 14, STAMP_Y + 86, 268);
              g.addColorStop(0, 'rgba(30,16,6,' + (0.30 * sa).toFixed(3) + ')');
              g.addColorStop(0.6, 'rgba(30,16,6,' + (0.10 * sa).toFixed(3) + ')');
              g.addColorStop(1, 'rgba(30,16,6,0)');
              c.fillStyle = g;
              c.fillRect(STAMP_X - 290, STAMP_Y - 200, 590, 590);
            }
            if (stampP < 1) {
              HUB.inkStampSplash(c, STAMP_X, STAMP_Y, stampP, 3301, {
                size: STAMP_SIZE, text: '落第', chars: 'v', rotate: -0.22
              });
              DFS.dbgBox('luodi', STAMP_X - 156, STAMP_Y - 156, STAMP_X + 156, STAMP_Y + 156);
            } else {
              const ex = HUB.fastExit(L, 4.80, { duration: 0.52 });
              if (ex.alpha > 0.01) {
                const cv = this._stampCanvas();
                c.save();
                c.globalAlpha = ex.alpha * 0.97;
                c.drawImage(cv, STAMP_X - cv.width / 2, STAMP_Y - cv.height / 2);
                c.restore();
                DFS.dbgBox('luodi', STAMP_X - 156, STAMP_Y - 156, STAMP_X + 156, STAMP_Y + 156);
              }
            }
          }

          /* 3) 两行灰色批注（右上，纸色空档里） */
          if (L > 3.58) {
            const na = HUB.ease.outCubic(clamp((L - 3.58) / 0.55)) * (1 - clamp((L - 4.86) / 0.4));
            if (na > 0.01) {
              c.save();
              c.textAlign = 'right';
              c.textBaseline = 'middle';
              c.font = DFS.font(22, 400, T.fonts.kai);
              c.fillStyle = 'rgba(76,68,54,' + (0.56 * na).toFixed(3) + ')';
              const n1 = '困坐长安十年', n2 = '奉赠韦左丞丈';
              c.globalAlpha = na;
              c.fillText(n1, 1806, 176);
              c.fillStyle = 'rgba(76,68,54,' + (0.44 * na).toFixed(3) + ')';
              c.fillText(n2, 1806, 208);
              c.restore();
              DFS.dbgBox('note1', 1806 - n1.length * 22, 164, 1806, 188);
              DFS.dbgBox('note2', 1806 - n2.length * 22, 196, 1806, 220);
            }
          }

          /* 4) 血红方印「乱」 */
          if (L > 5.30) {
            const sp = HUB.springPhysics(clamp((L - 5.30) / 0.9), { stiffness: 170, damping: 12, mass: 1, duration: 1 });
            const a = clamp(sp * 1.5) * (0.15 + 0.85 * clamp((L - 5.28) / 0.5));
            c.save();
            const g = c.createRadialGradient(W / 2, 172, 10, W / 2, 172, 240);
            g.addColorStop(0, 'rgba(217,56,30,' + (0.22 * a).toFixed(3) + ')');
            g.addColorStop(1, 'rgba(217,56,30,0)');
            c.fillStyle = g;
            c.fillRect(W / 2 - 240, -68, 480, 480);
            c.restore();
            DFS.redTile(c, {
              x: W / 2, y: lerp(112, 172, sp), size: 108, ch: '乱',
              rot: (1 - sp) * 0.30, alpha: a, scale: 0.82 + 0.18 * sp, seed: 21, depth: 0.18
            });
            DFS.dbgBox('luan', W / 2 - 54, 172 - 54, W / 2 + 54, 172 + 54);
          }

          /* 5) 描边「七五五」+ 注释（11.95 起快速退场） */
          if (L > 5.34) {
            const ent = HUB.multiEntrance(L, 5.34, { duration: 0.9, rise: 26, scaleFrom: 0.96 });
            const ex = HUB.fastExit(L, 7.55, { duration: 0.42, rise: 70 });
            const a = ent.alpha * ex.alpha;
            const yBase = 470 - (1 - ent.p) * 26 - (1 - ex.alpha) * 70;
            if (a > 0.01) {
              // 背景压暗衬底：让细线年在活字地面上可读
              const bg = HUB.ease.outCubic(clamp((L - 5.30) / 0.8)) * darkP;
              if (bg > 0.01) {
                c.save();
                c.translate(W / 2, 545);
                c.scale(1, 0.52);
                let g = c.createRadialGradient(0, 0, 40, 0, 0, 660);
                g.addColorStop(0, 'rgba(9,9,8,' + (0.86 * bg).toFixed(3) + ')');
                g.addColorStop(0.55, 'rgba(9,9,8,' + (0.58 * bg).toFixed(3) + ')');
                g.addColorStop(1, 'rgba(9,9,8,0)');
                c.fillStyle = g;
                c.fillRect(-660, -660, 1320, 1320);
                c.restore();
                // 小字条带
                c.save();
                c.translate(W / 2, 700);
                c.scale(1, 0.16);
                g = c.createRadialGradient(0, 0, 40, 0, 0, 620);
                g.addColorStop(0, 'rgba(9,9,8,' + (0.80 * bg).toFixed(3) + ')');
                g.addColorStop(0.6, 'rgba(9,9,8,' + (0.45 * bg).toFixed(3) + ')');
                g.addColorStop(1, 'rgba(9,9,8,0)');
                c.fillStyle = g;
                c.fillRect(-620, -620, 1240, 1240);
                c.restore();
              }
              DFS.outlineText(c, '七五五', {
                x: W / 2, y: yBase, size: 330, weight: 300, family: T.fonts.serif,
                color: 'rgba(240,232,212,0.10)', lw: 11, tracking: 20,
                alpha: a, scale: 1 + (1 - ent.p) * 0.04
              });
              DFS.outlineText(c, '七五五', {
                x: W / 2, y: yBase, size: 330, weight: 300, family: T.fonts.serif,
                color: 'rgba(240,232,212,0.95)', lw: 3.8, tracking: 20,
                alpha: a, scale: 1 + (1 - ent.p) * 0.04
              });
              DFS.dbgBox('year755', W / 2 - 515, yBase - 166, W / 2 + 515, yBase + 166);
            }
            if (L > 5.72) {
              const cap = HUB.multiEntrance(L, 5.72, { duration: 0.6, rise: 14 });
              const ca = cap.alpha * ex.alpha;
              if (ca > 0.01) {
                const cy = 700 - (1 - ent.p) * 10 - (1 - ex.alpha) * 70;
                c.save();
                c.globalAlpha = ca;
                c.textBaseline = 'middle';
                c.textAlign = 'center';
                c.font = DFS.font(34, 400, T.fonts.serif);
                const w1 = c.measureText('渔阳鼙鼓动地来').width;
                c.font = DFS.font(23, 400, T.fonts.mono);
                const w2 = c.measureText(' · AN LUSHAN 755').width;
                const left = W / 2 - (w1 + w2) / 2;
                c.textAlign = 'left';
                c.font = DFS.font(34, 400, T.fonts.serif);
                c.fillStyle = 'rgba(238,230,210,0.92)';
                c.fillText('渔阳鼙鼓动地来', left, cy);
                c.font = DFS.font(23, 400, T.fonts.mono);
                c.fillStyle = 'rgba(206,196,174,0.74)';
                c.fillText(' · AN LUSHAN 755', left + w1, cy + 2);
                c.restore();
                DFS.dbgBox('caption', left, cy - 22, left + w1 + w2, cy + 22);
              }
            }
          }

          /* 6) 「国破山河在」逐字浮现 + 破字朱圈 */
          if (L > 7.68) {
            const n = GUOPO.length;
            const ga = clamp((L - 7.70) / 0.6);
            if (ga > 0.01) {
              // 纸色诗句下的暗衬，压住活字地面
              c.save();
              c.translate(W / 2, GUOPO_Y + 6);
              c.scale(1, 0.30);
              const g = c.createRadialGradient(0, 0, 40, 0, 0, 560);
              g.addColorStop(0, 'rgba(9,9,8,' + (0.62 * ga * darkP).toFixed(3) + ')');
              g.addColorStop(0.6, 'rgba(9,9,8,' + (0.34 * ga * darkP).toFixed(3) + ')');
              g.addColorStop(1, 'rgba(9,9,8,0)');
              c.fillStyle = g;
              c.fillRect(-560, -560, 1120, 1120);
              c.restore();
            }
            c.save();
            c.font = DFS.font(GUOPO_SIZE, 400, T.fonts.serif);
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            for (let i = 0; i < n; i++) {
              const st = 7.70 + HUB.stagger(i, { frames: 5 });
              const e = HUB.multiEntrance(L, st, { duration: 0.55, rise: 24, scaleFrom: 0.94 });
              if (e.alpha <= 0.01) continue;
              c.save();
              c.globalAlpha = e.alpha;
              c.fillStyle = 'rgba(244,236,216,0.97)';
              c.fillText(GUOPO[i], W / 2 + (i - 2) * GUOPO_STEP, GUOPO_Y + e.dy);
              c.restore();
            }
            c.restore();
            DFS.dbgBox(
              'guopo', W / 2 - GUOPO_STEP * 2 - GUOPO_SIZE / 2, GUOPO_Y - GUOPO_SIZE / 2,
              W / 2 + GUOPO_STEP * 2 + GUOPO_SIZE / 2, GUOPO_Y + GUOPO_SIZE / 2
            );

            const cp = clamp((L - 8.42) / 0.6);
            if (cp > 0.001) {
              DFS.handCircle(c, {
                x: W / 2 - GUOPO_STEP, y: GUOPO_Y, rx: 86, ry: 74,
                progress: Ease.inOutCubic(cp), lw: 5, seed: 27, color: '#D9381E'
              });
            }
          }
        }
      });

      ctx.restore();
    }

    hudDark(L) { return L > 5.0; }
  };
})(window.DFS);
