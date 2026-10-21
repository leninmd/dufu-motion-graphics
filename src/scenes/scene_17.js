/**
 * 17 · 9:16 竖屏短视频 · 弹幕风暴 / Vertical Short-Video & Danmaku Storm · 2020s
 *
 * The 16:9 film is squeezed into a fictional 9:16 feed. A quiet short of an old
 * Du Fu in his boat gets 10w+ likes; on the bar-2 downbeat the algorithm erupts
 * — hundreds of comments, hearts and re-readings fill the glass. The progress
 * bar runs full exactly as the picture opens the last frame.
 *
 * The interface is invented. No real platform logo, icon or trademark is used.
 */
import KIT from '../kit/index.js';
import { clamp01, lerp, smoothstep, easeOutCubic, easeInOut, hash, unit, mulberry32, TAU } from '../kit/math.js';
import { markText } from '../kit/debug.js';

const W = 1920, H = 1080;
const PHONE = { w: 540, h: 960, y: 66 };
const RAIL = '#f4efe5';
const RED = '#ff2b4d';
const GOLD = '#f6d58a';

const FEATURED = [
  { t0: 2.02, t1: 2.92, text: '年少喜欢李白的狂，中年才懂杜甫的苦', user: '江畔独步', size: 23 },
  { t0: 2.92, t1: 3.72, text: '他自己淋着雨，却给天下人撑了伞', user: '不系之舟', size: 23 },
  { t0: 3.72, t1: 4.48, text: '少不读杜甫，读懂已是书中人', user: '秋兴八首', size: 25 },
  { t0: 4.48, t1: 5.38, text: '子美千古！', user: '少陵门下', size: 42 },
];
const COMMENTS = [
  '年少喜欢李白的狂，中年才懂杜甫的苦',
  '他自己淋着雨，却给天下人撑了伞',
  '少不读杜甫，读懂已是书中人',
  '子美千古！',
  '看哭了',
  '课本里只读过一个「国破」',
  '他替整个时代难过',
  '一个人扛下了盛唐的废墟',
  '原来诗史是这么写的',
  '这条船上是整个唐朝的雨',
  '语文老师没讲完的那一页',
  '大唐欠他一句谢谢',
  '读到「家书抵万金」就破防',
  '他不是圣人，是被生活按着写诗的人',
  '广厦千万间，没有一间是他的',
  '小朋友们，背完诗请记住他',
  '这大概就是文人的骨头',
  '杜甫从来没有过时',
  '千百年后终于有人看见他',
  '评论区比课本更懂他',
  '他把小儿子饿死的那年，写下了朱门酒肉臭',
  '从长安走到湘江，走了 4,739 公里',
  '这条视频我一秒都没快进',
  '算法终于做对了一件事',
  '他不红，天理难容',
  '大唐的诗史，今天补上了',
  '看完想去成都看看草堂',
  '少陵野老，编号 770',
  '诗圣不是封的，是一步步走出来的',
  '他替寒士求房，自己死在船上',
  '一条小船，载着 1,455 首诗',
  '前 5 秒的安静，我舍不得跳过',
  '这才是顶流',
];

let DATA = null;

function buildData() {
  if (DATA) return DATA;
  const r = mulberry32(1955);
  const c = KIT.makeCanvas(32, 32);
  const meas = c.getContext('2d');
  const list = [];
  for (let i = 0; i < 260; i++) {
    const text = COMMENTS[i % COMMENTS.length];
    const lane = i % 17;
    const size = 12.5 + r() * 5.8;
    meas.font = `500 ${size}px "Noto Serif SC", serif`;
    const w = meas.measureText(text).width;
    // Start behind the bar-1 hush: the storm is already mid-flight when the
    // bar-2 downbeat hits, so the screen is full on the first frame of bar 2.
    const start = -1.45 + Math.pow(r(), 0.62) * 6.0;
    const speed = 95 + r() * 105;
    list.push({
      text, lane, size, w, start, speed,
      color: r() < 0.13 ? '#ffd2b0' : r() < 0.35 ? '#f6d58a' : r() < 0.8 ? 'rgba(245,240,229,0.9)' : 'rgba(205,224,210,0.86)',
      alpha: 0.28 + r() * 0.48,
      badge: i % 41 === 0,
    });
  }
  const hearts = [];
  for (let i = 0; i < 44; i++) {
    hearts.push({ x: r() * 500 + 20, y: 820 + r() * 90, sp: 23 + r() * 50, delay: r() * 2.2, s: 4 + r() * 7, ph: r() * TAU });
  }
  const bokeh = [];
  for (let i = 0; i < 18; i++) bokeh.push({ x: r() * W, y: r() * H, r: 14 + r() * 80, a: 0.015 + r() * 0.04 });
  DATA = { list, hearts, bokeh };
  return DATA;
}

