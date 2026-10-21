/**
 * debug.js — frame-local metadata for the automated QA gates.
 * This is a side channel for verification only: it never changes a pixel.
 */

const state = {
  t: 0,
  section: -1,
  scene: -1,
  sceneU: 0,
  texts: [],
  boxes: [],
  assertions: [],
  eraCard: null,
  hud: null,
  errors: [],
  pixels: null,
};

export function beginFrame(t) {
  state.t = t;
  state.texts.length = 0;
  state.boxes.length = 0;
  state.assertions.length = 0;
  state.eraCard = null;
  state.hud = null;
  state.errors.length = 0;
}

export function setSceneInfo(i, u) { state.scene = i; state.sceneU = u; }

export function markText(id, text, x, y, w, h, meta = {}) {
  state.texts.push({
    id: String(id), text: String(text),
    x: +x.toFixed(2), y: +y.toFixed(2), w: +w.toFixed(2), h: +h.toFixed(2),
    size: meta.size ?? null, align: meta.align || 'left', color: meta.color || null,
  });
}

export function markBox(id, x, y, w, h, meta = {}) {
  state.boxes.push({ id: String(id), x, y, w, h, ...meta });
}

export function markEraCard(box) { state.eraCard = box; }
export function markHud(data) { state.hud = data; }
export function assert(condition, id, detail = '') {
  if (!condition) state.assertions.push({ id, detail });
}
export function noteError(error) {
  state.errors.push(String(error && (error.stack || error.message) || error));
}

export function snapshot() {
  return {
    t: state.t,
    scene: state.scene,
    sceneU: state.sceneU,
    texts: state.texts.slice(),
    boxes: state.boxes.slice(),
    assertions: state.assertions.slice(),
    eraCard: state.eraCard,
    hud: state.hud,
    errors: state.errors.slice(),
  };
}

export const debugState = state;
