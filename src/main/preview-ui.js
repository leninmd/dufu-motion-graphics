/**
 * preview-ui.js — the inspection-bench shell around the film.
 * The film owns the pixels; this file owns transport, the 18 era ticks,
 * timecode, beat lamp and the Web Audio ↔ picture clock.
 */
import '../main/app.js';
import '../../audio/preview-audio.js';

const $ = (id) => document.getElementById(id);
const stageWrap = $('stage-wrap');
const stageIdle = $('stage-idle');
const seek = $('seek');
const scrub = $('scrub');
const eraTicks = $('era-ticks');
const btnPlay = $('btn-play');
const iconPlay = $('icon-play');
const iconPause = $('icon-pause');
const btnSound = $('btn-sound');
const volume = $('volume');
const soundState = $('sound-state');
const beatLamp = $('beat-lamp');
const timeNow = $('time-now');
const nowNo = $('now-no');
const nowTitle = $('now-title');
const nowSub = $('now-sub');
const barReadout = $('bar-readout');
const metaDistance = $('meta-distance');

const TOTAL = 138;
const BOUNDARIES = Array.from({ length: 18 }, (_, i) => 6 + i * 6);
let api = null;
let specs = [];
let state = { t: 0, section: -1, playing: false, muted: false, volume: 0.8 };
let audio = null;
let audioTried = false;
let playStart = 0;
let playOrigin = 0;
let raf = 0;
let scrubbing = false;
let resumeAfterScrub = false;