function comma(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function likeValue(u) {
  const p = clamp01((u - 1.35) / 4.15);
  // A single monotone curve: 10w+ at the start, 1,455w+ at full time.
  return 10 * Math.pow(145.5, p);
}

function likeLabel(u) {
  const v = likeValue(u);
  if (v < 100) return `${Math.round(v)}w+`;
  return `${comma(v)}w+`;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawAmbient(ctx, u) {
  const frost = KIT.layer('scene17:frost', W, H, (c) => {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b0b10');
    g.addColorStop(0.45, '#171720');
    g.addColorStop(1, '#09090d');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const r = mulberry32(1717);
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = r() * H, rad = 60 + r() * 260;
      const gg = c.createRadialGradient(x, y, 0, x, y, rad);
      gg.addColorStop(0, i % 3 === 0 ? 'rgba(255,92,76,0.07)' : 'rgba(106,137,168,0.08)');
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gg; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill();
    }
    const grain = KIT.grainLayer(480, 270, 1717, { amp: 0.16 });
    c.globalAlpha = 0.36; c.drawImage(grain, 0, 0, W, H); c.globalAlpha = 1;
  });
  ctx.drawImage(frost, 0, 0);
  // giant out-of-focus comments drifting behind glass
  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.font = `600 74px "Noto Serif SC", serif`;
  ctx.fillStyle = '#e8deca';
  const rows = [
    ['年少喜欢李白的狂', 180, -1], ['他自己淋着雨', 420, 1], ['少不读杜甫', 690, -1], ['子美千古！', 900, 1],
  ];
  rows.forEach(([text, y, dir], i) => {
    const x = ((u * 18 * dir + i * 680) % 2200) - 180;
    ctx.fillText(text, x, y);
  });
  ctx.restore();
  // giant heart watermark
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.translate(W * 0.8, H * 0.42);
  const pulse = 1 + 0.03 * Math.sin(u * Math.PI * 2);
  ctx.scale(8 * pulse, 8 * pulse);
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.bezierCurveTo(-46, -4, -34, -40, 0, -18);
  ctx.bezierCurveTo(34, -40, 46, -4, 0, 26);
  ctx.fill();
  ctx.restore();
  // bokeh
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const b of buildData().bokeh) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, `rgba(184,161,126,${b.a})`);
    g.addColorStop(1, 'rgba(184,161,126,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // outside technical labels
  ctx.save();
  ctx.fillStyle = 'rgba(231,219,194,0.34)';
  ctx.font = '500 9px "Cascadia Mono", monospace';
  ctx.letterSpacing = '2px';
  ctx.fillText('ALGORITHM FEED · 09:16', 86, 990);
  ctx.fillText('ONE BOAT / ONE DYNASTY', 86, 1008);
  ctx.textAlign = 'right';
  ctx.fillText('1080 × 1920 · 60 FPS', W - 86, 990);
  ctx.fillText('NO REAL APP MARKS', W - 86, 1008);
  ctx.restore();
}

