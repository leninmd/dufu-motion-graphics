/**
 * 16 · 千禧年复古桌面 · 历史检索系统 / Y2K Retro OS Windows · 2000s
 *
 * A fictional operating system searches the archive of history for Du Fu.
 * The whole surface is invented: gray bevelled windows, navy gradient title
 * bars, a 256-colour dithered wallpaper of the Xiang river, a taskbar with a
 * typing indicator. Every later reader is a pop-up: Han Yu lands in bar 1,
 * Su Shi cascades in on the bar-2 downbeat while the chat window takes the
 * beat in screen-space. In bar 3 the whole desk is vacuumed into a floppy.
 *
 * Nothing here uses Math.random / Date / performance: the wallpaper is an
 * ordered-dither painting, the UI is baked into cached layers and every
 * motion is quantised to 10 fps.
 */
import KIT from '../kit/index.js';
import { clamp01, lerp, smoothstep, easeInOut, easeOut, hash, unit, mulberry32, TAU } from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
const PAD = 20;
const MONO = '"Cascadia Mono", "Consolas", "Noto Serif SC", monospace';
const CJK = '"Noto Serif SC", "Songti SC", serif';

const C = {
  face: '#d4d0c8', faceHi: '#e0dcd4', white: '#ffffff', shadow: '#808080', dark: '#404040',
  black: '#111111', title0: '#0a246a', title1: '#4a7fd4', navy: '#0a246a',
  beige: '#ece9d8', cream: '#f6f2e6', red: '#a52a22', blue: '#103e79',
  ink: '#211a12', grey: '#4c4a46', listSel: '#0a246a',
};

const HANYU = '李杜文章在，光焰万丈长！';
const SUSHI = '古今诗人众矣，而杜子美为首！';

/* ------------------------------------------------------------------ layout */
const WIN = {
  index: { x: 1430, y: 196, w: 400, h: 272, tb: 22, kind: 'index', title: '全唐诗索引', icon: 'doc' },
  search: { x: 190, y: 200, w: 820, h: 520, tb: 24, kind: 'search', title: '诗史检索.exe', icon: 'search' },
  hanyu: { x: 430, y: 290, w: 800, h: 330, tb: 24, kind: 'hanyu', title: '韩愈_李杜文章在.txt — 诗笺 1.0', icon: 'note' },
  error: { x: 1100, y: 196, w: 520, h: 210, tb: 22, kind: 'error', title: '[ 检索结果：1,455 条记录 ]', icon: 'info' },
  sushi: { x: 760, y: 486, w: 860, h: 330, tb: 24, kind: 'sushi', title: '苏轼_书杜子美诗后.txt — 只读', icon: 'note' },
  chat: { x: 1180, y: 742, w: 480, h: 258, tb: 22, kind: 'chat', title: '千年对话 — 会话', icon: 'chat' },
  open: { x: 560, y: 336, w: 800, h: 380, tb: 24, kind: 'open', title: '历史检索系统 — 正在打开：2020s...', icon: 'load' },
};
const Z = ['index', 'search', 'hanyu', 'error', 'sushi', 'chat'];
const FLOPPY = { x: 1785, y: 886 };

const RECORDS = [
  ['712', '巩县', '降生'],
  ['718', '巩县', '《咏凤凰》'],
  ['731', '吴越', '壮游'],
  ['736', '泰山', '《望岳》'],
  ['746', '长安', '《兵车行》'],
  ['750', '长安', '《丽人行》'],
  ['755', '奉先', '《咏怀五百字》'],
  ['757', '长安', '《春望》'],
  ['759', '石壕', '《石壕吏》'],
  ['761', '成都', '《茅屋为秋风所破歌》'],
  ['766', '夔州', '《秋兴八首》'],
  ['768', '湘江', '《登岳阳楼》'],
  ['770', '潭州', '《风疾舟中》'],
];
const INDEX_ROWS = [
  '001 望岳', '002 房兵曹胡马', '003 画鹰', '004 兵车行', '005 丽人行',
  '006 前出塞九首', '007 自京赴奉先县咏怀', '008 春望', '009 月夜', '010 石壕吏',
  '011 新安吏', '012 潼关吏', '013 羌村三首', '014 茅屋为秋风所破歌', '015 蜀相',
  '016 春夜喜雨', '017 闻官军收河南河北', '018 登高', '019 秋兴八首', '020 咏怀古迹',
  '021 旅夜书怀', '022 登岳阳楼', '023 江南逢李龟年', '024 风疾舟中伏枕书怀',
];

/* -------------------------------------------------------------------- paint */
function makeCtxLayer(w, h) {
  const c = KIT.makeCanvas(w, h);
  return { canvas: c, ctx: c.getContext('2d') };
}

function bevelBox(ctx, x, y, w, h, mode = 'raised', face = C.face) {
  ctx.fillStyle = face;
  ctx.fillRect(x, y, w, h);
  if (mode === 'raised') {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y + 1, w - 2, 1); ctx.fillRect(x + 1, y + 1, 1, h - 2);
    ctx.fillStyle = '#dfdfdf'; ctx.fillRect(x, y, w - 1, 1); ctx.fillRect(x, y, 1, h - 1);
    ctx.fillStyle = '#808080'; ctx.fillRect(x + 1, y + h - 2, w - 2, 1); ctx.fillRect(x + w - 2, y + 1, 1, h - 2);
    ctx.fillStyle = '#111111'; ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
  } else if (mode === 'sunken') {
    ctx.fillStyle = '#808080'; ctx.fillRect(x, y, w - 1, 1); ctx.fillRect(x, y, 1, h - 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y + h - 2, w - 2, 1); ctx.fillRect(x + w - 2, y + 1, 1, h - 2);
    ctx.fillStyle = '#404040'; ctx.fillRect(x + 1, y + 1, w - 2, 1); ctx.fillRect(x + 1, y + 1, 1, h - 2);
    ctx.fillStyle = '#dfdfdf'; ctx.fillRect(x + 2, y + h - 3, w - 4, 1); ctx.fillRect(x + w - 3, y + 2, 1, h - 4);
  } else if (mode === 'thin') {
    ctx.fillStyle = '#808080';
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  }
}

function ui(ctx, text, x, y, o = {}) {
  const size = o.size ?? 11.5;
  ctx.font = `${o.weight ?? 500} ${size}px ${o.font || MONO}`;
  ctx.fillStyle = o.color || C.ink;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.spacing || 0}px`;
  if (o.shadow) {
    ctx.save();
    ctx.fillStyle = o.shadow;
    ctx.fillText(text, x + 1, y + 1);
    ctx.restore();
    ctx.fillStyle = o.color || C.ink;
  }
  ctx.fillText(text, x, y);
}

/* --------------------------------------------------------------- wallpaper */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const TEAL = [
  [5, 31, 44], [8, 44, 60], [11, 58, 78], [15, 74, 98], [22, 96, 124],
  [40, 125, 152], [78, 163, 183], [132, 201, 211], [196, 232, 233], [235, 250, 246],
];

function bakeWallpaper() {
  const lw = 480, lh = 270;
  const ridges = [];
  for (let l = 0; l < 3; l++) {
    const arr = new Float32Array(lw);
    for (let x = 0; x < lw; x++) {
      const nx = x / lw;
      let yy = 0.556 + l * 0.058;
      yy -= 0.155 * (1 - l * 0.24) * (KIT.fbm1(nx * 2.9 + l * 4.7, 4, 31 + l * 7) - 0.2);
      yy -= 0.085 * (1 - l * 0.3) * Math.exp(-Math.pow((nx - (0.21 + l * 0.085)) / 0.11, 2));
      yy -= 0.05 * (1 - l * 0.3) * Math.exp(-Math.pow((nx - (0.64 - l * 0.05)) / 0.08, 2));
      arr[x] = yy;
    }
    ridges.push(arr);
  }
  return KIT.layer('scene16:wall', W, H, (c) => {
    const small = KIT.makeCanvas(lw, lh);
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(lw, lh);
    const sx = 0.885, sy = 0.275, asp = 16 / 9;
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const nx = x / lw, ny = y / lh;
        let v = 0.62 - 0.30 * ny;
        // horizontal cloud filaments
        const band = Math.sin(ny * 26 + KIT.noise2(nx * 2.4, ny * 3.4, 77) * 5.2);
        v += band * 0.022 * (1 - ny);
        // a pale low sun on the right edge, clear of the card and the HUD
        const dx = (nx - sx) * asp, dy = ny - sy;
        const d = Math.hypot(dx, dy);
        const R = 0.058;
        if (d < R) v = 0.99 - 0.04 * (d / R);
        else v += 0.40 * Math.exp(-Math.pow((d - R) / 0.13, 2));
        // mountains: back to front
        let mountain = -1;
        for (let l = 2; l >= 0; l--) if (ny > ridges[l][x]) { mountain = l; break; }
        if (mountain >= 0) {
          const tex = KIT.fbm2(nx * 9 + mountain, ny * 13, 3, 41 + mountain);
          v = 0.24 - mountain * 0.075 + (tex - 0.5) * 0.09;
          if (nx > 0.60 && mountain < 2) v += 0.05 * (1 - mountain) * Math.max(0, 0.9 - ny * 1.1);
          // a lit ridge line so the silhouette reads as a mountain, not a stain
          const edge = Math.abs(ny - ridges[mountain][x]);
          if (edge < 0.008) v += 0.16 * (1 - edge / 0.008);
        }
        // the river
        const wl = 0.702;
        if (ny > wl) {
          const k = (ny - wl) / (1 - wl);
          v = 0.235 - 0.075 * k + 0.03 * Math.sin(k * 26 + nx * 7.5);
          v += (KIT.fbm2(nx * 6, k * 9, 2, 55) - 0.5) * 0.05;
          const rx = Math.abs(nx - sx);
          if (rx < 0.075) {
            const ripple = 0.5 + 0.5 * Math.sin((ny - wl) * 210 + nx * 3);
            v += 0.68 * (1 - k) * (1 - rx / 0.075) * (0.3 + 0.7 * ripple);
          }
          // bank shadow at the very bottom
          if (ny > 0.93) v -= 0.14 * (ny - 0.93) / 0.07;
        }
        // vignette baked softly
        const vg = Math.hypot((nx - 0.5) * 1.05, (ny - 0.48) * 1.25);
        v -= Math.max(0, vg - 0.5) * 0.34;
        const t = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
        let idx = Math.round(clamp01(v) * (TEAL.length - 1) + (t - 0.5) * 1.5);
        idx = Math.max(0, Math.min(TEAL.length - 1, idx));
        const o = (y * lw + x) * 4;
        img.data[o] = TEAL[idx][0];
        img.data[o + 1] = TEAL[idx][1];
        img.data[o + 2] = TEAL[idx][2];
        img.data[o + 3] = 255;
      }
    }
    sctx.putImageData(img, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(small, 0, 0, W, H);
    c.imageSmoothingEnabled = true;
    // embossed desktop seal, the only brand: four characters, no logo
    c.save();
    c.translate(690, 900);
    c.rotate(-0.045);
    c.globalAlpha = 0.13;
    c.strokeStyle = '#c8ecef';
    c.lineWidth = 5;
    c.strokeRect(-138, -138, 276, 276);
    c.lineWidth = 2;
    c.strokeRect(-120, -120, 240, 240);
    c.fillStyle = '#c8ecef';
    c.font = `700 108px ${CJK}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('诗', 0, -10);
    c.font = `500 32px ${CJK}`;
    c.fillText('史', 0, 86);
    c.restore();
    // photographic edge falloff
    const vg = c.createRadialGradient(W * 0.52, H * 0.44, 260, W * 0.52, H * 0.5, 1180);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.66, 'rgba(2,22,31,0.16)');
    vg.addColorStop(1, 'rgba(1,14,21,0.5)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
  });
}

