# 02 · 吴道子白描 · 吴带当风 / Bezier Ribbon Dynamics · 731 · 420 km

**Global time** 00:12–00:18 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
Sized white silk, a few dozen wind-driven ribbons, one young man on horseback.
The whole image is made of variable-width ink lines whose control points are
pushed by a turbulent field. At 19 Du Fu is confident: sword at his side, horse
at a gallop, robes and ribbons streaming behind him. On the bar-2 downbeat all
the ribbons stop, converge and write 【读书破万卷】 in one wild cursive stroke.
In bar 3 the letters dissolve into ink rain and blow through the right-hand frame.

## Beats
- **Bar 1 (0–2 s)** — blank silk registers itself: a faint woven grid and a red
  collector's seal. 36–60 ribbons enter from the left and snap taut in the wind.
  The horse/rider is drawn with line work that tries to keep up with the ribbons.
  Use turbulence, not one sine wave. The horse should be a real horse: shoulder,
  barrel, neck, head, four legs, tail; Du Fu's torso and sword distinct.
- **Bar 2 (2.0 s exactly)** — a visible compression of the wind field. Every ribbon
  bends toward a shared typographic spine. Over ~0.7 s the ribbons trace
  【读书破万卷】 in Ma Shan Zheng / brush strokes, with a red seal at the lower
  right. The horse keeps moving; the calligraphy seems to be pulled from its gallop.
- **Bar 3 (4–6 s)** — the ink characters unravel into a rain of short strokes and
  droplets; they cross the frame to the right. The rider looks back once, then exits.

## Required visual algorithms
- Variable-width Bezier ribbons: sample cubic/quadratic curves, build ribbons with
  `KIT.ribbon` or local offset polygons, taper both ends, add dry-brush streaks and
  occasional sharp elbows. Avoid constant-width strokes.
- A wind field: seeded `KIT.fbm2`/`noise2`, gust fronts and vortices; phase differs
  per ribbon. The horse's mane and Du Fu's sleeves must be on the same field.
- White silk ground: `KIT.paper.silk` plus faint weft threads, sizing stains,
  slight warm-grey edge. Red seal paste and a hairline collector's frame.
- Text as a product of the ribbons: draw the glyphs first to a mask, then let
  ribbons/ink strokes emerge along the mask, or draw the text with a brush font
  and add 10–20 ribbon tendrils that fuse into the strokes.
- Ink rain: 600–1,200 short tapered strokes in the third bar, with parallax.

## Type
- Giant wild cursive key line at x≈960, y≈480, size 120–180 px; readable but
  dangerous. Mark `s02-poem`.
- Small top register: 「开元十九年 · 吴越壮游」 in Song serif, 24 px. Red seal.

## Composition / safe areas
- Horse and rider in the lower-left to centre at y≈780; keep the lower-left
  clear of the card (card is top-left). Ribbons fill the whole frame.
- Big characters around y≈350–620; no type in the top-right HUD zone.
- The exit portal at right x≈1800 after u=5.1.

## Palette
`#f3efe4` silk, `#221c14` ink, `#9b8c74` warm grey, `#a52a22` seal red.
Almost no other colour; the scene should feel monochrome except seal paste.

## References in repo
`src/kit/paper.js` silk, `src/kit/ink-engine.js` brushStroke, existing scene 03/10
for large-scale type and scene 07 for dry-media texture.

## Avoid
A white canvas with a few decorative squiggles; thin uniform strokes; a stick
rider; using a modern sans font; raindrops that look like straight lines only.