function drawVideo(ctx, u) {
  const pw = PHONE.w, ph = PHONE.h;
  ctx.save();
  // The short-video image itself: dusk on the Xiang.
  const sky = ctx.createLinearGradient(0, 0, 0, ph);
  sky.addColorStop(0, '#1b2532');
  sky.addColorStop(0.36, '#5a4a44');
  sky.addColorStop(0.54, '#aa624b');
  sky.addColorStop(0.66, '#3e403d');
  sky.addColorStop(1, '#0a1918');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, pw, ph);
  const push = 1.015 + 0.025 * smoothstep(0, 5.6, u);
  ctx.translate(pw / 2, ph / 2);
  ctx.scale(push, push);
  ctx.translate(-pw / 2, -ph / 2);
  // low sun / moon glow
  const sunX = 380, sunY = 278;
  const sun = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 150);
  sun.addColorStop(0, 'rgba(255,230,172,0.95)');
  sun.addColorStop(0.14, 'rgba(255,202,126,0.5)');
  sun.addColorStop(0.55, 'rgba(207,115,68,0.16)');
  sun.addColorStop(1, 'rgba(164,82,54,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, pw, ph);
  ctx.fillStyle = 'rgba(255,238,197,0.9)';
  ctx.beginPath(); ctx.arc(sunX, sunY, 30, 0, TAU); ctx.fill();
  // cloud bands
  for (let i = 0; i < 8; i++) {
    const y = 235 + i * 35 + Math.sin(u * 0.12 + i) * 5;
    ctx.strokeStyle = `rgba(${28 + i * 4},${31 + i * 3},${37 + i * 2},${0.22 + i * 0.02})`;
    ctx.lineWidth = 14 + i * 8;
    ctx.beginPath(); ctx.moveTo(-20, y);
    for (let x = -20; x <= pw + 20; x += 18) ctx.lineTo(x, y + Math.sin(x * 0.02 + i * 1.7) * 7);
    ctx.stroke();
  }
  // mountains
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = `rgba(${18 + layer * 7},${34 + layer * 8},${34 + layer * 5},${0.58 + layer * 0.13})`;
    ctx.beginPath(); ctx.moveTo(0, 520 + layer * 24);
    for (let x = 0; x <= pw; x += 12) {
      ctx.lineTo(x, 490 + layer * 20 - KIT.fbm1(x * 0.008 + layer * 4, 3, 717) * (100 - layer * 20));
    }
    ctx.lineTo(pw, 620); ctx.lineTo(0, 620); ctx.closePath(); ctx.fill();
  }
  // river
  const river = ctx.createLinearGradient(0, 500, 0, ph);
  river.addColorStop(0, '#3b4944');
  river.addColorStop(0.26, '#142c2c');
  river.addColorStop(1, '#061615');
  ctx.fillStyle = river; ctx.fillRect(0, 500, pw, ph - 500);
  // reflected sun path
  for (let i = 0; i < 46; i++) {
    const y = 512 + i * 9.2;
    const w = 12 + i * 2.4;
    ctx.strokeStyle = `rgba(245,196,129,${0.06 + (1 - i / 46) * 0.2})`;
    ctx.lineWidth = 1 + (i % 4) * 0.5;
    ctx.beginPath(); ctx.moveTo(sunX - w * 0.5, y); ctx.lineTo(sunX + w * 0.5, y + 1); ctx.stroke();
  }
  // water ripples
  for (let i = 0; i < 28; i++) {
    const y = 540 + i * 14;
    const off = Math.sin(u * 0.7 + i) * 12;
    ctx.strokeStyle = 'rgba(169,199,189,0.055)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(30 + off, y); ctx.lineTo(pw - 20 + off, y); ctx.stroke();
  }
  // reeds
  ctx.strokeStyle = 'rgba(8,20,16,0.9)';
  ctx.lineCap = 'round';
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 16; i++) {
      const x = side === 0 ? 18 + i * 6 : pw - 18 - i * 6;
      const h = 90 + unit(717, i, side) * 240;
      const topX = x + (side ? 1 : -1) * (25 + unit(717, i, 3) * 40);
      ctx.lineWidth = 1.2 + unit(717, i, 4) * 2;
      ctx.beginPath(); ctx.moveTo(x, 720); ctx.quadraticCurveTo(x + (side ? -1 : 1) * 12, 720 - h * 0.55, topX, 720 - h); ctx.stroke();
    }
  }
  // bank silhouette
  ctx.fillStyle = 'rgba(3,10,8,0.92)';
  ctx.beginPath(); ctx.moveTo(0, 760);
  for (let x = 0; x <= pw; x += 20) ctx.lineTo(x, 735 - KIT.noise2(x * 0.01, 0.4, 717) * 25);
  ctx.lineTo(pw, ph); ctx.lineTo(0, ph); ctx.closePath(); ctx.fill();
  // boat
  const P = KIT.rig.boatPose({ t: u, phase: u * 1.25 });
  const boat = KIT.rig.placed(P, { x: 258, y: 706, scale: 0.66, rot: 0 });
  for (const p of boat.parts) {
    if (!['boat', 'passenger', 'skin', 'cap', 'oar', 'rope', 'boatman', 'boatman-detail'].includes(p.role)) continue;
    KIT.rig.drawSilhouette(ctx, { parts: [p] }, { color: 'rgba(5,8,6,0.94)' });
  }
  // lantern on the bow, the only human light
  const lg = ctx.createRadialGradient(408, 638, 1, 408, 638, 55);
  lg.addColorStop(0, 'rgba(255,201,112,0.9)');
  lg.addColorStop(0.22, 'rgba(255,173,88,0.26)');
  lg.addColorStop(1, 'rgba(255,160,70,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(408, 638, 60, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,210,130,0.85)'; ctx.fillRect(404, 629, 8, 16);
  // A thin amber rim on the hull, not a second opaque boat.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = 'rgba(232,178,102,0.38)';
  ctx.lineWidth = 1;
  const hullPart = boat.parts.find((p) => p.role === 'boat');
  if (hullPart) {
    ctx.beginPath();
    ctx.moveTo(hullPart.pts[0][0], hullPart.pts[0][1]);
    for (let i = 1; i < hullPart.pts.length; i++) ctx.lineTo(hullPart.pts[i][0], hullPart.pts[i][1]);
    ctx.stroke();
  }
  ctx.restore();
  // drift mist
  ctx.fillStyle = 'rgba(203,205,185,0.035)';
  for (let i = 0; i < 12; i++) {
    const y = 480 + i * 19;
    ctx.beginPath(); ctx.ellipse(260 + i * 7, y, 190, 10, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // video grade / vignette
  const v = ctx.createRadialGradient(pw / 2, ph * 0.48, 80, pw / 2, ph * 0.5, 600);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(4,6,6,0.56)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, pw, ph);
  // top and bottom scrims for UI
  const top = ctx.createLinearGradient(0, 0, 0, 220);
  top.addColorStop(0, 'rgba(2,4,5,0.76)');
  top.addColorStop(1, 'rgba(2,4,5,0)');
  ctx.fillStyle = top; ctx.fillRect(0, 0, pw, 220);
  const bot = ctx.createLinearGradient(0, ph - 300, 0, ph);
  bot.addColorStop(0, 'rgba(2,4,5,0)');
  bot.addColorStop(0.65, 'rgba(2,4,5,0.62)');
  bot.addColorStop(1, 'rgba(2,4,5,0.92)');
  ctx.fillStyle = bot; ctx.fillRect(0, ph - 300, pw, 300);
  // film grain
  const grain = KIT.layer('scene17:grain', 270, 480, (c) => KIT.grainLayer(270, 480, 1717, { amp: 0.13 }));
  ctx.save(); ctx.globalAlpha = 0.18; ctx.globalCompositeOperation = 'screen'; ctx.drawImage(grain, 0, 0, pw, ph); ctx.restore();
  // tiny video label
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#f3e8d2';
  ctx.font = '500 8px "Cascadia Mono", monospace';
  ctx.fillText('湘江 · 大曆五年冬 · 原片 4,739 KM', 18, 88);
  ctx.restore();
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.6, y - s * 0.14, x - s * 0.42, y - s * 0.58, x, y - s * 0.2);
  ctx.bezierCurveTo(x + s * 0.42, y - s * 0.58, x + s * 0.6, y - s * 0.14, x, y + s * 0.3);
  ctx.closePath();
}