function drawWallpaper(ctx, u, D) {
  const drift = Math.sin(u * 0.35) * 6;
  ctx.drawImage(D.wall, -18 + drift, -10, W + 36, H + 20);
  // slow mist banks over the water: the wallpaper is alive, just barely
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i++) {
    const y = 700 + i * 58 + Math.sin(u * 0.4 + i) * 5;
    const a = 0.045 - i * 0.011;
    const g = ctx.createLinearGradient(0, y - 70, 0, y + 70);
    g.addColorStop(0, 'rgba(190,235,235,0)');
    g.addColorStop(0.5, `rgba(190,235,235,${a})`);
    g.addColorStop(1, 'rgba(190,235,235,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-40, y + 70);
    for (let x = -40; x <= W + 40; x += 46) {
      ctx.lineTo(x, y + Math.sin(x * 0.004 + u * 0.3 + i * 1.7) * 13);
    }
    ctx.lineTo(W + 40, y + 70);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/* --------------------------------------------------------------- pixel icons */
const GRID = 24;

function drawPixelIcon(ctx, kind, x, y, s, opt = {}) {
  const p = s / GRID;
  const R = (gx, gy, gw, gh, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x + gx * p), Math.round(y + gy * p), Math.round(gw * p), Math.round(gh * p));
  };
  const dim = opt.dim || 0;
  const mix = (col, k) => {
    if (!k) return col;
    const h = col.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const t = 1 - k;
    return `rgb(${Math.round(r * t)},${Math.round(g * t)},${Math.round(b * t)})`;
  };
  const F = (col) => mix(col, dim);
  if (kind === 'folder') {
    R(2, 6, 20, 15, F('#0d0d0d'));
    R(3, 5, 9, 3, F('#0d0d0d'));
    R(3, 6, 8, 4, F('#f2b73c'));
    R(3, 7, 18, 12, F('#ffd15c'));
    R(3, 7, 18, 1, F('#ffe9a3'));
    R(3, 18, 18, 1, F('#c98a1c'));
    R(5, 10, 14, 1, F('#e2ab33'));
  } else if (kind === 'doc') {
    R(4, 3, 16, 19, F('#0d0d0d'));
    R(5, 4, 14, 17, F('#fbfbf2'));
    R(14, 4, 5, 5, F('#c9d2cf'));
    R(14, 4, 5, 1, F('#7f8c8a'));
    R(7, 10, 9, 1, F('#6a7c86'));
    R(7, 12, 10, 1, F('#6a7c86'));
    R(7, 14, 8, 1, F('#6a7c86'));
    R(7, 16, 10, 1, F('#9aa8ac'));
    R(5, 20, 14, 1, F('#dde3dc'));
  } else if (kind === 'search') {
    R(3, 2, 13, 17, F('#0d0d0d'));
    R(4, 3, 11, 15, F('#fbfbf2'));
    R(12, 3, 4, 4, F('#c9d2cf'));
    R(6, 7, 7, 1, F('#7b8b93'));
    R(6, 9, 7, 1, F('#7b8b93'));
    R(6, 11, 5, 1, F('#7b8b93'));
    R(12, 13, 9, 9, F('#0d0d0d'));
    R(13, 14, 7, 7, F('#9fd8e4'));
    R(14, 15, 5, 5, F('#1d5f70'));
    R(20, 20, 3, 2, F('#e3edea'));
    R(21, 21, 2, 3, F('#0d0d0d'));
  } else if (kind === 'floppy') {
    R(2, 2, 20, 21, F('#0d0d0d'));
    R(3, 3, 18, 19, F('#3b4046'));
    R(3, 3, 18, 2, F('#7d858d'));
    R(6, 4, 11, 6, F('#1c2126'));
    R(8, 4, 7, 5, F('#b9c2c8'));
    R(8, 8, 7, 1, F('#8b949b'));
    R(5, 12, 14, 9, F('#2a3038'));
    R(7, 13, 10, 6, F('#2b6fa6'));
    R(8, 14, 8, 1, F('#a9d4ef'));
    R(8, 16, 7, 1, F('#7fb6da'));
    R(5, 17, 2, 4, F('#171b1f'));
    R(17, 17, 2, 4, F('#171b1f'));
  } else if (kind === 'chat') {
    R(2, 4, 15, 12, F('#0d0d0d'));
    R(3, 5, 13, 10, F('#f6f2e2'));
    R(5, 8, 8, 1, F('#6b7a83'));
    R(5, 10, 6, 1, F('#6b7a83'));
    R(4, 15, 4, 4, F('#f6f2e2'));
    R(9, 10, 13, 10, F('#0d0d0d'));
    R(10, 11, 11, 8, F('#9fd0e6'));
    R(12, 13, 7, 1, F('#103e79'));
    R(12, 15, 5, 1, F('#103e79'));
    R(18, 19, 3, 3, F('#0d0d0d'));
  } else if (kind === 'info') {
    R(3, 3, 18, 18, F('#0d0d0d'));
    R(4, 4, 16, 16, F('#2d5fa8'));
    R(5, 5, 14, 14, F('#4a86cf'));
    R(5, 5, 14, 1, F('#9dc4ee'));
    R(11, 7, 3, 3, F('#ffffff'));
    R(11, 12, 3, 6, F('#ffffff'));
  } else if (kind === 'load') {
    R(2, 4, 20, 15, F('#0d0d0d'));
    R(3, 5, 18, 13, F('#e9e6dc'));
    R(3, 5, 18, 3, F('#0a246a'));
    R(5, 10, 10, 1, F('#7b8b93'));
    R(5, 12, 7, 1, F('#7b8b93'));
    R(16, 10, 4, 4, F('#8fb7d8'));
  } else if (kind === 'note') {
    R(3, 2, 18, 20, F('#0d0d0d'));
    R(4, 3, 16, 18, F('#fffdf2'));
    R(6, 6, 12, 1, F('#8b7a55'));
    R(6, 9, 12, 1, F('#c3b58d'));
    R(6, 12, 12, 1, F('#c3b58d'));
    R(6, 15, 8, 1, F('#c3b58d'));
    R(6, 17, 10, 1, F('#a52a22'));
  }
}

