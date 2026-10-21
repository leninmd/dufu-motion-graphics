# 11 · 北宋巨碑山水 · 夔州登高 / Monumental Landscape Micro-Scale · 766 · 3,880 km

**Global time** 01:06–01:12 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
A Fan Kuan-sized ink monolith fills 92% of the frame. At its base, on a cliff,
Du Fu is 8 pixels tall. In bar 2 the camera performs a violent 15× push into the
cliff, finds the white-haired old man alone in the wind, and reveals
【无边落木萧萧下，不尽长江滚滚来】. The point is scale: a human being disappears
inside a landscape, then becomes the only thing worth finding.

## Beats
- **Bar 1 (0–2 s)** — full-frame monumental ink landscape: a central vertical
  peak with axe-cut / raindrop texture (`雨点皴` / `斧劈皴`), deep ravines, a
  winding river, a tiny cliff pavilion. 92% of the frame is mountain. Falling
  leaves drift in the foreground. Du Fu is an 8-pixel mark (use a small rig or a
  brush dot); he must be almost imperceptible. Small inscription
  「夔州 · 大历元年」.
- **Bar 2 (2.0 s exactly)** — camera zooms ~15× into the cliff at screen point
  near (x≈930,y≈720). Use a smooth ease-out with a hard beat start. As zoom
  increases, swap/reveal a high-resolution close-up of the cliff edge: white-haired
  Du Fu, robe whipping in wind, staff, a deep drop below. The giant couplet
  appears in the negative space at the right, 56–72 px, two horizontal lines or
  vertical calligraphy. Falling leaves and river mist keep moving.
- **Bar 3 (4–6 s)** — hold the human-scale peak; a leaf passes; the camera drifts
  slightly. A narrow gate appears at the right edge at u≈5.2. He does not step
  through until the transition; the landscape remains enormous.

## Required visual algorithms
- Procedural mountain: multi-octave ridged fbm, layered contour bands, cliff
  facets, deep ink wash, white paper negative space at the top for sky. Use
  `KIT.paper.ricePaper` and `KIT.ink.brushStroke`.
- **Cunfa texture**: hundreds/thousands of short tapered strokes following slope
  direction and fractal height. Use a cached painting for the wide shot if needed,
  but the zoom layer must be crisp: redraw vector strokes at screen scale, with
  stroke width divided by zoom, or generate a large 3840×2160 base and reveal a
  high-detail close-up layer. Avoid a blurry upscaled bitmap.
- River: white/negative winding ribbon with dark edge strokes and wave marks;
  not a blue raster.
- Falling leaves: 80–160 tapered brush leaves with wind and depth.
- Zoom implementation: world coordinates and a camera transform around the cliff;
  keep the paper grain, title and HUD in screen space. Crossfade the 8px figure
  into a 100–140 px detailed Du Fu around u≈2.2–3.1 so the enlargement reveals
  a real human, not a pixel blob.
- Use a red collector seal and a vertical inscription.

## Type
- Couplet at right x≈1430–1810, y≈230–780, size 54–66; mark `s11-poem`.
- Small colophon top-left/middle: 「溪山行旅 · 摹本」「大历元年 · 夔州」.
- Keep top-left card & top-right HUD clear. Type can overlap the mountain but stay
  on a quiet ink wash / paper strip.

## Composition / safe areas
- Wide: mountain x≈70–1500, peak up to y≈90; paper sky right x≈1500–1850.
- Cliff pavilion x≈820–980, y≈720–820. Du Fu at x≈900, y≈790, 8 px.
- Close-up: cliff edge across lower third, Du Fu at x≈690–830, y≈530–850.

## Palette
Paper `#e8dfc9`, ink black `#191711`, warm grey `#6e6554`, moss
`#3e4636`, seal red `#a52a22`, mist `#f1e9d5`.

## References in repo
`scene_03.js` for scale / camera reveals, `src/kit/ink-engine.js`,
`src/kit/paper.js`, scene_07 for rough texture.

## Avoid
A smooth airbrushed mountain; a giant figure in the wide shot; a zoom that merely
scales a low-res bitmap; a poem obscuring the mountain; generic "Chinese
painting" decoration without cunfa.