function drawUI(ctx, u) {
  const pw = PHONE.w, ph = PHONE.h;
  // status bar
  ctx.save();
  ctx.fillStyle = 'rgba(247,241,231,0.9)';
  ctx.font = '600 10px "Cascadia Mono", monospace';
  ctx.fillText('21:47', 18, 28);
  ctx.fillStyle = 'rgba(247,241,231,0.8)';
  for (let i = 0; i < 4; i++) ctx.fillRect(449 + i * 5, 25 - i * 2, 3, 4 + i * 2);
  ctx.strokeStyle = 'rgba(247,241,231,0.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(483, 23, 5, -0.9, 0.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(483, 23, 2.2, -0.9, 0.9); ctx.stroke();
  ctx.strokeStyle = 'rgba(247,241,231,0.55)';
  ctx.strokeRect(500, 16, 22, 11);
  ctx.fillStyle = 'rgba(247,241,231,0.75)'; ctx.fillRect(502, 18, 14, 7);
  ctx.fillStyle = 'rgba(247,241,231,0.55)'; ctx.fillRect(523, 19, 2, 5);
  ctx.restore();
  // top nav
  ctx.save();
  ctx.textAlign = 'center';
  KIT.drawText(ctx, '关注', 256, 67, { size: 15, font: KIT.FONT.serif, weight: 500, color: 'rgba(245,238,225,0.62)', align: 'center', letterSpacing: 1 });
  KIT.drawText(ctx, '推荐', 334, 67, { size: 16, font: KIT.FONT.serif, weight: 700, color: '#fff8eb', align: 'center', letterSpacing: 1 });
  ctx.fillStyle = RED; ctx.fillRect(320, 81, 28, 2.5);
  // search
  ctx.strokeStyle = 'rgba(245,238,225,0.78)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(480, 61, 8, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(486, 67); ctx.lineTo(495, 76); ctx.stroke();
  // little app mark
  ctx.fillStyle = 'rgba(255,246,230,0.72)';
  ctx.font = '500 9px "Cascadia Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('詩箋 / FEED', 18, 67);
  ctx.restore();

  // The storm sits under the rails: interface stays legible.
  drawDanmaku(ctx, u);

  // right action rail
  const railX = pw - 42;
  ctx.save();
  // avatar
  ctx.beginPath(); ctx.arc(railX, 436, 20, 0, TAU); ctx.fillStyle = '#d9c19a'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,245,229,0.9)'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = '#3c2a1c';
  ctx.font = '700 18px "Noto Serif SC", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('杜', railX, 438);
  ctx.fillStyle = RED;
  ctx.beginPath(); ctx.arc(railX, 460, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 9px "Cascadia Mono", monospace'; ctx.fillText('+', railX, 461);

  // heart
  const beat = Math.max(0, Math.floor((u - 1.3) * 4));
  const pulse = 1 + 0.03 * Math.sin(u * Math.PI * 8);
  const explode = smoothstep(1.35, 2.1, u);
  ctx.save();
  ctx.translate(railX, 531);
  ctx.scale(pulse, pulse);
  heartPath(ctx, 0, 0, 25);
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.globalAlpha = 0.28 + 0.2 * Math.sin(u * 6);
  ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  KIT.drawText(ctx, likeLabel(u), railX, 567, { size: 14, font: KIT.FONT.mono, weight: 700, color: explode > 0.4 ? '#ffced0' : '#f7efe1', align: 'center', letterSpacing: -0.2, mark: 's17-likes' });
  // comments
  ctx.strokeStyle = 'rgba(246,238,225,0.9)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(railX - 1, 607, 11, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(railX - 8, 615); ctx.lineTo(railX - 11, 621); ctx.lineTo(railX - 4, 617); ctx.stroke();
  ctx.fillStyle = 'rgba(244,237,225,0.72)'; ctx.font = '500 9px "Cascadia Mono", monospace'; ctx.textAlign = 'center';
  ctx.fillText('1.2w', railX, 636);
  // save
  ctx.strokeStyle = 'rgba(246,238,225,0.85)';
  ctx.beginPath();
  ctx.moveTo(railX - 9, 666); ctx.lineTo(railX - 9, 689); ctx.lineTo(railX, 681); ctx.lineTo(railX + 9, 689); ctx.lineTo(railX + 9, 666); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = 'rgba(244,237,225,0.72)';
  ctx.fillText('3,517', railX, 707);
  // vinyl record
  ctx.beginPath(); ctx.arc(railX, 749, 16, 0, TAU); ctx.fillStyle = '#171716'; ctx.fill();
  ctx.strokeStyle = 'rgba(246,238,225,0.45)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.arc(railX, 749, 5, 0, TAU); ctx.fillStyle = '#cdb287'; ctx.fill();
  ctx.restore();

  // likes burst hearts
  const hearts = buildData().hearts;
  ctx.save();
  for (const h of hearts) {
    const p = clamp01((u - 1.5 - h.delay) / 2.2);
    if (p <= 0 || p >= 1) continue;
    const x = h.x + Math.sin(u * 1.7 + h.ph) * 14;
    const y = h.y - p * 260;
    ctx.globalAlpha = (1 - p) * 0.65;
    heartPath(ctx, x, y, h.s);
    ctx.fillStyle = '#ff4d62';
    ctx.fill();
  }
  ctx.restore();

  // featured comment cards
  drawFeatured(ctx, u);
  // bottom caption block
  ctx.save();
  const capA = 0.92;
  ctx.globalAlpha = capA;
  KIT.drawText(ctx, '@少陵野老', 20, 802, { size: 15, font: KIT.FONT.serif, weight: 700, color: '#f8f1e4', letterSpacing: 0.5 });
  KIT.drawText(ctx, '湘江上，最后一个冬天。', 20, 833, { size: 13.5, font: KIT.FONT.serif, weight: 500, color: 'rgba(247,239,226,0.88)', letterSpacing: 0.8 });
  KIT.drawText(ctx, '他把一生的雨，写成了别人的屋檐。', 20, 857, { size: 12.5, font: KIT.FONT.serif, weight: 400, color: 'rgba(235,224,207,0.65)', letterSpacing: 0.5 });
  // music ticker
  ctx.fillStyle = 'rgba(244,237,225,0.8)';
  ctx.beginPath(); ctx.arc(28, 888, 6, 0, TAU); ctx.strokeStyle = 'rgba(244,237,225,0.6)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, 888); ctx.lineTo(30, 880); ctx.lineTo(35, 879); ctx.lineTo(35, 884); ctx.stroke();
  KIT.drawText(ctx, '原声 · 五声羽调 · 全部由代码合成', 43, 891, { size: 10, font: KIT.FONT.mono, color: 'rgba(244,237,225,0.6)', letterSpacing: 0.2 });
  ctx.restore();

  // progress bar at the very bottom
  const prog = clamp01((u - 1.1) / 4.65);
  ctx.save();
  ctx.fillStyle = 'rgba(250,244,233,0.16)';
  ctx.fillRect(18, ph - 22, pw - 36, 2);
  ctx.fillStyle = 'rgba(255,57,83,0.92)';
  ctx.fillRect(18, ph - 22, (pw - 36) * prog, 2);
  ctx.fillStyle = '#ffdfe2';
  ctx.beginPath(); ctx.arc(18 + (pw - 36) * prog, ph - 21, 2.2, 0, TAU); ctx.fill();
  // tiny transport
  ctx.fillStyle = 'rgba(250,244,233,0.7)';
  ctx.beginPath(); ctx.moveTo(18, ph - 34); ctx.lineTo(18, ph - 28); ctx.lineTo(23, ph - 31); ctx.fill();
  ctx.fillRect(26, ph - 34, 1.4, 6); ctx.fillRect(30, ph - 34, 1.4, 6);
  KIT.drawText(ctx, '进度 100% 时，下一格自动打开', pw - 18, ph - 32, { size: 8, font: KIT.FONT.mono, color: 'rgba(246,238,224,0.45)', align: 'right', letterSpacing: 0.2 });
  ctx.restore();
  // progress-full crack / flash
  if (u > 5.6) {
    const p = smoothstep(5.6, 5.9, u);
    ctx.save();
    ctx.globalAlpha = p * 0.4;
    ctx.strokeStyle = '#fff0dd';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pw / 2 - 4, 0);
    let yy = 0, xx = pw / 2 - 4;
    const rr = mulberry32(1718);
    while (yy < ph) { yy += 20 + rr() * 30; xx += (rr() - 0.5) * 26; ctx.lineTo(xx, yy); }
    ctx.stroke();
    ctx.fillStyle = `rgba(255,245,228,${0.06 + p * 0.2})`;
    ctx.fillRect(0, 0, pw, ph);
    ctx.restore();
  }
  markText('s17-caption', '湘江上，最后一个冬天。', 20, 790, 500, 100, { size: 13.5 });
}