function miniIcon(ctx, kind, x, y) {
  ctx.save();
  if (kind === 'info') {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, y + 2, 10, 10);
    ctx.fillStyle = '#0a246a'; ctx.fillRect(x + 1, y + 1, 12, 12);
    ctx.fillStyle = '#4a86cf'; ctx.fillRect(x + 2, y + 2, 10, 10);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 6, y + 4, 2, 2); ctx.fillRect(x + 6, y + 7, 2, 4);
  } else if (kind === 'chat') {
    ctx.fillStyle = '#111'; ctx.fillRect(x + 1, y + 2, 11, 8);
    ctx.fillStyle = '#e9eef2'; ctx.fillRect(x + 2, y + 3, 9, 6);
    ctx.fillStyle = '#9fd0e6'; ctx.fillRect(x + 6, y + 7, 8, 6);
    ctx.fillStyle = '#103e79'; ctx.fillRect(x + 7, y + 8, 6, 1);
  } else if (kind === 'search') {
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 2, y + 1, 8, 11);
    ctx.fillStyle = '#111'; ctx.fillRect(x + 1, y + 1, 10, 1); ctx.fillRect(x + 1, y + 12, 10, 1);
    ctx.fillStyle = '#5c7f8c'; ctx.fillRect(x + 3, y + 4, 6, 1); ctx.fillRect(x + 3, y + 6, 6, 1);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x + 10, y + 10, 3, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 12, y + 12); ctx.lineTo(x + 14, y + 14); ctx.stroke();
  } else if (kind === 'load') {
    ctx.fillStyle = '#111'; ctx.fillRect(x + 1, y + 2, 12, 10);
    ctx.fillStyle = '#e9e6dc'; ctx.fillRect(x + 2, y + 3, 10, 8);
    ctx.fillStyle = '#0a246a'; ctx.fillRect(x + 2, y + 3, 10, 2);
    ctx.fillStyle = '#4a86cf'; ctx.fillRect(x + 3, y + 8, 6, 2);
  } else {
    // document
    ctx.fillStyle = '#111'; ctx.fillRect(x + 2, y + 1, 9, 12);
    ctx.fillStyle = '#fffef4'; ctx.fillRect(x + 3, y + 2, 7, 10);
    ctx.fillStyle = '#9aa4a8'; ctx.fillRect(x + 4, y + 5, 5, 1); ctx.fillRect(x + 4, y + 7, 5, 1); ctx.fillRect(x + 4, y + 9, 3, 1);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ chrome */
function bakeChrome(key, win) {
  const { w, h, tb, kind } = win;
  return KIT.layer(`scene16:chrome:${key}`, w + PAD * 2, h + PAD * 2, (c) => {
    const x = PAD, y = PAD;
    // hard shadow + soft spread, baked once
    c.save();
    c.fillStyle = 'rgba(0,12,18,0.5)';
    c.fillRect(x + 5, y + 6, w, h);
    c.shadowColor = 'rgba(0,9,14,0.55)';
    c.shadowBlur = 16;
    c.shadowOffsetY = 6;
    c.fillStyle = '#0c2c37';
    c.fillRect(x + 2, y + 2, w - 4, h - 4);
    c.restore();
    bevelBox(c, x, y, w, h, 'raised', C.face);
    // title bar
    const g = c.createLinearGradient(x + 3, y + 3, x + w - 3, y + 3);
    g.addColorStop(0, C.title0);
    g.addColorStop(0.55, '#24549f');
    g.addColorStop(1, C.title1);
    c.fillStyle = g;
    c.fillRect(x + 3, y + 3, w - 6, tb);
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.fillRect(x + 3, y + 3, w - 6, 1);
    miniIcon(c, win.icon, x + 6, y + 4 + (tb - 14) / 2);
    ui(c, win.title, x + 26, y + 3 + tb / 2 + 0.5, {
      size: 12, weight: 700, color: '#f2f6ff', shadow: 'rgba(0,0,0,0.55)', spacing: 0.2,
    });
    // window buttons
    const bw = 17, bh = tb - 8;
    const bx = x + w - 6 - (bw + 2) * 3;
    const glyphs = ['_', '□', '×'];
    for (let i = 0; i < 3; i++) {
      const bxx = bx + i * (bw + 2);
      const byy = y + 4 + (tb - bh) / 2;
      bevelBox(c, bxx, byy, bw, bh, 'raised', C.face);
      c.strokeStyle = '#121212';
      c.lineWidth = 1.2;
      if (i === 0) {
        c.beginPath(); c.moveTo(bxx + 4.5, byy + bh / 2 + 4); c.lineTo(bxx + 12.5, byy + bh / 2 + 4); c.stroke();
      } else if (i === 1) {
        c.strokeRect(bxx + 4.5, byy + bh / 2 - 4, 8, 8);
        c.strokeStyle = '#ffffff';
        c.beginPath(); c.moveTo(bxx + 4.5, byy + bh / 2 + 4); c.lineTo(bxx + 12.5, byy + bh / 2 + 4); c.stroke();
      } else {
        c.strokeStyle = '#121212';
        c.beginPath();
        c.moveTo(bxx + 5, byy + bh / 2 - 4); c.lineTo(bxx + 12, byy + bh / 2 + 4);
        c.moveTo(bxx + 12, byy + bh / 2 - 4); c.lineTo(bxx + 5, byy + bh / 2 + 4);
        c.stroke();
      }
    }
    // client area
    const cx0 = x + 3, cy0 = y + 3 + tb, cw = w - 6, chh = h - 6 - tb;
    if (kind === 'search') paintSearchBody(c, cx0, cy0, cw, chh);
    else if (kind === 'hanyu') paintHanyuBody(c, cx0, cy0, cw, chh);
    else if (kind === 'sushi' || kind === 'error') paintDialogBody(c, cx0, cy0, cw, chh, kind);
    else if (kind === 'chat') paintChatBody(c, cx0, cy0, cw, chh);
    else if (kind === 'index') paintIndexBody(c, cx0, cy0, cw, chh);
    else if (kind === 'open') paintOpenBody(c, cx0, cy0, cw, chh);
  });
}

function scrollbar(c, x, y, w, h, thumbPos, thumbH) {
  bevelBox(c, x, y, w, h, 'sunken', '#d4d0c8');
  c.fillStyle = '#d4d0c8';
  c.fillRect(x + 2, y + 2, w - 4, h - 4);
  // arrows
  c.fillStyle = '#111';
  c.beginPath(); c.moveTo(x + w / 2, y + 5); c.lineTo(x + w / 2 - 4, y + 10); c.lineTo(x + w / 2 + 4, y + 10); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x + w / 2, y + h - 5); c.lineTo(x + w / 2 - 4, y + h - 10); c.lineTo(x + w / 2 + 4, y + h - 10); c.closePath(); c.fill();
  // thumb
  bevelBox(c, x + 2, y + 14 + thumbPos, w - 4, thumbH, 'raised', '#d4d0c8');
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.fillRect(x + 4, y + 15 + thumbPos, w - 8, 1);
}

function menuRow(c, x, y, w, items, size = 11.5) {
  ui(c, items, x + 8, y + 11, { size, weight: 500, color: '#1b1b1b', spacing: 0.6 });
  c.fillStyle = '#9a9a94';
  c.fillRect(x, y + 21, w, 1);
  c.fillStyle = '#ffffff';
  c.fillRect(x, y + 22, w, 1);
}

function paintSearchBody(c, x, y, w, h) {
  c.fillStyle = C.face;
  c.fillRect(x, y, w, h);
  menuRow(c, x, y, w, '文件(F)    编辑(E)    检索(S)    查看(V)    帮助(H)');
  // toolbar
  bevelBox(c, x, y + 23, w, 34, 'raised', C.face);
  ui(c, '关键词:', x + 10, y + 40, { size: 11.5, weight: 500 });
  bevelBox(c, x + 62, y + 28, 430, 22, 'sunken', '#ffffff');
  ui(c, '杜甫', x + 68, y + 40, { size: 13, weight: 700, color: '#111', font: CJK });
  bevelBox(c, x + 496, y + 28, 66, 22, 'raised', C.face);
  ui(c, '检索', x + 529, y + 40, { size: 12, weight: 700, color: '#111', align: 'center', font: CJK });
  bevelBox(c, x + 574, y + 32, 13, 13, 'sunken', '#ffffff');
  ui(c, '✓', x + 577, y + 38, { size: 11, weight: 700, color: '#111' });
  ui(c, '全文', x + 593, y + 40, { size: 11.5 });
  c.beginPath(); c.arc(x + 648, y + 38, 6, 0, TAU); c.fillStyle = '#fff'; c.fill();
  c.strokeStyle = '#5b5b5b'; c.lineWidth = 1; c.stroke();
  c.beginPath(); c.arc(x + 648, y + 38, 2.6, 0, TAU); c.fillStyle = '#111'; c.fill();
  ui(c, '繁体', x + 660, y + 40, { size: 11.5 });
  // column header
  bevelBox(c, x + 6, y + 61, w - 26, 20, 'raised', C.face);
  ui(c, '日期', x + 12, y + 71, { size: 11, weight: 700 });
  ui(c, '地点', x + 66, y + 71, { size: 11, weight: 700 });
  ui(c, '篇目', x + 124, y + 71, { size: 11, weight: 700 });
  // list
  bevelBox(c, x + 6, y + 83, w - 26, 300, 'sunken', '#ffffff');
  c.fillStyle = '#ffffff';
  c.fillRect(x + 9, y + 86, w - 32, 294);
  for (let i = 0; i < RECORDS.length; i++) {
    const ry = y + 86 + i * 22;
    if (ry > y + 374) break;
    if (i % 2 === 1) {
      c.fillStyle = '#f4f4f0';
      c.fillRect(x + 9, ry, w - 32, 22);
    }
    c.fillStyle = '#d2d2cc';
    c.fillRect(x + 9, ry + 21, w - 32, 1);
    ui(c, RECORDS[i][0], x + 12, ry + 11, { size: 12, weight: 700, color: '#16233a' });
    ui(c, RECORDS[i][1], x + 66, ry + 11, { size: 11.5, color: '#3a4657' });
    ui(c, RECORDS[i][2], x + 124, ry + 11, { size: 11.5, color: '#26313f', font: MONO });
  }
  scrollbar(c, x + w - 20, y + 83, 16, 300, 34, 54);
  // progress band
  c.fillStyle = C.face;
  c.fillRect(x + 3, y + 390, w - 6, 76);
  ui(c, '正在检索 1,455 首诗…', x + 10, y + 404, { size: 13, weight: 700, color: '#111', font: CJK });
  bevelBox(c, x + 10, y + 416, w - 48, 24, 'sunken', '#ffffff');
  c.fillStyle = '#0a246a';
  c.fillRect(x + 12, y + 418, 0.1, 20);
  ui(c, '检索中', x + 10, y + 454, { size: 11, color: '#3d3d39' });
  // status bar
  bevelBox(c, x + 3, y + 466, w - 6, h - 469, 'raised', C.face);
  c.fillStyle = '#808080';
  c.fillRect(x + 8, y + 471, 1, h - 479);
  c.fillRect(x + 300, y + 471, 1, h - 479);
  c.fillRect(x + 560, y + 471, 1, h - 479);
  ui(c, '共 1,455 条记录', x + 14, y + 477, { size: 11, color: '#2b2b27' });
  ui(c, '用时 0.42 秒', x + 306, y + 477, { size: 11, color: '#2b2b27' });
  ui(c, 'UTF-8 · 索引已就绪', x + 566, y + 477, { size: 11, color: '#2b2b27' });
}

