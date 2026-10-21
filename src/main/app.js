/**
 * app.js — browser entry point. Owns the canvas, loads fonts, exposes a tiny
 * deterministic API for the preview UI and the Playwright tools:
 *
 *   await window.renderAt(t)    prepare async assets, paint film time t
 *   window.renderFrame(frame)   paint 60 fps frame n synchronously
 *   window.seek(t)              paint t synchronously
 *   window.__DFT.selfCheck()    structural assertions
 *   window.__DFT.frame          last rendered frame metadata
 */
import {
  FPS, DURATION, FRAMES, N_SCENES, SCENE_DUR, INTRO, OUTRO_START,
  sceneStart, sectionAt, distanceAt, beatInfo, formatKm,
} from '../beat/clock.js';
import { SCENES } from '../scenes/index.js';
import { SCENE_SPECS } from './manifest.js';
import { Film } from './film.js';
import { snapshot } from '../kit/debug.js';

const HOST = document.getElementById('stage');
if (!HOST) throw new Error('missing #stage');

HOST.width = 1920;
HOST.height = 1080;
const ctx = HOST.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = true;

const film = new Film({ canvas: HOST, scenes: SCENES, specs: SCENE_SPECS });
let ready = false;
let fatal = null;

function disposeLoading() {
  const l = document.getElementById('loading');
  if (!l) return;
  const renderMode = new URLSearchParams(location.search).has('render') || document.body.classList.contains('render-mode');
  if (renderMode) { l.remove(); return; }
  l.classList.add('is-done');
  setTimeout(() => l.remove(), 520);
}

async function loadFonts() {
  const families = [
    ['Noto Serif SC', '400 48px "Noto Serif SC"'],
    ['Source Han Serif SC', '700 48px "Source Han Serif SC"'],
    ['Ma Shan Zheng', '400 48px "Ma Shan Zheng"'],
    ['LXGW WenKai', '400 32px "LXGW WenKai"'],
    ['STKaiti', '400 32px "STKaiti"'],
  ];
  const jobs = [];
  for (const [, spec] of families) {
    try { jobs.push(document.fonts.load(spec, '杜甫少陵测试詩史')); } catch (e) { /* keep going */ }
  }
  await Promise.allSettled(jobs);
  await document.fonts.ready;
}

function parseTime() {
  const q = new URLSearchParams(location.search);
  if (q.has('t')) {
    const t = parseFloat(q.get('t'));
    if (Number.isFinite(t)) return Math.max(0, Math.min(DURATION, t));
  }
  return 0;
}

function updateReadout() {
  const frame = window.__DFT?.frame;
  if (!frame) return;
  window.__DFT_LAST_FRAME = frame;
  window.DEBUG_STATE = {
    ...(window.DEBUG_STATE || {}),
    frame: frame.frame,
    t: frame.t,
    section: frame.section,
    distance: frame.distance,
    texts: frame.texts,
    hud: frame.hud,
    eraCard: frame.eraCard,
    error: frame.error,
  };
  document.dispatchEvent(new CustomEvent('dft-frame', { detail: frame }));
}

const api = {
  get ready() { return ready; },
  get fatal() { return fatal; },
  film,
  FPS, DURATION, FRAMES, N_SCENES,
  manifest: SCENE_SPECS,
  scenes: SCENES.map((s) => ({ index: s.index, no: s.no, id: s.id, zh: s.zh, en: s.en, year: s.year, style: s.style, transition: s.transition })),
  seek(t) {
    if (!ready && fatal) return null;
    const safe = Math.max(0, Math.min(DURATION, Number(t) || 0));
    const res = film.render(safe);
    updateReadout();
    return res;
  },
  renderFrame(frame) {
    return api.seek((Number(frame) || 0) / FPS);
  },
  async renderAt(t) {
    const safe = Math.max(0, Math.min(DURATION, Number(t) || 0));
    await film.prepare(safe);
    return api.seek(safe);
  },
  async prepare(t) {
    await film.prepare(Number(t) || 0);
  },
  async warmTiles() {
    await film.warmTiles();
  },
  get frame() { return window.__DFT_LAST_FRAME || null; },
  debug() { return snapshot(); },
  selfCheck() {
    return film.selfCheck();
  },
  metaAt(t) {
    const safe = Math.max(0, Math.min(DURATION, Number(t) || 0));
    const section = sectionAt(safe);
    return {
      t: safe, section,
      scene: section >= 0 && section < N_SCENES ? SCENE_SPECS[section] : null,
      local: section < 0 ? safe : section >= N_SCENES ? safe - OUTRO_START : safe - sceneStart(section),
      distance: distanceAt(safe),
      formatted: formatKm(distanceAt(safe)),
      beat: beatInfo(safe),
    };
  },
  timecode(t) { return api.metaAt(t); },
};
window.__DFT = api;
window.DURATION = DURATION;
window.FPS = FPS;
window.SCENE_SPECS = SCENE_SPECS;
window.SCENE_DURATION = SCENE_DUR;

window.seek = api.seek;
window.renderFrame = api.renderFrame;
window.renderAt = api.renderAt;

async function boot() {
  try {
    await loadFonts();
    // First paint: warm the paper and fonts before marking ready.
    film.render(parseTime());
    updateReadout();
    ready = true;
    window.READY = true;
    window.__READY = true;
    document.body.classList.add('is-ready');
    disposeLoading();
    document.dispatchEvent(new CustomEvent('dft-ready', { detail: { duration: DURATION, fps: FPS, scenes: api.scenes } }));
    // Generate the 18 contact prints while the viewer settles. Render tools
    // call prepare() explicitly before seeking into the outro.
    setTimeout(() => { film.warmTiles().catch((e) => console.warn('[tiles]', e)); }, 1800);
  } catch (e) {
    fatal = String(e && (e.stack || e.message) || e);
    window.__FATAL = fatal;
    window.READY = false;
    console.error(e);
    const el = document.getElementById('fatal');
    if (el) { el.textContent = fatal; el.hidden = false; }
    const l = document.getElementById('loading');
    if (l) l.textContent = '帧启动失败';
    document.body.classList.add('has-fatal');
  }
}

boot();
