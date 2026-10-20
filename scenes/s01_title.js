/* =========================================================================
   s01_title.js — 0.0–4.6s  序：墨圈 → 诗圣印 → 杜甫 → 退入活字世界
   0.0 宣纸（零黑屏）｜0.05–1.0 枯笔墨圈｜0.70 朱印砸落 + 震屏
   1.20–2.40 6500 水墨粒子成字｜2.35 朱线 + 712 — 770
   2.40–4.60 摄像机 Z 2.2→9.0 拉远，二字退入 1600 活字地面
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

  /* ---------- 墨圈几何：16 段二次贝塞尔，低频起伏 + 枯笔断口 ---------- */
  const RING = (function () {
    const r = DFS.rng(20240917);
    const N = 16;
    const a0 = -Math.PI * 0.60;
    const span = Math.PI * 2 * 0.905;          // 不闭合：留 ~9.5% 缺口
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const a = a0 + span * u;
      const k = 1 + 0.030 * Math.sin(a * 3 + 1.1)
        + 0.022 * Math.sin(a * 5.3 + 0.4)
        + (r() - 0.5) * 0.022;
      pts.push({
        a, k,
        w: 0.72 + r() * 0.55,                  // 线宽抖动
        al: 0.62 + r() * 0.30,                 // 墨色浓淡
        dry: r() < 0.10                        // 枯笔断口
      });
    }
    return { N, pts };
  })();

  const TITLE = '杜甫';
  const TSIZE = 338;          // 粒子采样步长 3px 时 ≈ 6,500 颗（见 inkParticles）
  const TCY = 470;            // 墨圈 / 朱印 / 标题 的共同中心
  const SEAL_SIZE = 190;

  DFS.sceneRegistry['s01'] = class Scene01 {
    constructor() {
      this.field = new DFS.TypeField({
        seed: 16350, rows: 40, cols: 40, spacing: 0.86,
        blockW: 0.74, blockH: 0.56, gap: 0, text: POEM_TEXT
      });
      this.cam = new DFS.Camera({ pos: { x: 0, y: 2.2, z: 2.2 }, yaw: 0, pitch: -0.44 });
      this.zFar = ((this.field.rows - 1) / 2) * this.field.spacing;
      this._sealCv = null;
      this._ptCount = 0;
    }

    /* 远端渐隐：按屏幕纵坐标把最远几排化掉，消除版面被"切断"的硬边 */
    _horizonY() {
      const p = this.cam.project({ x: 0, y: 0, z: this.zFar });
      return p ? p.y : null;
    }

    /* ---------- 枯笔墨圈：逐段推进、由粗到细 ---------- */
    _inkRing(ctx, p) {
      const { N, pts } = RING;
      const cx = W / 2, cy = TCY;
      const RX = 430, RY = 312;
      const total = p * (N + 0.55);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < N; i++) {
        const seg = clamp(total - i);
        if (seg <= 0.001) break;
        const A = pts[i], B = pts[i + 1];
        const u = i / N;
        const aa = A.a - 0.025;                 // 与上一段轻微叠压
        const ab = lerp(A.a, B.a, seg);
        const mid = (aa + ab) * 0.5;
        const k0 = A.k, k1 = lerp(A.k, B.k, seg);
        const cm = (k0 + k1) * 0.5 * 1.045;
        const x0 = cx + Math.cos(aa) * RX * k0, y0 = cy + Math.sin(aa) * RY * k0;
        const x2 = cx + Math.cos(ab) * RX * k1, y2 = cy + Math.sin(ab) * RY * k1;
        const x1 = cx + Math.cos(mid) * RX * cm, y1 = cy + Math.sin(mid) * RY * cm;
        const wd = (10.6 * Math.pow(1 - u, 0.85) + 1.15) * A.w;
        ctx.strokeStyle = 'rgba(24,17,8,' + (A.dry ? 0.26 : A.al).toFixed(3) + ')';
        ctx.lineWidth = wd;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(x1, y1, x2, y2);
        ctx.stroke();
      }
      // 起笔处的重墨点
      if (p > 0.02) {
        const A = pts[0];
        const bx = cx + Math.cos(A.a) * RX * A.k;
        const by = cy + Math.sin(A.a) * RY * A.k;
        const r0 = DFS.rng(77);
        ctx.fillStyle = 'rgba(24,17,8,0.85)';
        for (let i = 0; i < 7; i++) {
          const a = r0() * Math.PI * 2, d = 3 + r0() * 16;
          ctx.beginPath();
          ctx.arc(bx + Math.cos(a) * d, by + Math.sin(a) * d, 0.8 + r0() * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    /* ---------- 印面烘焙：p=1 的印 → 可任意 alpha 复用的位图 ---------- */
    _sealCanvas() {
      if (this._sealCv) return this._sealCv;
      const S = 340;
      const cv = DFS.mkCanvas(S, S);
      const c = cv.getContext('2d');
      c.translate(S / 2, S / 2);
      HUB.inkStampSplash(c, 0, 0, 1, 7121, {
        size: SEAL_SIZE, text: '诗圣', chars: 'v', rotate: -0.02
      });
      this._sealCv = cv;
      return cv;
    }

    /* ---------- 活字版面（自绘：修正 TypeField.drawFlat 的字形纵向镜像） ---------- */
    _flat(ctx, cam, t, o) {
      const items = this.field.items;
      const hw = this.field.blockW * 0.46;
      const hd = this.field.spacing * 0.44;
      const lift = o.lift || 0;
      const fogNear = o.fogNear ?? 2, fogFar = o.fogFar ?? 13;
      const inkR = o.inkR ?? 24, inkG = o.inkG ?? 18, inkB = o.inkB ?? 10;
      const inkA = o.inkA ?? 0.82;
      const plateA = o.plateA ?? 0.055;
      const alphaMul = o.alphaMul ?? 1;
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
        // 单位方格 → 透视平行四边形（y 向下为正，字不倒错）
        ctx.setTransform(ux, uy, vx, vy, p3.x, p3.y);
        ctx.globalAlpha = a * plateA;
        ctx.fillStyle = 'rgba(' + inkR + ',' + inkG + ',' + inkB + ',1)';
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

    draw(ctx, L, t) {
      const frame = Math.round(L * DFS.FPS);

      /* ---------- 时间线 ---------- */
      const ringP = Ease.outCubic(clamp((L - 0.05) / 0.95));
      const stampP = clamp((L - 0.55) / 0.42);
      const impactF = Math.round((0.55 + 0.42 * 0.35) * DFS.FPS);
      const shake = (frame >= impactF)
        ? HUB.cameraShake(frame, { amp: 10, decay: 8, startFrame: impactF, seed: 4 })
        : { x: 0, y: 0, rot: 0 };
      const assemble = clamp((L - 1.18) / 1.04);
      const recede = clamp((L - 2.40) / 2.05);
      const rpx = HUB.ease.outExpo(recede);
      const tScale = lerp(1, 0.205, rpx);
      const tY = lerp(TCY, 168, rpx);
      const floorA = HUB.ease.inOutCubic(clamp((L - 2.46) / 0.88));
      const ringA = 1 - HUB.ease.outCubic(clamp((L - 1.28) / 0.72));

      if (!this._ptCount) {
        this._ptCount = DFS.sampleParticles(TITLE, TSIZE, 900, T.fonts.heavy, 3).pts.length;
      }
      DFS.dbg({ typeField: this.field.items.length, inkParticles: this._ptCount });

      /* ---------- 摄像机：Z 2.2 → 9.0（指数拉远） ---------- */
      // 收尾把漂移归零，保证 4.4s 与 s02 首帧几乎完全重合（避免交叉溶解重影）
      const drift = 1 - recede * recede;
      this.cam.pos = {
        x: 0.22 * Math.sin(L * 0.25) * drift,
        y: lerp(2.2, 5.0, HUB.ease.inOutCubic(recede)),
        z: lerp(2.2, 9.0, rpx)
      };
      this.cam.pitch = lerp(-0.44, -0.88, HUB.ease.inOutCubic(recede));
      this.cam.yaw = 0.012 * Math.sin(L * 0.4) * drift;

      ctx.save();
      HUB.applyCameraShake(ctx, shake);

      HUB.fiveLayerStack(ctx, t, {
        dark: false,
        grade: 'warm',
        grain: 0.24,
        vignette: 0.14,
        vignetteMid: 0.02,
        /* ---- L1：宣纸（首帧即满幅暖白，绝无黑屏） ---- */
        layer1: (c) => {
          c.drawImage(DFS.getPaper(), -W * 0.03, -H * 0.03, W * 1.06, H * 1.06);
          DFS.drawGradientMesh(c, t, {
            c1: 'rgba(255,250,232,0.52)', c2: 'rgba(120,104,78,0.12)'
          });
        },
        /* ---- L2：墨圈 → 活字地面 → 朱印 ---- */
        layer2: (c) => {
          if (ringA > 0.004) {
            c.save();
            c.globalAlpha = ringA;
            const grow = 1 + 0.055 * clamp((L - 0.7) / 1.4);
            c.translate(W / 2, TCY);
            c.scale(grow, grow);
            c.translate(-W / 2, -TCY);
            this._inkRing(c, ringP);
            c.restore();
          }

          if (floorA > 0.004) {
            this._flat(c, this.cam, t, {
              alphaMul: floorA,
              fogNear: 1.8,
              fogFar: 13.0,
              inkR: 24, inkG: 18, inkB: 10, inkA: 0.80, plateA: 0.05,
              topFade: this._horizonY(), topFadeSpan: 230
            });
          }

          // 朱印「诗圣」：0.70s 砸下，1.20 后化作位图淡出
          if (L > 0.55) {
            if (stampP < 1) {
              HUB.inkStampSplash(c, W / 2, TCY, stampP, 7121, {
                size: SEAL_SIZE, text: '诗圣', chars: 'v', rotate: -0.02
              });
            } else {
              const ex = HUB.fastExit(L, 1.20, { duration: 0.52 });
              if (ex.alpha > 0.01) {
                const cv = this._sealCanvas();
                c.save();
                c.globalAlpha = ex.alpha * 0.96;
                c.drawImage(cv, W / 2 - cv.width / 2, TCY - cv.height / 2);
                c.restore();
              }
            }
          }
        },
        /* ---- L3：标题组（杜甫 + 朱线 + 生卒） ---- */
        layer3: (c) => {
          if (L < 1.05) return;
          const exG = HUB.fastExit(L, 2.92, { duration: 0.60 });
          const aRes = 0.24 + 0.76 * exG.alpha;          // 收尾只留一点残影
          const partA = clamp(1 - (L - 2.42) / 0.36) * aRes;
          const solidA = clamp((L - 2.14) / 0.30) * aRes;

          c.save();
          c.translate(W / 2, tY);
          c.scale(tScale, tScale);

          if (assemble > 0.001 && partA > 0.01) {
            DFS.particleText(c, TITLE, {
              x: 0, y: 0, size: TSIZE, weight: 900, family: T.fonts.heavy,
              step: 3, seed: 23, assemble: assemble,
              color: '32,24,13', alpha: partA, sizePx: 1.9, jitter: 1
            });
          }

          if (solidA > 0.01) {
            HUB.title(c, TITLE, {
              x: 0, y: 4, size: TSIZE, weight: 900, family: T.fonts.heavy,
              tracking: 8, align: 'center',
              color: 'rgba(24,18,9,' + solidA.toFixed(3) + ')'
            });
          }

          if (L > 2.32) {
            const ln = HUB.multiEntrance(L, 2.34, { duration: 0.52, rise: 12, scaleFrom: 0.94 });
            const lw = 470 * ln.p;
            c.fillStyle = 'rgba(217,56,30,' + (0.95 * ln.alpha * aRes).toFixed(3) + ')';
            c.fillRect(-lw / 2, 228, lw, 3);
          }

          if (L > 2.40) {
            const nm = HUB.multiEntrance(L, 2.42, { duration: 0.55, rise: 10, scaleFrom: 1 });
            if (nm.alpha > 0.01) {
              c.save();
              c.globalAlpha = nm.alpha * aRes;
              HUB.monoNums(c, '712 — 770', 0, 272 + (1 - nm.p) * 8, 38, {
                color: 'rgba(52,44,32,0.92)', align: 'center', tracking: 8
              });
              c.restore();
            }
          }
          c.restore();

          DFS.dbgBox(
            'title',
            W / 2 - TSIZE * tScale, tY - TSIZE * 0.5 * tScale,
            W / 2 + TSIZE * tScale, tY + TSIZE * 0.5 * tScale
          );
        }
      });

      ctx.restore();
    }

    hudDark() { return false; }
  };
})(window.DFS);