function drawDanmaku(ctx, u) {
  if (u < 2.0) return;
  const pw = PHONE.w, ph = PHONE.h;
  const data = buildData();
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 98, pw, 700); ctx.clip();
  for (const d of data.list) {
    if (u < d.start) continue;
    const elapsed = u - d.start;
    const x = pw + 24 - elapsed * d.speed;
    if (x > pw + 20 || x + d.w < -20) continue;
    const y = 118 + d.lane * 36 + Math.sin(d.start * 10) * 3;
    if (y > 764) continue;
    ctx.font = `500 ${d.size}px "Noto Serif SC", serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = d.alpha * (1 - smoothstep(5.3, 5.9, u) * 0.3);
    if (d.badge) {
      const bw = Math.max(8, Math.min(d.w + 14, pw - x + 14));
      const bh = d.size * 1.44;
      if (bw > 12 && bh > 2) {
        ctx.fillStyle = 'rgba(7,9,12,0.52)';
        roundRect(ctx, x - 7, y - bh / 2, bw, bh, Math.min(8, bh / 2));
        ctx.fill();
      }
    }
    ctx.lineWidth = Math.max(1.8, d.size * 0.12);
    ctx.strokeStyle = 'rgba(3,5,6,0.62)';
    ctx.strokeText(d.text, x, y);
    ctx.fillStyle = d.color;
    ctx.fillText(d.text, x, y);
  }
  ctx.restore();
  // a few small floating hearts inside the feed
  ctx.save();
  ctx.globalAlpha = 0.75;
  for (let i = 0; i < 9; i++) {
    const p = clamp01((u - 2 - i * 0.34) / 2.6);
    if (p <= 0 || p >= 1) continue;
    for (const [ox, oy, s] of [[44 + i * 46, 744 - p * 180, 3 + (i % 3) * 2]]) {
      heartPath(ctx, ox, oy + Math.sin(u * 3 + i) * 8, s);
      ctx.fillStyle = `rgba(255,74,94,${(1 - p) * 0.5})`;
      ctx.fill();
    }
  }
  ctx.restore();
  void ph;
}

function drawFeatured(ctx, u) {
  const current = FEATURED.find((f) => u >= f.t0 && u < f.t1);
  if (!current) return;
  const p = smoothstep(current.t0, current.t0 + 0.16, u) * (1 - smoothstep(current.t1 - 0.16, current.t1, u));
  const pw = PHONE.w;
  const big = current.size > 30;
  const w = Math.min(480, KIT.measure(ctx, current.text, { size: current.size, font: KIT.FONT.serif, weight: 600 }) + 46);
  const h = big ? 74 : 58;
  const x = (pw - w) / 2;
  const y = big ? 520 : 486;
  ctx.save();
  ctx.globalAlpha = p;
  const slide = (1 - easeOutCubic(clamp01((u - current.t0) / 0.24))) * 28;
  ctx.translate(0, slide);
  ctx.fillStyle = 'rgba(8,9,11,0.9)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,77,98,0.72)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.fillRect(x, y + 13, 3, h - 26);
  KIT.drawText(ctx, current.text, x + 22, y + (big ? 36 : 27), {
    size: current.size, font: KIT.FONT.serif, weight: big ? 700 : 600, color: '#fbf3e5', letterSpacing: 0.5, align: 'left',
  });
  KIT.drawText(ctx, `${current.user} · 刚刚`, x + 23, y + h - 12, {
    size: 8, font: KIT.FONT.mono, color: 'rgba(245,236,222,0.46)', letterSpacing: 0.7,
  });
  ctx.restore();
  markText('s17-featured', current.text, x, y, w, h, { size: current.size, align: 'center' });
}

function drawPhone(ctx, u) {
  const pw = PHONE.w, ph = PHONE.h;
  const px = (W - pw) / 2, py = PHONE.y;
  ctx.save();
  // ambient halo
  const halo = ctx.createRadialGradient(W / 2, PHONE.y + ph / 2, 100, W / 2, PHONE.y + ph / 2, 560);
  halo.addColorStop(0, 'rgba(255,93,80,0.11)');
  halo.addColorStop(0.55, 'rgba(96,120,150,0.05)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
  // shadow / bezel
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 64;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = '#050608';
  roundRect(ctx, px - 10, py - 10, pw + 20, ph + 20, 34);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(226,203,170,0.26)';
  ctx.lineWidth = 1;
  roundRect(ctx, px - 8.5, py - 8.5, pw + 17, ph + 17, 32);
  ctx.stroke();
  // screen
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 28);
  ctx.clip();
  ctx.translate(px, py);
  drawVideo(ctx, u);
  drawUI(ctx, u);
  ctx.restore();
  // phone notch / speaker
  ctx.fillStyle = '#050608';
  roundRect(ctx, px + pw / 2 - 45, py + 9, 90, 20, 10);
  ctx.fill();
  ctx.fillStyle = '#11151a';
  ctx.beginPath(); ctx.arc(px + pw / 2 + 32, py + 19, 3.2, 0, TAU); ctx.fill();
  // edge highlight
  ctx.strokeStyle = 'rgba(255,240,218,0.13)';
  ctx.lineWidth = 1.2;
  roundRect(ctx, px + 2, py + 2, pw - 4, ph - 4, 26);
  ctx.stroke();
  ctx.restore();
  return { px, py };
}

export function renderAt(ctx, u, beat, env = {}) {
  buildData();
  drawAmbient(ctx, u);
  const phone = drawPhone(ctx, u);
  // The scene's external caption: the media shift itself.
  ctx.save();
  ctx.globalAlpha = 0.46;
  KIT.drawText(ctx, '竖屏 · 推荐流 · 一次全民重读', W / 2, 1038, { size: 9, font: KIT.FONT.mono, color: 'rgba(237,224,201,0.4)', align: 'center', letterSpacing: 2.4 });
  ctx.restore();
  // on-beat heart shock ring around the phone
  if (u >= 1.4) {
    const beatPhase = (u / 0.5) % 1;
    const a = Math.pow(1 - beatPhase, 7) * 0.35;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,62,87,0.45)';
    ctx.lineWidth = 2;
    roundRect(ctx, phone.px - 14, phone.py - 14, PHONE.w + 28, PHONE.h + 28, 38);
    ctx.stroke();
    ctx.restore();
  }
  // grain / frame
  const grain = KIT.layer('scene17:outergrain', 480, 270, (c) => KIT.grainLayer(480, 270, 717, { amp: 0.09 }));
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.11; ctx.drawImage(grain, 0, 0, W, H); ctx.restore();
  markText('s17-likes-text', likeLabel(u), 1410, 560, 220, 40, { size: 14, align: 'right' });
  void beat; void env;
}