function paintHanyuBody(c, x, y, w, h) {
  c.fillStyle = C.face;
  c.fillRect(x, y, w, h);
  menuRow(c, x, y, w, '文件(F)    编辑(E)    格式(O)    查看(V)    帮助(H)');
  bevelBox(c, x + 4, y + 25, w - 8, h - 29, 'sunken', '#ffffff');
  c.fillStyle = '#fffef8';
  c.fillRect(x + 7, y + 28, w - 41, h - 35);
  // document margin rule
  c.fillStyle = 'rgba(60,70,90,0.10)';
  c.fillRect(x + 18, y + 28, 1, h - 35);
  // scrollbar
  scrollbar(c, x + w - 34, y + 25, 16, h - 29, 4, 84);
  // page corner fold
  c.fillStyle = '#e6e6df';
  c.beginPath();
  c.moveTo(x + w - 41, y + h - 7);
  c.lineTo(x + w - 41, y + h - 21);
  c.lineTo(x + w - 55, y + h - 7);
  c.closePath(); c.fill();
}

function paintDialogBody(c, x, y, w, h, kind) {
  c.fillStyle = C.face;
  c.fillRect(x, y, w, h);
  bevelBox(c, x + 3, y + 3, w - 6, h - 6, 'raised', C.beige);
  c.fillStyle = C.beige;
  c.fillRect(x + 5, y + 5, w - 10, h - 10);
  if (kind === 'error') {
    drawPixelIcon(c, 'info', x + 22, y + 24, 46);
    c.fillStyle = 'rgba(0,0,0,0.08)';
    c.fillRect(x + 80, y + 26, 1, h - 60);
    // buttons
    bevelBox(c, x + 80, y + 148, 92, 27, 'raised', C.face);
    ui(c, '确定', x + 126, y + 162, { size: 12, weight: 700, align: 'center', font: CJK, color: '#111' });
    bevelBox(c, x + 182, y + 148, 92, 27, 'raised', C.face);
    ui(c, '详细(D)', x + 228, y + 162, { size: 12, align: 'center', font: CJK, color: '#111' });
  } else {
    // sushi dialog
    drawPixelIcon(c, 'note', x + 22, y + 26, 44);
    c.fillStyle = 'rgba(0,0,0,0.08)';
    c.fillRect(x + 82, y + 26, 1, h - 60);
    bevelBox(c, x + 30, y + h - 62, 92, 27, 'raised', C.face);
    ui(c, '确定', x + 76, y + h - 48, { size: 12, weight: 700, align: 'center', font: CJK, color: '#111' });
    bevelBox(c, x + 132, y + h - 62, 92, 27, 'raised', C.face);
    ui(c, '帮助', x + 178, y + h - 48, { size: 12, align: 'center', font: CJK, color: '#111' });
    // the classic "read only" hint
    c.fillStyle = 'rgba(0,0,0,0.06)';
    c.fillRect(x + 30, y + h - 26, w - 60, 1);
    ui(c, '只读文档 · 唐 · 历代诗话', x + 30, y + h - 14, { size: 10.5, color: '#6a6459' });
  }
}

function paintChatBody(c, x, y, w, h) {
  c.fillStyle = C.face;
  c.fillRect(x, y, w, h);
  bevelBox(c, x + 3, y + 3, w - 6, h - 6, 'sunken', '#ffffff');
  c.fillStyle = '#ffffff';
  c.fillRect(x + 6, y + 6, w - 12, h - 48);
  // message 1: from the far future
  c.fillStyle = '#0a246a';
  c.beginPath(); c.arc(x + 22, y + 26, 11, 0, TAU); c.fill();
  ui(c, '后', x + 22, y + 27, { size: 12, weight: 700, color: '#fff', align: 'center', font: CJK });
  c.fillStyle = '#eef3ee';
  c.fillRect(x + 40, y + 14, 190, 26);
  c.strokeStyle = '#b9c7c4'; c.lineWidth = 1; c.strokeRect(x + 40.5, y + 14.5, 189, 25);
  ui(c, '你也读到杜甫了？', x + 50, y + 27, { size: 12, color: '#1e2a33', font: CJK });
  // message 2: from the archive
  c.fillStyle = '#103e79';
  c.fillRect(x + 200, y + 46, 238, 26);
  ui(c, '1,455 首，都在这里。', x + 210, y + 59, { size: 12, color: '#eaf2ff', font: CJK });
  c.fillStyle = 'rgba(16,62,121,0.14)';
  c.fillRect(x + 200, y + 72, 238, 1);
  // input bar
  c.fillStyle = C.face;
  c.fillRect(x + 6, y + h - 42, w - 12, 36);
  bevelBox(c, x + 10, y + h - 36, w - 90, 24, 'sunken', '#ffffff');
  bevelBox(c, x + w - 74, y + h - 36, 60, 24, 'raised', C.face);
  ui(c, '发送', x + w - 44, y + h - 24, { size: 11.5, weight: 700, align: 'center', font: CJK, color: '#111' });
}

function paintIndexBody(c, x, y, w, h) {
  c.fillStyle = C.face;
  c.fillRect(x, y, w, h);
  bevelBox(c, x + 4, y + 4, w - 8, h - 26, 'sunken', '#ffffff');
  c.fillStyle = '#ffffff';
  c.fillRect(x + 7, y + 7, w - 40, h - 32);
  for (let i = 0; i < INDEX_ROWS.length; i++) {
    const ry = y + 8 + i * 11.4;
    if (ry > y + h - 26) break;
    c.fillStyle = 'rgba(0,0,0,0.06)';
    c.fillRect(x + 7, ry + 10.6, w - 40, 0.6);
    // right-aligned so the entries survive being half-covered by the next pop-up
    c.font = `500 8.4px ${MONO}`;
    c.fillStyle = i % 3 === 0 ? '#0a246a' : '#3a4148';
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    c.fillText(INDEX_ROWS[i], x + w - 46, ry + 5.5);
    c.fillStyle = 'rgba(60,70,80,0.22)';
    const tw = c.measureText(INDEX_ROWS[i]).width;
    c.fillRect(x + 12, ry + 8.6, Math.max(0, w - 66 - tw), 0.6);
    c.textAlign = 'left';
  }
  scrollbar(c, x + w - 32, y + 4, 15, h - 26, 20, 70);
  ui(c, '1,455 首 · 按年编次', x + 8, y + h - 11, { size: 10, color: '#2b2b27' });
}

function paintOpenBody(c, x, y, w, h) {
  c.fillStyle = C.face;
  c.fillRect(x, y, w, h);
  bevelBox(c, x + 4, y + 4, w - 8, h - 8, 'raised', C.beige);
  c.fillStyle = C.beige;
  c.fillRect(x + 6, y + 6, w - 12, h - 12);
  // loading glyph: a large pixel hourglass, sand already half-way through
  c.save();
  c.translate(x + 46, y + 44);
  const gs = 4.4;
  for (let gy = 0; gy < HOUR_ROWS.length; gy++) {
    for (let gx = 0; gx < HOUR_ROWS[gy].length; gx++) {
      if (HOUR_ROWS[gy][gx] !== '#') continue;
      c.fillStyle = '#6d675b';
      c.fillRect(gx * gs, gy * gs, gs, gs);
    }
  }
  c.fillStyle = '#c99a52';
  c.fillRect(3.4 * gs, 5.7 * gs, 4.6 * gs, 1.6 * gs);
  c.fillStyle = '#0a246a';
  c.fillRect(1.2 * gs, -3, 9.6 * gs, 4);
  c.restore();
  bevelBox(c, x + 30, y + h - 58, 104, 30, 'raised', C.face);
  ui(c, '继续', x + 82, y + h - 42, { size: 14, weight: 700, align: 'center', font: CJK, color: '#111' });
  bevelBox(c, x + 144, y + h - 58, 104, 30, 'raised', C.face);
  ui(c, '稍后', x + 196, y + h - 42, { size: 14, align: 'center', font: CJK, color: '#5a564d' });
  // a tiny console log, the kind every installer had
  bevelBox(c, x + 42, y + 220, w - 96, 86, 'sunken', '#ffffff');
  c.fillStyle = '#fbfbf6';
  c.fillRect(x + 44, y + 222, w - 100, 82);
  const log = [
    '> 检索 1,455 首 ................ OK',
    '> 复制 43,890 字 .............. OK',
    '> 9:16 竖排渲染 ................ OK',
    '> 等待下一个时代 ...',
  ];
  for (let i = 0; i < log.length; i++) {
    ui(c, log[i], x + 52, y + 236 + i * 18, { size: 11, color: i === 3 ? '#8a857a' : '#3c4a44' });
  }
}

