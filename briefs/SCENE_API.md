# Scene API — 少陵测试 / The Du Fu Test

Every era is one ES module: `src/scenes/scene_XX.js`.

```js
export function renderAt(ctx, u, beat, env) { /* draw the full 1920×1080 frame */ }
```

- **Canvas**: always 1920 × 1080. Full-bleed. Do not create the canvas.
- **`u`**: scene-local seconds, `0.0 … 6.0` (clamped by the film). Never read `Date.now`,
  `performance.now`, the wall clock, or `Math.random()`.
- **Bars**: 0–2 s = bar 1, 2–4 s = bar 2, 4–6 s = bar 3. The **core spectacle must start
  exactly at `u = 2.0`**, and the poem-eye should hold by `u ≈ 4.3`.
- **`beat`**: global `beatInfo(t)` object. Useful fields: `u`, `local`, `beatIndex`,
  `beatPhase`, `barPhase`, `pulse`, `barPulse`, `scene`, `sceneP`, `wonder`, `eye`.
- **`env`**: `{ spec, sceneIndex, t, width: 1920, height: 1080, kit }`, where `spec` is the
  manifest entry (palette, year, accent, etc.).
- **Do not draw**: the era title card (top-left, ~50×38 to 536×164), the travel HUD
  (top-right, ~1554×34 to 1870×150), the global transition, or the outro wall.
- **Mark key text** with `markText(id, text, x, y, w, h, {size})` (or pass `mark: 'id'` to
  `KIT.drawText`). QA checks these boxes for readability/bounds. Use ids like `s05-caption`.
- **Determinism**: all randomness from `KIT.mulberry32(seed)`, `KIT.hash`, `KIT.unit`.
  Avoid `toLocaleString`, locale formatting, `new Date`, CSS transitions, or timers.
- **Performance target**: ≤ 35 ms per frame at 1920×1080 in a headless Chrome worker
  (the final render is 8,280 frames). Cache static textures with
  `KIT.layer('sceneXX:name', w, h, paint)`; avoid `ctx.filter = 'blur(...)'` on many paths.
- **Type**: use `KIT.drawText`, `KIT.verticalText`, `KIT.roughText`, `KIT.brushText`.
  Minimum body size 24 px; captions 28–42 px; title-card is handled elsewhere.
  Keep type at least 60 px away from the top-left card and top-right HUD.

## KIT surface (most useful)

```js
import KIT from '../kit/index.js';
const { clamp, lerp, smoothstep, easeOut, easeInOut, TAU, hash, unit, mulberry32 } = KIT;

KIT.drawText(ctx, text, x, y, { size, font: KIT.FONT.serif|display|kai|brush|wenkai|mono,
  weight, color, align:'left|center|right', baseline, letterSpacing, lineHeight,
  maxWidth, shadow:{color,blur,x,y}, alpha, mark:'sXX-key' });
KIT.verticalText(ctx, text, x, y, { size, font, color, mark });
KIT.ink.brushStroke(ctx, pts, { color, width, dry, seed, paperColor });
KIT.ink.roughText(ctx, text, x, y, { size, font, weight, color, align, seed });
KIT.ink.sealStamp(ctx, x, y, w, text, { seed, color, vertical, h });
KIT.ink.hatch(ctx, polygon, { color, gap, angle, width, seed });
KIT.ink.inkSplatter / inkBloom / washRect / roughRect
KIT.paper.ricePaper(w,h,opts) / silk / stone / woodPaper / ruledPaper / darkGrid / frosted
KIT.layer(key, w, h, paint) → cached canvas; KIT.grainLayer(w,h,seed,opts)
KIT.radial/linear/rgba/mixColor/parseColor; KIT.makeCanvas
KIT.frames.drawPortal(ctx,x,y,w,h,{style,accent,seed,t}) / drawExitGate / speedStreaks
KIT.particles.Rain / driftField / floatMotes / gust / windAt / rainCurtain / glyphRoof
KIT.rig.pose({t, phase, mode:'walk'|'ride', mount:'donkey'|'horse', wind, lean, look,
  elder, staff, child, beard}) → pose
KIT.rig.boatPose({t, phase, wind}) → boat pose
KIT.rig.placed(pose, {x, y, scale, rot, flip}) → transformed pose
KIT.rig.drawSilhouette(ctx, pose, {color, alpha})
KIT.rig.drawWire(ctx, pose, {color, width, alpha})
KIT.rig.rigParts(pose) → back-to-front parts
KIT.rig.sampleRig(pose, {edgeStep, fill, fillStep, seed}) → [[x,y],…]
KIT.rig.walkerPose({t, phase}) → a secondary villager figure
KIT.geometry3d.Camera3D / mountainCloud / drawCloud
KIT.debug.markText(id,text,x,y,w,h,meta) (normally just use drawText mark)
```

## Existing reference scenes

Read these before starting (they are the quality bar):
- `src/scenes/scene_03.js` — 35k-point 3D mountain collapse, gold particle type.
- `src/scenes/scene_07.js` — woodcut, hatching, four-hit tape glitch, split abyss.
- `src/scenes/scene_10.js` — glyph roof, 8k particles, 0.012× bullet time, rain beads.
- `src/scenes/scene_17.js` — 9:16 phone, fictional UI, danmaku storm, like counter.

## Testing

```powershell
node tools/shot.mjs --scene 05 --u 0.8,2.4,4.8 --out output/v6_smoke/s05
node tools/shot.mjs --t 30.9,32.5,34.8 --out output/v6_smoke/s05b
```
Then inspect the PNGs with the image reader, and run `node tools/qa-gate.mjs` before
declaring the batch finished. Never modify `src/main`, `src/kit`, `src/beat`, `src/rig`,
`tools`, or another scene file. If KIT is missing a primitive, implement it locally
inside your scene with a deterministic seed.
