# 04 · 盛唐泥金界画 · 初入长安 / Gold-Green Ruled Painting + 3D TypeField · 746 · 1,037 km

**Global time** 00:24–00:30 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
A precise gold-on-mineral-green界画 of Chang'an's palace gate, with a ground
made of 1,600 poem-type blocks. Du Fu walks in, certain of his future. The gate
doors slam shut in his face at the bar-2 beat, a giant edict seal drops, and
the 3D characters beneath him scatter. This is the turn from confidence to
exclusion. The gate must be spectacular architecture, not a flat prop.

## Beats
- **Bar 1 (0–2 s)** — minutely ruled palace facade in perspective: raised platform,
  dougong bracket sets, tiled eaves, lacquered columns, gold studs, cinnabar walls,
  jade-green shadow. A 3D field of 1,600 type blocks on the ground; the blocks rise
  and form 【致君尧舜上】 in vermilion. Du Fu walks toward the gate, small against
  the architecture.
- **Bar 2 (2.0 s exactly)** — two doors slam shut with a heavy metal impact. The
  frame shakes, gold dust falls. The shockwave knocks Du Fu back three steps
  (use the rig's lean / a short recoil). The huge edict seal falls from above:
  `[ 诏下，无一人中第 ]`. Doors welding: draw a hot seam / gold weld line.
- **Bar 3 (4–6 s)** — the 3D type blocks tumble and lose their sentence. Du Fu
  turns toward the next frame; a narrow palace side-gate opens on the right.

## Required visual algorithms
- **界画**: true one/two-point perspective construction; parallel gold rules;
  repeated bracket sets; roof tiles in rows; wall panels; no flat rectangle gate.
  Use cached layer(s) for the architecture; small stroke widths (0.8–2 px) and
  mineral pigments.
- **3D TypeField**: use `KIT.geometry3d.Camera3D` or your own floor projection.
  40 × 40 = 1,600 character tiles. Each tile has a character from a seeded poem
  dictionary; at bar 1 they rise as glowing vermilion extrusions. At bar 3 they
  topple. Keep per-frame cost under budget: cache a handful of glyph sprites and
  draw projected quads, not 1,600 live text calls.
- **Doors**: two thick lacquered panels, gold nail arrays, perspective, hinges,
  a warm seam. On the beat they snap shut over 0.12 s with an overshoot.
- **PBR-ish gold**: multiple linear gradients, a specular band, a soft reflected
  ground colour, and engraving. No flat yellow.
- **Impact**: radial shockwave, tile dust, type blocks knocked out of grid.

## Type
- `致君尧舜上` in vermilion 3D blocks on the ground.
- Edict seal as a huge red carved rectangular seal, white text, impact at u≈2.25.
  Mark `s04-edict`.
- Small gold vertical inscription near the side: 「天宝五载 · 长安」.
- No text in the top-left title card zone or top-right HUD.

## Composition / safe areas
- Palace fills x≈180–1740, y≈180–980. Gate opening centred around x≈960.
- Du Fu at x≈430 → 760, y≈900, scale ~0.85; after the slam, x≈540.
- The edict seal can occupy x≈620–1300, y≈320–540 during bar 2.

## Palette
Stone green `#1B4D3E`, jade `#2d6b57`, gold `#D4AF37`, lighter gold `#ebd28c`,
cinnabar `#b4261e`, ink lacquer `#071712`, paper warm `#e9dfc6`.

## References in repo
`src/scenes/scene_03.js` for projected 3D, `src/kit/geometry3d.js`,
`src/kit/paper.js`, `src/kit/ink-engine.js`.

## Avoid
Flat yellow roofs, cartoon doors, a palace that is just three rectangles, type
blocks as screen-space text, or a door slam that reads as a simple scale-down.