/* ------------------------------------------------------------- quote plates */
function makeQuoteLine(key, text, size = 36) {
  const meas = KIT.makeCanvas(8, 8).getContext('2d');
  meas.font = `500 ${size}px ${CJK}`;
  const chars = [...text];
  const spacing = size * 0.035;
  const widths = chars.map((ch) => meas.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  const pad = 8;
  const chh = Math.ceil(size * 1.55);
  const canvas = KIT.layer(`scene16:quote:${key}`, Math.ceil(total + pad * 2 + 4), chh, (c) => {
    c.font = `500 ${size}px ${CJK}`;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    let px = pad;
    const py = chh / 2 + 1;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const punct = '「」，！。」'.includes(ch);
      c.fillStyle = punct ? '#93261d' : '#1b140c';
      c.fillText(ch, px, py);
      px += widths[i];
    }
  });
  return { canvas, widths, pad, total, size, chars };
}

function drawQuoteLine(ctx, line, x, yMid, n, alpha = 1) {
  const len = line.chars.length;
  const nn = Math.max(0, Math.min(len, n));
  if (nn <= 0) return 0;
  let w = 0;
  for (let i = 0; i < nn; i++) w += line.widths[i];
  w -= line.size * 0.035;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.rect(x - 3, yMid - line.size, w + 5, line.size * 2);
  ctx.clip();
  ctx.drawImage(line.canvas, x - line.pad, yMid - line.canvas.height / 2);
  ctx.restore();
  return w;
}

/* ------------------------------------------------------------------- data */
let DATA = null;
function build() {
  if (DATA) return DATA;
  const D = {
    wall: bakeWallpaper(),
    chrome: {},
    han: [
      makeQuoteLine('han1', '李杜文章在，'),
      makeQuoteLine('han2', '光焰万丈长！'),
    ],
    su: [
      makeQuoteLine('su1', '古今诗人众矣，'),
      makeQuoteLine('su2', '而杜子美为首！'),
    ],
    floppy: KIT.layer('scene16:floppy', 96, 116, (c) => {
      drawPixelIcon(c, 'floppy', 0, 0, 96);
    }),
    icons: KIT.layer('scene16:icons', 150, 700, (c) => {
      const kinds = ['folder', 'doc', 'search', 'floppy', 'chat'];
      for (let i = 0; i < kinds.length; i++) {
        drawPixelIcon(c, kinds[i], 20, i * 108, 72);
      }
    }),
    cursor: KIT.layer('scene16:cursor', 48, 54, (c) => paintHourglass(c)),
  };
  for (const k of Object.keys(WIN)) D.chrome[k] = bakeChrome(k, WIN[k]);
  DATA = D;
  return D;
}

const HOUR_ROWS = [
  '..########..',
  '.#........#.',
  '.#.######.#.',
  '..#.####.#..',
  '...#.##.#...',
  '....####....',
  '.....##.....',
  '....####....',
  '...#.##.#...',
  '..#.####.#..',
  '.#.######.#.',
  '.#........#.',
  '..########..',
];

function paintHourglass(c) {
  const rows = HOUR_ROWS;
  const cs = 3;
  const ox = 4, oy = 3;
  const bg = ['#ffffff', '#f4f2ea'];
  // a 1.4px white contour: enough to read over teal wallpaper and grey chrome,
  // without turning the cursor into a blob
  const offs = [[-1.4, 0], [1.4, 0], [0, -1.4], [0, 1.4], [-1, -1], [1, 1]];
  for (const [dx, dy] of offs) {
    c.fillStyle = bg[0];
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        if (rows[y][x] !== '#') continue;
        c.fillRect(ox + x * cs + dx, oy + y * cs + dy, cs, cs);
      }
    }
  }
  c.fillStyle = bg[1];
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] !== '#') continue;
      c.fillRect(ox + x * cs, oy + y * cs, cs, cs);
    }
  }
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] !== '#') continue;
      c.fillStyle = '#0b0b0b';
      c.fillRect(ox + x * cs + 0.5, oy + y * cs + 0.5, cs - 1, cs - 1);
    }
  }
  // sand
  c.fillStyle = '#8a5a2a';
  c.fillRect(ox + 3.2 * cs, oy + 5.6 * cs, 4.2 * cs, 1.4 * cs);
}

/* ------------------------------------------------------------------ states */
function f10of(u) { return Math.floor(u * 10 + 1e-6) / 10; }

const OPEN_AT = { index: -2, search: -2, hanyu: 0.34, error: 2.0, sushi: 2.0, chat: 2.14, open: 4.6 };
const MIN_AT = { index: 4.0, search: 4.06, hanyu: 4.12, error: 3.96, sushi: 4.18, chat: 4.24, open: 99 };

function winState(key, u, f10) {
  const win = WIN[key];
  const cx = win.x + win.w / 2, cy = win.y + win.h / 2;
  const o = OPEN_AT[key];
  const openRaw = clamp01((u - (o - 0.045)) / 0.12);
  // classic zoom-open: two discrete steps at 10 fps
  const open = openRaw <= 0 ? 0 : Math.min(1, Math.ceil(openRaw * 2) / 2);
  const m = clamp01((f10 - MIN_AT[key]) / 0.44);
  const minS = m <= 0 ? 1 : Math.max(0.06, 1 - easeInOut(m) * 0.94);
  const targetX = FLOPPY.x + 2, targetY = FLOPPY.y;
  const px = lerp(0, targetX - cx, easeInOut(m));
  const py = lerp(0, targetY - cy, easeInOut(m));
  let alpha = 1;
  if (open > 0 && open < 1) alpha = 0.8 + open * 0.2;
  else if (open <= 0) alpha = 0;
  if (m > 0.72) alpha *= 1 - smoothstep(0.72, 1, m);
  const scale = (0.84 + open * 0.16) * minS;
  return { key, win, cx, cy, px, py, scale, alpha, open, min: m, visible: alpha > 0.01 && open > 0 };
}

/* ------------------------------------------------------------------- paint */
function paintOs(ctx, u, D, f10) {
  const [sx, sy] = shakeOffset(u);
  ctx.save();
  ctx.translate(sx, sy);
  drawDesktopIcons(ctx, u, D, f10);
  for (const key of Z) {
    const st = winState(key, u, f10);
    if (!st.visible) continue;
    drawWindow(ctx, key, u, st, D, f10);
  }
  const openSt = winState('open', u, f10);
  if (openSt.visible) drawWindow(ctx, 'open', u, openSt, D, f10);
  drawDings(ctx, u);
  drawFloppy(ctx, u, D, f10);
  drawCursor(ctx, u, D);
  drawTaskbar(ctx, u, f10);
  ctx.restore();
  // tooltip lives in screen space, inside the shake group already drawn
}

function drawDings(ctx, u) {
  const list = [
    { win: WIN.hanyu, t: OPEN_AT.hanyu, col: '#9dc4ee' },
    { win: WIN.error, t: 2.0, col: '#f0b9a8' },
    { win: WIN.sushi, t: 2.0, col: '#9dc4ee' },
  ];
  for (const d of list) {
    const p = (u - d.t) / 0.42;
    if (p < 0 || p > 1) continue;
    const step = Math.floor(p * 10) / 10;
    ctx.save();
    // title-bar flash
    if (p < 0.24) {
      ctx.globalAlpha = (1 - p / 0.24) * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(d.win.x + 3, d.win.y + 3, d.win.w - 6, d.win.tb);
    }
    // two pixel rings from the close box
    ctx.globalAlpha = (1 - p) * 0.7;
    ctx.strokeStyle = d.col;
    for (let i = 0; i < 2; i++) {
      const e = 2 + (step + i * 0.16) * 26;
      ctx.lineWidth = i ? 1 : 2;
      ctx.strokeRect(d.win.x + d.win.w - 8 - e, d.win.y + 8 - e * 0.4, e * 2, e * 0.8);
    }
    ctx.restore();
  }
}

function shakeOffset(u) {
  if (u < 2.0 || u > 2.52) return [0, 0];
  const k = Math.floor(u * 10 + 1e-6);
  const decay = Math.exp(-(u - 2.0) * 11.5);
  return [Math.sin(k * 2.399) * 6.2 * decay, Math.cos(k * 1.617) * 4.6 * decay];
}

