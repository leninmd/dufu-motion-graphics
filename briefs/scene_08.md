# 08 · 三维金属球体挤压 / 春望家书 / PBR Gold Spheres Crush · 757 · 1,880 km

**Global time** 00:48–00:54 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
A dark room filled with 260 heavy gold spheres. A spinning counter counts the
ransom from 1 to 10,000 两黄金. At the centre, a thin white envelope — the family
letter — is the only soft thing in the picture. On the bar-2 downbeat the spheres
flood in from every side and crush the letter into a 40 px gap. The line
【烽火连三月，家书抵万金】 appears on the surviving paper.

## Beats
- **Bar 1 (0–2 s)** — deep black/brown void, a single overhead key light.
  Spheres drift in from the sides; each has a proper metallic highlight, dark
  contact shadow and subtle environment reflection. The counter at the upper-left
  (below the era card, x≈90, y≈210) spins from `1` to `2,847` 两黄金 and beyond.
  The white letter is visible at center, held by a thin light shaft; it is the
  brightest object in the frame. Du Fu's hands/waiting silhouette can be at the
  bottom edge, in shadow, but keep the focus on the envelope.
- **Bar 2 (2.0 s exactly)** — the counter snaps to `10,000 两黄金`; hundreds of
  spheres pour in; a mass of them packs around the envelope until the visible
  paper is only ~40 px wide. The envelope creases and buckles but does not tear.
  The poem line is printed along the remaining paper strip in 50–70 px type.
  A red seal-stamp vignette pulses once. Add a strong compression crease and
  metallic dust.
- **Bar 3 (4–6 s)** — the letter survives; one gap opens toward the right portal;
  the traveler walks through, the spheres left behind. Hold the poem line for
  the eye beat.

## Required visual algorithms
- **PBR-ish spheres in Canvas 2D**, no external images: cached sphere sprites at
  3–4 sizes, each with a multi-stop radial gradient (dark brown rim, gold mid,
  warm white specular), a secondary reflected sky band, and an inner shadow.
  Use a cached `sphereLayer` for performance. Do not draw 260 gradients per frame.
- **Physics / packing**: use a deterministic precomputed array or a simple
  seeded relaxation. 260 spheres should collide, stack and squeeze. Precompute
  positions offline in module init (pure functions), not a live physics engine,
  and interpolate with `u`. A few foreground spheres can be larger and blurrier.
- **Counter**: mechanical odometer digits, with a slight lag/overshoot; units
  「两黄金」. Mono digits, gold, small label. Animate from 1 → 10,000 over bars
  1–2, then hold. Mark `s08-counter`.
- **Letter**: white embossed paper with folds, fibre, a red seal, faint writing.
  Under pressure, add crease geometry, micro-shadow and a narrow remaining gap.
- Use a strong vignette to create a "museum vitrine" or vault.

## Type
- Poem line in cream/gold on the paper strip, 58 px; mark `s08-poem`.
- Counter `10,000` in 52–64 px mono/display; label `两黄金`.
- Small English `METAL / COLLATERAL / 757` outside the layer.
- Keep type clear of the top-left era card and top-right HUD; the counter should
  sit below the card at x≈86–500, y≈210–360.

## Composition / safe areas
- Letter near center x≈850–1070, y≈430–700. Spheres fill x≈0–1920, y≈180–1080.
- Leave the bottom-left for the counter/quote and the top-right for HUD.
- A warm overhead light cone from y≈0 to the letter.

## Palette
Near-black `#070706`, brown `#21180e`, dark gold `#7b5c26`, gold
`#d8aa4f`, warm specular `#f2e3c2`, letter white `#ede7d8`, red seal `#9f2b22`.

## References in repo
`KIT.paper` for letter paper, `src/scenes/scene_07.js` for ink/carve texture,
`src/scenes/scene_03.js` for particle/flood behavior.

## Avoid
Flat gold circles; a text card floating on a background; an envelope drawn as a
simple rectangle with no fold/crease; a counter that is just static text.
