# 14 · Matter.js 刚体坍塌 · 跨时空叩问 / Pre-Baked Rigid-Body Collapse · modern black

**Global time** 01:24–01:30 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
A modern black gallery, almost empty. Three heavy typographic slabs hang at the
top:
`如果有一天，你的人生突然崩塌`
`十年求职无门`
`连家人的屋顶都护不住`
At the bar-2 downbeat their static locks release and they fall, collide and
shatter into a real "word rubble" pile at the bottom of the frame. Two rough red
circles then enclose the word 【失意者】 with the note `——世人眼中的废物`.
The final question appears:
「你还肯为这个人间，流一滴眼泪吗？」

This scene must use the pre-baked Matter.js data in
`src/generated/collapse.js`. Do not run a live physics engine at render time.

## Data contract
`src/generated/collapse.js` will export:
```js
export const COLLAPSE = {
  fps: 60, frames: 300, width: 1920, height: 1080,
  bodies: [ { id, label, kind:'word'|'chip', x0,y0,x1,y1, w,h, poly, path:[{x,y,angle}...] } ]
};
```
Use the arrays to draw word slabs / chips. Positions are centre points + angle.
If you need to adjust, extend the generator outside the scene (coordinate with
main) rather than inventing live physics.

## Beats
- **Bar 1 (0–2 s)** — black field, a thin off-white rule and a tiny `14 / 18`.
  Three heavy slabs fade in at the top, casting enormous soft shadows. Slabs are
  matte black with white/off-white lettering and one red accent. They hang
  motionless (static). A low heartbeat pulse of the background light. Maybe a
  small monospaced line `CASE 14 / STRUCTURAL FAILURE`.
- **Bar 2 (2.0 s exactly)** — all locks release. Over 2.2 s the slabs fall,
  rotate, collide, shatter into smaller text chips, and settle into a pile at the
  bottom. Use pre-baked frames; interpolate angles/positions. Add contact dust,
  motion streaks on the first 8 frames. At rest, the pile spells a broken `失意者`
  or at least has a clear centre where the two red circles can form.
  - **Two red circles**: hand-drawn rough rings, scrawled around the pile's
    centre word; the label `失意者` becomes readable inside. The note
    `——世人眼中的废物` is smaller, red/grey.
  - **The question** appears at y≈360, 42–52 px, cream/white, high contrast:
    「你还肯为这个人间，流一滴眼泪吗？」 Mark `s14-question`.
- **Bar 3 (4–6 s)** — one tear-like drop of light falls into the pile and the
  word fragments subtly rise/lean toward it. A gate opening on the right.

## Visual language
- High-contrast modern editorial: pure black, bone white, one vermilion red.
  Use a serif display for the slabs and a mono for small metadata.
- The slabs should feel physically massy: thick edges, soft AO/contact shadows,
  white type with a subtle warm bloom.
- The debris should be made of **readable characters and sentence fragments**, not
  generic confetti. Pre-bake chips with text fragments.
- The red circle should be rough chalk/brush, not a perfect ellipse.
- Do not use cheap 3D bevels; use light, shadow and paper/ink grain.
- No TTS, no audio here.

## Composition / safe areas
- Top card at top-left, HUD top-right. Keep the main slab text below y=180.
- Slabs start around y≈180–420, fall to a pile around y≈780–980.
- Red circles around x≈820–1100, y≈690–870.
- Question at x≈960, y≈390, or lower if the pile allows.

## Palette
`#050505`, `#f1e6cf`, `#a52a22`, `#5b1114`, a faint warm grey `#8d8375`.

## References in repo
`scene_07.js` for fracture texture, `scene_17.js` for modern UI restraint,
`KIT.paper` for grain. Pre-baked data will be generated with matter-js, an MIT
library recorded in `THIRD_PARTY_NOTICES.md`.

## Avoid
Live non-deterministic physics; flat text cards; a perfect geometric circle;
generic white particles; making the scene "sad" with blue; adding narration.