function drawWindow(ctx, key, u, st, D, f10) {
  const win = st.win;
  ctx.save();
  ctx.globalAlpha = st.alpha;
  ctx.translate(st.px, st.py);
  ctx.translate(st.cx, st.cy);
  ctx.scale(st.scale, st.scale);
  ctx.translate(-st.cx, -st.cy);
  // 10fps afterimage while minimising
  if (st.min > 0.02 && st.min < 0.98) {
    for (let g = 1; g <= 2; g++) {
      const mm = Math.max(0, st.min - g * 0.10);
      const gp = easeInOut(mm);
      const gs = Math.max(0.06, 1 - gp * 0.94);
      const gx = lerp(0, FLOPPY.x - st.cx, gp);
      const gy = lerp(0, FLOPPY.y - st.cy, gp);
      ctx.save();
      ctx.globalAlpha = st.alpha * (g === 1 ? 0.20 : 0.08);
      ctx.translate(gx, gy);
      ctx.translate(st.cx, st.cy);
      ctx.scale(gs, gs);
      ctx.translate(-st.cx, -st.cy);
      ctx.fillStyle = 'rgba(228,224,214,0.9)';
      ctx.fillRect(win.x, win.y, win.w, win.h);
      ctx.fillStyle = 'rgba(10,36,106,0.9)';
      ctx.fillRect(win.x + 3, win.y + 3, win.w - 6, win.tb);
      ctx.restore();
    }
  }
  ctx.drawImage(D.chrome[key], win.x - PAD, win.y - PAD);
  // dynamic content
  if (win.kind === 'search') dynamicSearch(ctx, u, win, f10);
  else if (win.kind === 'hanyu') dynamicHanyu(ctx, u, win, D, f10);
  else if (win.kind === 'sushi') dynamicSushi(ctx, u, win, D, f10);
  else if (win.kind === 'error') dynamicError(ctx, u, win);
  else if (win.kind === 'chat') dynamicChat(ctx, u, win, f10);
  else if (win.kind === 'index') dynamicIndex(ctx, u, win, f10);
  else if (win.kind === 'open') dynamicOpen(ctx, u, win, f10);
  ctx.restore();
  return st;
}

function dynamicSearch(ctx, u, win, f10) {
  const x = win.x + 3, y = win.y + 3 + win.tb;
  // fake progress
  const p = u < 2.0
    ? lerp(0.05, 0.58, clamp01((f10 - 0.1) / 1.85))
    : lerp(0.58, 1, smoothstep(2.0, 2.62, u));
  const bx = x + 10, by = y + 416, bw = win.w - 48, bh = 24;
  for (let i = 0; i < 20; i++) {
    const seg = bw / 20;
    if (p * 20 <= i) break;
    const fill = Math.min(1, p * 20 - i);
    ctx.fillStyle = i % 2 ? '#2b6fb5' : '#3f86c9';
    ctx.fillRect(bx + 2 + i * seg, by + 2, Math.max(0, seg * fill - 1), bh - 4);
  }
  ctx.save();
  const g = ctx.createLinearGradient(bx, by, bx, by + bh);
  g.addColorStop(0, 'rgba(255,255,255,0.5)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(bx + 2, by + 2, (bw - 4) * p, bh - 4);
  ctx.restore();
  ui(ctx, `${Math.round(p * 100)}%`, x + win.w - 34, y + 404, { size: 12, weight: 700, color: '#111', align: 'right' });
  // block cursor in the query field
  if (Math.floor(u * 4) % 2 === 0) {
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 68 + 27, y + 32, 1.5, 15);
  }
  // 10fps selection band crawling down the visible left edge of the list
  const row = Math.floor(f10 * 6) % 8;
  const ry = x + 9, ry0 = y + 86 + row * 22;
  ctx.fillStyle = 'rgba(10,36,106,0.85)';
  ctx.fillRect(ry, ry0, 214, 21);
  ui(ctx, RECORDS[row % RECORDS.length][0], x + 12, ry0 + 11, { size: 12, weight: 700, color: '#dce8ff' });
  ui(ctx, RECORDS[row % RECORDS.length][1], x + 66, ry0 + 11, { size: 11.5, color: '#dce8ff' });
  // scrollbar thumb creep
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.restore();
}

const HAN_T0 = 0.55;
function dynamicHanyu(ctx, u, win, D, f10) {
  const qx = win.x + 68;
  const qy1 = win.y + 82, qy2 = win.y + 138;
  const len1 = D.han[0].chars.length, len2 = D.han[1].chars.length;
  // two characters per 10fps tick — the typewriter is a machine, not a person
  const ticks = Math.max(0, Math.floor((f10 - HAN_T0) * 10 + 0.0001));
  const n1 = Math.min(len1, Math.max(0, ticks * 2));
  const n2 = Math.min(len2, Math.max(0, (ticks - Math.ceil(len1 / 2)) * 2));
  const w1 = drawQuoteLine(ctx, D.han[0], qx, qy1, n1);
  const w2 = drawQuoteLine(ctx, D.han[1], qx, qy2, n2);
  const typing = n1 < len1 || n2 < len2;
  if (typing && Math.floor(u * 10) % 2 === 0) {
    const cx = n2 > 0 ? qx + w2 + 3 : n1 > 0 ? qx + w1 + 3 : qx;
    const cy = n2 > 0 ? qy2 : qy1;
    ctx.fillStyle = '#241a10';
    ctx.fillRect(cx, cy - 18, 2.5, 36);
  }
  if (n1 >= len1 && n2 >= len2) {
    // the attribution appears only once the sentence is whole
    const a = clamp01((u - 1.28) * 5);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(120,112,96,0.5)';
    ctx.fillRect(win.x + 68, win.y + 164, 232, 1);
    ui(ctx, '—— 韩愈《调张籍》', win.x + 68, win.y + 180, { size: 14, color: '#5c564a', font: CJK, spacing: 0.5 });
    ui(ctx, '卷三百四十 · 检索命中 1 条', win.x + 68, win.y + 202, { size: 11, color: '#8d8779', font: CJK });
    ctx.fillStyle = 'rgba(165,42,34,0.55)';
    ctx.fillRect(win.x + 60, win.y + 74, 2, 120);
    ctx.restore();
  }
  // watermark column of the poem that contains the verdict
  ctx.save();
  ctx.globalAlpha = clamp01((u - 1.1) * 2.5) * 0.34;
  verticalSerif(ctx, '文章千古事', win.x + 610, win.y + 42, 17, '#4a4438');
  ctx.restore();
  // red seal, top right of the page (still above the Su Shi window)
  ctx.save();
  ctx.globalAlpha = clamp01((u - 1.2) * 3) * 0.92;
  ctx.translate(win.x + win.w - 110, win.y + 150);
  ctx.rotate(0.05);
  ctx.strokeStyle = 'rgba(165,42,34,0.85)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-22, -22, 44, 44);
  ctx.fillStyle = 'rgba(165,42,34,0.9)';
  ctx.font = `700 27px ${CJK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('韩', 0, 1);
  ctx.restore();
}

function verticalSerif(ctx, text, x, y, size, color) {
  ctx.save();
  ctx.font = `500 ${size}px ${CJK}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) ctx.fillText(chars[i], x, y + i * (size + 8));
  ctx.restore();
}

