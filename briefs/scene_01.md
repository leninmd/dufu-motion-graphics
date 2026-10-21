# 01 · 汉唐石刻拓片 / Rubbing & Stone Engraving · 712 · 0 km

**Global time** 00:06–00:12 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
A museum rubbing made from a black granite stele: the world is charcoal stone,
the figures are white incised lines, the red is seal paste. This is the oldest
medium in the film and must feel like a physical print, not a white-line drawing
on a dark background. At the centre of a Han procession of carriages, horses,
bannermen and officials, a seven-year-old Du Fu carries a brush taller than he is.
On the bar-2 downbeat the stele shudders and the white characters
【七岁属辞，开口咏凤凰】 emerge from the stone. A real crack opens at the right
and he walks into era 02.

## Beats
- **Bar 1 (0–2 s)** — the rubbing settles into registration; procession moves
  right-to-left; the child-brush silhouette is visibly out of scale among adults.
  Faint red inscription at the top: 「巩县 · 景云三年」. Add stone chisel marks,
  rice-paper rubbing fibres, a faint paper seam and registration crosses.
- **Bar 2 (2.0 s exactly)** — a deep impact. Stone dust jumps; the entire
  inscription surface shakes 4–8 px for ~0.3 s. **「七岁属辞，开口咏凤凰」**
  is carved in white, character by character, along a rough stone register.
  The right edge of the stele splits open into a first portal; red seal paste
  bleeds from the crack.
- **Bar 3 (4–6 s)** — the child steps through the crack, brush over his shoulder;
  loose ink/stone particles chase him. A carved gate frame is visible at the
  right edge by u≈5.2.

## Required visual algorithms
- Dark granite ground: `KIT.paper.stone` or your own cached granite noise with
  feldspar speckle, mica glints, fracture lines. Not a flat dark rectangle.
- High-contrast **rubbing extraction**: paint white silhouettes into an offscreen
  canvas, erode with a seeded grain mask, then tint the remaining white as paper
  and multiply it onto the stone. High contrast, pitted edges, no soft airbrush.
- White-line procession: Han pictorial stone composition. Carriages with spoked
  wheels, horses with blocky legs, parasols, banners, officials in low relief.
  Use repeated carved hatching, worn edges and registration errors.
- The giant brush is a prop: thick bamboo shaft, tapered wolf-hair tip, clearly
  taller than the child. It should be in silhouette (white carving), not a
  cartoon icon.
- Portal: use `KIT.frames.drawPortal(ctx, …, {style:'stone'})` or a local stone
  gate; make the interior a dark slit showing a sliver of the next medium.

## Type
- White carved display characters for the key line. Use `KIT.ink.roughText` with
  a stone-grain clipping mask, or draw into a cache and erode.
- Small red carved captions: 「巩县 · 712」「第一石 · 车马出行」. Body sizes 24–40 px.
- Must mark `s01-caption` for the key line.

## Composition / safe areas
- Procession band occupies y≈300–820. Keep the top-left card and top-right HUD clear.
- The big characters can run x=280–1680 at y≈210–360 (above the procession,
  below the top furniture). A red partial seal near x=1620, y=700.
- Child + brush in the centre-left x≈360–700, ground y≈860.

## Palette
`#15130f` charcoal, `#d9cdb6` paper-white, `#a52a22` seal red, `#2a241b`
shadow-brown, a little `#d7c7a3` fibre.

## References in repo
`src/kit/ink-engine.js`, `src/kit/paper.js`, `src/scenes/scene_07.js` for carved
texture, `src/scenes/scene_03.js` for a large singular silhouette.

## Avoid
Flat black background with thin white outlines; vector clip-art horses; a clean
uniform crack; using modern sans-serif text; a white child in a white field with
no paper tooth.