function fmt(t, frames = true) {
  const safe = Math.max(0, Math.min(TOTAL, t));
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  if (!frames) return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const f = Math.min(59, Math.floor((safe % 1) * 60));
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

function sectionInfo(section) {
  if (!specs.length) return { no: '序', title: '一本正经的史料反差', sub: 'PROLOGUE · 00:00–00:06' };
  if (section < 0) {
    return {
      no: '序',
      title: '一本正经的史料反差',
      sub: 'PROLOGUE · 00:00–00:06 · 0 KM',
    };
  }
  if (section >= 18) {
    return {
      no: '终',
      title: '大唐历史发布会 · 十九格长卷',
      sub: 'FINALE · 01:54–02:18 · 4,739 KM',
    };
  }
  const s = specs[section];
  return {
    no: s.no,
    title: s.zh,
    sub: `${s.en.toUpperCase()} · ${s.year} · ${String(Math.round(metaAt(state.t).distance)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} KM`,
  };
}

function metaAt(t) {
  if (api?.metaAt) return api.metaAt(t);
  const section = t < 6 ? -1 : t >= 114 ? 18 : Math.floor((t - 6) / 6);
  return { section, distance: 0 };
}

function buildTicks() {
  eraTicks.innerHTML = '';
  for (let i = 0; i < 18; i++) {
    const t = 6 + i * 6;
    const el = document.createElement('span');
    el.className = 'tick major';
    el.style.left = `${(t / TOTAL) * 100}%`;
    const spec = specs[i];
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = spec ? `${spec.no} ${spec.zh}` : String(i + 1);
    el.appendChild(lbl);
    eraTicks.appendChild(el);
  }
  for (let b = 2; b < 138; b += 2) {
    if (b % 6 === 0) continue;
    const el = document.createElement('span');
    el.className = 'tick';
    el.style.left = `${(b / TOTAL) * 100}%`;
    eraTicks.appendChild(el);
  }
}

function updateButton() {
  iconPlay.classList.toggle('is-hidden', state.playing);
  iconPause.classList.toggle('is-hidden', !state.playing);
  btnPlay.setAttribute('aria-label', state.playing ? '暂停' : '播放');
  stageWrap.classList.toggle('is-idle', !state.playing);
}

function updateUI(t, section, frameMeta = null) {
  state.t = Math.max(0, Math.min(TOTAL, t));
  state.section = section;
  const pct = (state.t / TOTAL) * 100;
  seek.value = String(state.t);
  scrub.style.setProperty('--progress', `${pct}%`);
  const info = sectionInfo(section);
  nowNo.textContent = info.no;
  nowTitle.textContent = info.title;
  nowSub.textContent = info.sub;
  timeNow.textContent = fmt(state.t);
  const frame = Math.round(state.t * 60);
  seek.setAttribute('aria-valuetext', `${fmt(state.t)}，${info.title}`);
  const beat = Math.floor(state.t / 0.5 + 1e-6);
  const phase = state.t / 0.5 - Math.floor(state.t / 0.5 + 1e-6);
  const bar = Math.floor(beat / 4) + 1;
  barReadout.textContent = `BAR ${String(bar).padStart(2, '0')} · BEAT ${(beat % 4) + 1} · F ${String(frame).padStart(5, '0')}`;
  beatLamp.classList.toggle('on', phase < 0.16);
  const dist = frameMeta?.distance ?? api?.metaAt?.(state.t)?.distance ?? 0;
  metaDistance.textContent = `${String(Math.round(dist)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} KM`;
}

function setSoundState(text, cls = '') {
  soundState.textContent = text;
  soundState.className = 'sound-state ' + cls;
}

async function ensureAudio() {
  if (audio || audioTried) return audio;
  audioTried = true;
  if (!window.__DFT_AUDIO) {
    setSoundState('预览为静音 · 配乐模块将在全量导出时合成');
    return null;
  }
  try {
    setSoundState('正在用 Web Audio 合成 138 秒配乐…');
    await window.__DFT_AUDIO.ensure();
    audio = window.__DFT_AUDIO;
    audio.setVolume(state.muted ? 0 : state.volume);
    setSoundState('配乐已就绪 · 五声羽调 · 18 种时代音色', 'ready');
    return audio;
  } catch (e) {
    console.error('[audio]', e);
    setSoundState('配乐合成失败 · 画面继续静音播放', 'error');
    return null;
  }
}

function audioTime() {
  return audio && audio.isReady() ? audio.currentTime() : null;
}

function seekTo(t, { fromScrub = false } = {}) {
  const target = Math.max(0, Math.min(TOTAL, t));
  if (audio && audio.isReady()) {
    audio.seek(target);
    if (state.playing) audio.play();
  }
  const res = api.seek(target);
  const meta = api.metaAt(target);
  updateUI(target, res?.section ?? meta.section, { distance: meta.distance });
  state.playing = state.playing && !fromScrub ? state.playing : state.playing;
  if (target > 112.4) {
    // The contact prints for the final wall are async; redraw when they land.
    api.renderAt(target).then(() => {
      const res2 = api.seek(api.frame?.t ?? target);
      if (res2) updateUI(target, res2.section, api.frame);
    }).catch(() => {});
  }
}

function startClock() {
  playOrigin = state.t;
  playStart = performance.now();
  if (state.t >= TOTAL - 0.01) seekTo(0);
  playOrigin = state.t;
  playStart = performance.now();
  if (audio && audio.isReady()) {
    audio.seek(state.t);
    audio.play();
  }
  state.playing = true;
  updateButton();
  cancelAnimationFrame(raf);
  const tick = () => {
    if (!state.playing) return;
    const at = audioTime();
    const t = at != null ? at : playOrigin + (performance.now() - playStart) / 1000;
    if (t >= TOTAL) {
      seekTo(TOTAL);
      pause();
      return;
    }
    const res = api.seek(t);
    const meta = api.metaAt(t);
    updateUI(t, res?.section ?? meta.section, { distance: meta.distance });
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

function pause() {
  state.playing = false;
  cancelAnimationFrame(raf);
  if (audio && audio.isReady()) audio.pause();
  updateButton();
}

async function play() {
  await ensureAudio();
  if (audio && audio.isReady()) audio.setVolume(state.muted ? 0 : state.volume);
  startClock();
}

function togglePlay() {
  if (state.playing) pause(); else play();
}

function gotoSection(dir) {
  const sec = api.metaAt(state.t).section;
  let target = state.t;
  if (dir < 0) {
    if (sec <= 0) target = 0;
    else if (sec >= 18) target = 114;
    else target = 6 + (sec - 1) * 6;
  } else {
    if (sec < 0) target = 6;
    else if (sec >= 17) target = 114;
    else target = 6 + (sec + 1) * 6;
  }
  seekTo(target + 0.001);
  if (state.playing) {
    playStart = performance.now();
    playOrigin = state.t;
    if (audio && audio.isReady()) { audio.seek(state.t); audio.play(); }
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
    document.body.classList.add('is-fullscreen');
  } else {
    document.exitFullscreen?.().catch(() => {});
    document.body.classList.remove('is-fullscreen');
  }
}

function toggleMute() {
  state.muted = !state.muted;
  btnSound.style.opacity = state.muted ? '0.4' : '1';
  if (audio?.setVolume) audio.setVolume(state.muted ? 0 : state.volume);
  setSoundState(state.muted ? '静音' : (audio?.isReady() ? '配乐已就绪 · 五声羽调 · 18 种时代音色' : '预览为静音 · 配乐模块将在全量导出时合成'), audio?.isReady() && !state.muted ? 'ready' : '');
}

// ---------------------------------------------------------------- events
btnPlay.addEventListener('click', togglePlay);
$('btn-prev').addEventListener('click', () => gotoSection(-1));
$('btn-next').addEventListener('click', () => gotoSection(1));
$('btn-restart').addEventListener('click', () => { seekTo(0); if (state.playing) { playStart = performance.now(); playOrigin = 0; if (audio?.isReady()) { audio.seek(0); audio.play(); } } });
btnSound.addEventListener('click', toggleMute);
$('btn-fullscreen')?.addEventListener('click', toggleFullscreen);
volume.addEventListener('input', () => {
  state.volume = +volume.value;
  if (audio?.setVolume) audio.setVolume(state.muted ? 0 : state.volume);
});

seek.addEventListener('pointerdown', () => {
  scrubbing = true;
  resumeAfterScrub = state.playing;
  pause();
});
seek.addEventListener('input', () => {
  const t = +seek.value;
  seekTo(t, { fromScrub: true });
});
const endScrub = () => {
  if (!scrubbing) return;
  scrubbing = false;
  api.renderAt(+seek.value).then(() => seekTo(+seek.value)).catch(() => {});
  if (resumeAfterScrub) play();
};
seek.addEventListener('pointerup', endScrub);
seek.addEventListener('change', endScrub);
seek.addEventListener('pointercancel', endScrub);

document.addEventListener('dft-frame', (e) => {
  // Playback calls updateUI directly; this keeps single-frame seeks in sync.
  if (!state.playing && !scrubbing) {
    const f = e.detail;
    updateUI(f.t, f.section, f);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.code === 'ArrowLeft' && !e.shiftKey) { e.preventDefault(); seekTo(state.t - 1 / 60); }
  else if (e.code === 'ArrowRight' && !e.shiftKey) { e.preventDefault(); seekTo(state.t + 1 / 60); }
  else if (e.code === 'ArrowLeft' && e.shiftKey) { e.preventDefault(); gotoSection(-1); }
  else if (e.code === 'ArrowRight' && e.shiftKey) { e.preventDefault(); gotoSection(1); }
  else if (e.code === 'Home') { e.preventDefault(); seekTo(0); }
  else if (e.code === 'End') { e.preventDefault(); seekTo(137.999); }
  else if (e.key.toLowerCase() === 'm') { e.preventDefault(); toggleMute(); }
  else if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFullscreen(); }
});

document.addEventListener('fullscreenchange', () => {
  document.body.classList.toggle('is-fullscreen', !!document.fullscreenElement);
});

// clicking the stage toggles playback
stageWrap.addEventListener('click', (e) => {
  if (e.target.closest('button')) return;
  togglePlay();
});

// --------------------------------------------------------------- bootstrap
let booted = false;
function ready(detail) {
  if (booted) return;
  booted = true;
  api = window.__DFT;
  specs = api.scenes;
  buildTicks();
  $('time-total').textContent = fmt(TOTAL);
  seek.max = String(TOTAL);
  timeNow.textContent = fmt(0);
  updateUI(0, -1);
  updateButton();
  setSoundState('配乐由 Web Audio 生成 · 首次播放时载入');
  // Stage idle overlay should not fight with the opening still.
  stageWrap.classList.add('is-idle');
  setTimeout(() => {
    $('boot').classList.add('done');
    setTimeout(() => $('boot').remove(), 700);
  }, 250);
  // Warm the gallery prints while the viewer reads the masthead.
  api.warmTiles?.().catch(() => {});
  void detail;
}

document.addEventListener('dft-audio-ready', (e) => {
  const a = e.detail || {};
  setSoundState(`配乐就绪 · ${a.duration ? a.duration.toFixed(0) : '138'}s · 48 kHz · Web Audio`, 'ready');
  if (soundState) soundState.title = `peak ${a.peakDb} dBFS / RMS ${a.rmsDb} dBFS`;
});

if (window.__DFT && window.__DFT.ready) {
  ready({});
} else {
  document.addEventListener('dft-ready', (e) => ready(e.detail), { once: true });
}
document.addEventListener('dft-ready', () => {
  if (!api) ready({});
}, { once: false });

const bootWatch = setInterval(() => {
  if (window.__FATAL) {
    clearInterval(bootWatch);
    $('boot').classList.add('has-fatal');
    $('boot-fine').textContent = 'FATAL · ' + String(window.__FATAL).slice(0, 140);
  }
  if (window.__DFT?.ready && !api) {
    clearInterval(bootWatch);
    ready({});
  }
}, 350);

// expose for debugging / future audio bridge
window.__PREVIEW = {
  seekTo, play, pause, togglePlay, state,
  get api() { return api; },
};