function dynamicSushi(ctx, u, win, D, f10) {
  const qx = win.x + 122;
  const qy1 = win.y + 82, qy2 = win.y + 138;
  if (u < 2.0) return;
  // A verdict arrives whole: the dialogue box is a stamp, not a typewriter.
  const w1 = drawQuoteLine(ctx, D.su[0], qx, qy1, D.su[0].chars.length);
  drawQuoteLine(ctx, D.su[1], qx, qy2, D.su[1].chars.length);
  ui(ctx, '—— 苏轼《书杜子美诗后》', win.x + 122, win.y + 184, { size: 14, color: '#5c564a', font: CJK });
  void f10; void w1;
  // watermark column: the postscript this verdict was written in
  ctx.save();
  ctx.globalAlpha = 0.32;
  verticalSerif(ctx, '书杜子美诗后', win.x + win.w - 74, win.y + 150, 15, '#4a4438');
  ctx.restore();
  // vermilion seal, right page margin
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.translate(win.x + win.w - 60, win.y + 76);
  ctx.rotate(-0.04);
  ctx.strokeStyle = 'rgba(165,42,34,0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-19, -19, 38, 38);
  ctx.fillStyle = 'rgba(165,42,34,0.88)';
  ctx.font = `700 23px ${CJK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('苏', 0, 1);
  ctx.restore();
}

function dynamicError(ctx, u, win) {
  const x = win.x + 6, y = win.y + 3 + win.tb;
  ui(ctx, '检索完毕：1,455 首诗，43,890 字。', x + 96, y + 34, { size: 21, weight: 500, color: '#1a1a17', font: CJK });
  ui(ctx, '是否在桌面显示全部检索结果？', x + 96, y + 66, { size: 20, color: '#1a1a17', font: CJK });
  ui(ctx, '提示：本机未安装「唐」字库，诗句以宋体代替。', x + 96, y + 96, { size: 12, color: '#6c675c', font: CJK });
  if (Math.floor(u * 6) % 3 !== 0) {
    ctx.fillStyle = '#a52a22';
    ctx.fillRect(x + 96, y + 112, 6, 6);
  }
}

function dynamicChat(ctx, u, win, f10) {
  const x = win.x + 6, y = win.y + 3 + win.tb;
  const dots = '.'.repeat(1 + (Math.floor(u * 4) % 3));
  // typing row inside the transcript
  ui(ctx, '后世千年读书人 正在输入', x + 16, y + 92, { size: 12, color: '#4c5b63', font: CJK });
  ui(ctx, dots, x + 150, y + 92, { size: 12, weight: 700, color: '#103e79' });
  if (Math.floor(u * 5) % 2 === 0) {
    ctx.fillStyle = '#103e79';
    ctx.fillRect(x + 184, y + 84, 7, 14);
  }
  // keystroke caret in the input field
  if (Math.floor(u * 5) % 2 === 1) {
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 16, y + win.h - 42 + 8, 1.5, 14);
  }
}

function dynamicIndex(ctx, u, win, f10) {
  const x = win.x + 3, y = win.y + 3 + win.tb;
  const row = Math.floor(f10 * 4) % 18;
  ctx.fillStyle = 'rgba(10,36,106,0.82)';
  ctx.fillRect(x + 7, y + 8 + row * 11.4, win.w - 40, 11);
  ctx.save();
  ctx.font = `500 8.4px ${MONO}`;
  ctx.fillStyle = '#e6efff';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(INDEX_ROWS[row], x + win.w - 46, y + 13.5 + row * 11.4);
  ctx.restore();
  // scroll thumb
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + win.w - 29, y + 6 + row * 3.4, 2, 4);
  ctx.restore();
}

function dynamicOpen(ctx, u, win, f10) {
  const x = win.x + 6, y = win.y + 3 + win.tb;
  const prog = clamp01((f10 - 4.76) / 1.1);
  ui(ctx, '正在打开：2020s...', x + 112, y + 66, { size: 32, weight: 700, color: '#14120d', font: CJK, spacing: 1 });
  ui(ctx, '载入下一个时代 · 9:16 · 算法推荐流', x + 114, y + 106, { size: 14, color: '#6a6459', font: CJK });
  bevelBox(ctx, x + 42, y + 150, win.w - 96, 30, 'sunken', '#ffffff');
  const bx = x + 44, by = y + 152, bw = win.w - 100;
  const blue = ctx.createLinearGradient(0, by, 0, by + 26);
  blue.addColorStop(0, '#4a86cf'); blue.addColorStop(0.5, '#2b6fb5'); blue.addColorStop(1, '#103e79');
  ctx.fillStyle = blue;
  ctx.fillRect(bx, by, Math.max(2, bw * prog), 26);
  for (let i = 1; i < 12; i++) {
    ctx.fillStyle = 'rgba(212,208,200,0.55)';
    ctx.fillRect(bx + (bw / 12) * i, by, 2, 26);
  }
  ui(ctx, `${Math.round(prog * 100)}%`, x + 42, y + 198, { size: 12, weight: 700, color: '#2d2a24' });
  ui(ctx, `已复制 1,455 条记录 · 43,890 字`, x + win.w - 60, y + 198, { size: 12, color: '#5d574c', align: 'right', font: CJK });
  // continue button pulse on the beat
  const beatP = Math.exp(-(((u - 5.5) % 0.5) * 8));
  ctx.save();
  ctx.globalAlpha = 0.18 + beatP * 0.25;
  ctx.strokeStyle = '#0a246a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 30, y + win.h - 58, 104, 30);
  ctx.restore();
}

/* ------------------------------------------------------------------ desk UI */
function drawDesktopIcons(ctx, u, D, f10) {
  const x = 63, y = 186;
  ctx.drawImage(D.icons, x, y);
  const labels = [['诗集', 'FOLDER'], ['杜甫.dat', '1,455 首'], ['全唐诗索引', 'INDEX'], ['软盘 (A:)', '1.44 MB'], ['检索记录.txt', '43,890 字']];
  for (let i = 0; i < labels.length; i++) {
    const ly = y + i * 108 + 84;
    const selected = i === 1;
    if (selected) {
      ctx.fillStyle = 'rgba(10,36,106,0.86)';
      ctx.fillRect(x + 4, ly - 8, 104, 30);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(x + 5.5, ly - 6.5, 101, 27);
      ctx.setLineDash([]);
    }
    ui(ctx, labels[i][0], x + 56, ly, { size: 12.5, weight: 500, color: selected ? '#ffffff' : '#eaf7f5', align: 'center', shadow: 'rgba(0,20,26,0.75)', font: CJK });
    ui(ctx, labels[i][1], x + 56, ly + 15, { size: 8.6, color: selected ? 'rgba(220,235,255,0.8)' : 'rgba(214,238,238,0.55)', align: 'center', shadow: 'rgba(0,20,26,0.7)' });
  }
  void u; void f10;
}

function drawFloppy(ctx, u, D, f10) {
  const active = smoothstep(3.94, 4.2, u) * (1 - smoothstep(5.6, 6.0, u));
  ctx.save();
  ctx.translate(FLOPPY.x, FLOPPY.y);
  if (active > 0.01) {
    const ring = 1 + 0.06 * Math.sin(u * 7);
    ctx.save();
    ctx.globalAlpha = 0.25 + active * 0.35;
    ctx.strokeStyle = '#9fe6ef';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-52 * ring, -44 * ring, 104 * ring, 88 * ring);
    ctx.restore();
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 90);
    g.addColorStop(0, `rgba(150,230,240,${0.20 * active})`);
    g.addColorStop(1, 'rgba(150,230,240,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-96, -96, 192, 192);
  }
  ctx.drawImage(D.floppy, -48, -52);
  ui(ctx, '归档 · 2000s', 0, 74, { size: 12, color: active > 0.2 ? '#f4fbfa' : 'rgba(234,247,245,0.86)', align: 'center', font: CJK, shadow: 'rgba(0,18,24,0.8)' });
  if (active > 0.2) {
    const a = active * clamp01((u - 4.3) * 3);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#a52a22';
    ctx.fillRect(-26, -68, 52, 16);
    ui(ctx, '1,455', 0, -60, { size: 10, weight: 700, color: '#fff2ea', align: 'center' });
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ cursor */
const CURSOR_PATH = [
  [0.00, 356, 862], [0.55, 620, 640], [1.10, 752, 470], [1.55, 1010, 300],
  [2.00, 1230, 372], [2.30, 1120, 660], [3.10, 980, 800], [3.85, 1160, 900],
  [4.40, 1750, 880], [4.75, 1772, 886], [5.30, 980, 640], [5.75, 700, 560], [6.00, 690, 556],
];

function cursorAt(u) {
  for (let i = 1; i < CURSOR_PATH.length; i++) {
    const [t1, x1, y1] = CURSOR_PATH[i];
    if (u <= t1) {
      const [t0, x0, y0] = CURSOR_PATH[i - 1];
      const p = easeInOut(clamp01((u - t0) / Math.max(0.001, t1 - t0)));
      return [lerp(x0, x1, p), lerp(y0, y1, p)];
    }
  }
  const last = CURSOR_PATH[CURSOR_PATH.length - 1];
  return [last[1], last[2]];
}

function drawCursor(ctx, u, D) {
  const [cx, cy] = cursorAt(u);
  // click ripples, deterministic times
  for (const t of [0.42, 2.04, 4.52, 5.52]) {
    if (u >= t && u < t + 0.36) {
      const p = (u - t) / 0.36;
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.55;
      ctx.strokeStyle = '#e8fbff';
      ctx.lineWidth = 2;
      const r = 6 + p * 34;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        ctx.fillStyle = '#e8fbff';
        ctx.fillRect(cx + Math.cos(a) * r - 1.5, cy + Math.sin(a) * r - 1.5, 3, 3);
      }
      ctx.restore();
    }
  }
  ctx.drawImage(D.cursor, Math.round(cx), Math.round(cy));
  // tooltip
  if (u > 0.62 && u < 1.72) {
    const a = smoothstep(0.62, 0.72, u) * (1 - smoothstep(1.56, 1.7, u));
    const tw = 206, th = 26;
    const tx = Math.min(cx + 18, 1700), ty = cy + 26;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fffce8';
    ctx.fillRect(tx, ty, tw, th);
    ctx.fillStyle = '#111';
    ctx.fillRect(tx, ty, tw, 1); ctx.fillRect(tx, ty + th - 1, tw, 1);
    ctx.fillRect(tx, ty, 1, th); ctx.fillRect(tx + tw - 1, ty, 1, th);
    ui(ctx, '1,455 条记录 · 双击打开', tx + 8, ty + 13, { size: 11.5, color: '#1b1b1b', font: CJK });
    ctx.restore();
  }
}

/* ----------------------------------------------------------------- taskbar */
function drawTaskbar(ctx, u, f10) {
  const y = 1004, h = H - y;
  ctx.save();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#f0ece4');
  g.addColorStop(0.06, '#dcd8d0');
  g.addColorStop(0.55, '#d4d0c8');
  g.addColorStop(1, '#c2beb6');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, y, W, 1);
  ctx.fillStyle = '#8a867e';
  ctx.fillRect(0, y + 1, W, 1);
  // start button
  const pressed = u > 0.02 && u < 0.16;
  const rowY = y + 14;
  bevelBox(ctx, 8, rowY, 116, 38, pressed ? 'sunken' : 'raised', C.face);
  drawPixelIcon(ctx, 'search', 16, rowY + 7, 24);
  ui(ctx, '检索', 46, rowY + 19, { size: 15, weight: 700, color: '#16130e', font: CJK, spacing: 1 });
  // quick launch
  ctx.fillStyle = '#a09c94';
  ctx.fillRect(132, rowY + 5, 1, 28);
  drawPixelIcon(ctx, 'folder', 140, rowY + 9, 20);
  drawPixelIcon(ctx, 'chat', 166, rowY + 9, 20);
  drawPixelIcon(ctx, 'doc', 192, rowY + 9, 20);
  // task buttons
  const tasks = [
    ['诗史检索.exe', 0.0, 4.14],
    ['韩愈_李杜文章在.txt', 0.34, 4.12],
    ['苏轼_书杜子美诗后.txt', 2.0, 4.18],
    ['千年对话', 2.14, 4.24],
  ];
  let tx = 222;
  for (const [label, t0, t1] of tasks) {
    if (u < t0 || u > t1) { continue; }
    const active = label.startsWith('苏轼') && u >= 2.0;
    bevelBox(ctx, tx, rowY + 3, 152, 32, active ? 'sunken' : 'raised', C.face);
    miniIcon(ctx, label.startsWith('苏轼') ? 'note' : 'doc', tx + 6, rowY + 6);
    ui(ctx, label, tx + 24, rowY + 19, { size: 11.5, color: '#1a1a16', font: CJK });
    tx += 156;
  }
  // embossed system name in the trough, the quietest kind of branding
  ui(ctx, '历史检索系统 · 2000s', 1470, rowY + 19, { size: 12, weight: 500, color: 'rgba(90,86,78,0.30)', align: 'center', font: CJK, spacing: 2, shadow: 'rgba(255,255,255,0.65)' });
  // typing indicator: the most 2000s thing on screen
  const ty = rowY + 6;
  bevelBox(ctx, 700, ty, 500, 28, 'sunken', '#e9e6dc');
  ctx.fillStyle = 'rgba(16,62,121,0.10)';
  ctx.fillRect(702, ty + 2, 496, 24);
  const dots = '.'.repeat(1 + (Math.floor(u * 4) % 3));
  ui(ctx, '对方（后世千年读书人）正在输入', 738, ty + 14, { size: 13, weight: 700, color: '#0e2f5c', font: CJK });
  ui(ctx, dots, 955, ty + 14, { size: 13, weight: 700, color: '#0e2f5c' });
  miniIcon(ctx, 'chat', 710, ty + 8);
  // a small pencil that pulses on the beat
  if (Math.floor(u * 8) % 2 === 0) {
    ctx.fillStyle = '#a52a22';
    ctx.fillRect(994, ty + 9, 6, 10);
  }
  // tray
  bevelBox(ctx, 1690, rowY + 3, 222, 32, 'sunken', C.face);
  drawPixelIcon(ctx, 'floppy', 1698, rowY + 9, 18);
  ctx.fillStyle = '#3a3a36';
  ctx.beginPath(); ctx.arc(1730, rowY + 19, 5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#d4d0c8';
  ctx.beginPath(); ctx.arc(1730, rowY + 19, 2, 0, TAU); ctx.fill();
  // speaker
  ctx.fillStyle = '#3a3a36';
  ctx.fillRect(1748, rowY + 15, 4, 8);
  ctx.beginPath(); ctx.moveTo(1752, rowY + 15); ctx.lineTo(1757, rowY + 11); ctx.lineTo(1757, rowY + 27); ctx.lineTo(1752, rowY + 23); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#3a3a36'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(1758, rowY + 19, 4, -0.8, 0.8); ctx.stroke();
  // clock
  const sec = Math.floor(u);
  const clock = `10:24:${String(sec).padStart(2, '0')}`;
  ui(ctx, clock, 1904, rowY + 19, { size: 13, weight: 700, color: '#141410', align: 'right' });
  // lower bevel: the desk has a physical edge
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(0, y + 58, W, 1);
  const shade = ctx.createLinearGradient(0, y + 59, 0, H);
  shade.addColorStop(0, 'rgba(30,28,24,0.05)');
  shade.addColorStop(1, 'rgba(20,18,14,0.22)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, y + 59, W, h - 59);
  ctx.restore();
}

/* ------------------------------------------------------------------ screen */
let GLITCH = null;
function glitchBuffer() {
  if (!GLITCH) {
    const c = KIT.makeCanvas(W, H);
    GLITCH = { canvas: c, ctx: c.getContext('2d') };
  }
  return GLITCH;
}

function compositeSlices(ctx, buf, u) {
  const p = u - 2.0;
  const amp = Math.exp(-p * 26);
  const n = 6;
  const hh = H / n;
  const seed = Math.floor(u * 10 + 1e-6);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const off = Math.sin(i * 2.71 + seed * 1.37) * 9 * amp;
    ctx.drawImage(buf, 0, i * hh, W, hh, off, i * hh, W, hh);
    if (amp > 0.12) {
      ctx.fillStyle = `rgba(255,255,255,${0.04 * amp})`;
      ctx.fillRect(0, i * hh, W, 1.5);
    }
  }
  // chroma tears
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i++) {
    const yy = (i * 233 + seed * 17) % H;
    ctx.fillStyle = i % 2 ? `rgba(190,40,30,${0.08 * amp})` : `rgba(40,120,180,${0.10 * amp})`;
    ctx.fillRect(0, yy, W, 3);
  }
  ctx.restore();
}

function drawScreenFx(ctx, u) {
  // ambient bloom from the beige pile onto the glass
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const bloom = ctx.createRadialGradient(900, 560, 120, 900, 560, 760);
  bloom.addColorStop(0, 'rgba(255,244,220,0.055)');
  bloom.addColorStop(0.55, 'rgba(255,240,210,0.022)');
  bloom.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, H);
  // CRT scanlines + a faint 256-colour dither, kept under the threshold of taste
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = '#000';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.restore();
  // vignette
  const v = ctx.createRadialGradient(960, 470, 320, 960, 520, 1180);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.66, 'rgba(1,18,26,0.16)');
  v.addColorStop(1, 'rgba(0,12,18,0.56)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  // glass: one broad reflection sweep, the sort a CRT always caught
  ctx.save();
  const glass = ctx.createLinearGradient(0, 0, W * 0.7, H);
  glass.addColorStop(0, 'rgba(255,255,255,0.05)');
  glass.addColorStop(0.34, 'rgba(255,255,255,0.012)');
  glass.addColorStop(0.52, 'rgba(255,255,255,0)');
  glass.addColorStop(1, 'rgba(255,255,255,0.02)');
  ctx.fillStyle = glass;
  ctx.fillRect(0, 0, W, H);
  const sheen = ctx.createRadialGradient(W * 0.30, H * 0.14, 20, W * 0.30, H * 0.14, W * 0.42);
  sheen.addColorStop(0, 'rgba(240,255,255,0.05)');
  sheen.addColorStop(1, 'rgba(240,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // bar-3 darkening: the desktop hands itself to the phone era
  const dark = smoothstep(5.0, 5.9, u);
  if (dark > 0.001) {
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(2,12,18,${0.34 * dark})`);
    g.addColorStop(0.6, `rgba(2,12,18,${0.20 * dark})`);
    g.addColorStop(1, `rgba(1,8,12,${0.46 * dark})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // the future frame: a 9:16 guide grows in the last third of a second
  const por = smoothstep(5.3, 5.95, u);
  if (por > 0.01) {
    const pw = 900 * (9 / 16) * 1.02, ph = 900;
    const px = 960 - pw / 2, py = 250;
    ctx.save();
    ctx.globalAlpha = por * 0.22;
    ctx.strokeStyle = '#bfeef5';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);
    for (const [cx, cy] of [[px, py], [px + pw, py], [px, py + ph], [px + pw, py + ph]]) {
      const dx = cx === px ? 1 : -1;
      const dy = cy === py ? 1 : -1;
      ctx.strokeStyle = '#e6fbff';
      ctx.globalAlpha = por * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx + dx * 18, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * 18);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* --------------------------------------------------------------- main draw */
function drawMarks(u, D) {
  void D;
  if (u >= 1.58 && u < 4.2) {
    markText('s16-hanyu', HANYU, 494, 342, 292, 118, { size: 36, color: '#1b140c' });
  }
  if (u >= 2.0 && u < 4.24) {
    markText('s16-sushi', SUSHI, 878, 542, 292, 118, { size: 36, color: '#1b140c' });
  }
  if (u >= 4.66) {
    markText('s16-open', '正在打开：2020s...', 672, 410, 600, 44, { size: 32, align: 'left' });
  }
  if (u >= 2.0 && u < 4.06) {
    markText('s16-result', '检索完毕：1,455 首诗，43,890 字。', 1202, 240, 400, 30, { size: 21 });
  }
}

export function renderAt(ctx, u, beat, env = {}) {
  const D = build();
  const f10 = f10of(u);
  drawWallpaper(ctx, u, D);
  const glitch = u >= 2.0 && u < 2.5;
  if (glitch) {
    const buf = glitchBuffer();
    buf.ctx.clearRect(0, 0, W, H);
    paintOs(buf.ctx, u, D, f10);
    compositeSlices(ctx, buf.canvas, u);
  } else {
    paintOs(ctx, u, D, f10);
  }
  drawScreenFx(ctx, u);
  drawMarks(u, D);
  // film grain, shared with the rest of the picture
  const grain = KIT.layer('scene16:grain', 480, 270, (c) => KIT.grainLayer(480, 270, 1616, { amp: 0.10 }));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.12;
  ctx.drawImage(grain, 0, 0, W, H);
  ctx.restore();
  void beat; void env;
}

export default { renderAt };
