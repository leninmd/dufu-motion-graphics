# 12 · 八大山人写意 · 湘江孤舟 / Bada Shanren Minimalism & Water Shader · 768 · 4,350 km

**Global time** 01:12–01:18 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
85% of the frame is empty paper. A few dry strokes make a leaf of a boat, five
lives, and a moon on the Xiang. In the lower half, a sine-normal water shader
turns the river into silver ripples. On the bar-2 beat a 180-particle ink gull
with Bada Shanren's arrogant white eye sweeps past the boat; the couplet
【星垂平野阔，月涌大江流。飘飘何所似，天地一沙鸥】 appears in vertical columns.
Everything must be achieved with absence. This is the quietest scene in the film
and one of the most beautiful.

## Beats
- **Bar 1 (0–2 s)** — paper ground, a faint deckle edge, one dry ink horizon.
  The boat appears from the left with only 6–9 brush strokes: a curved hull, a
  low canopy, five small figures (or four and a baby), one old man at the stern.
  A single moon, a faint reflection, a wash of distant shore. Minimal red seal.
  The water surface is already moving, but almost imperceptibly.
- **Bar 2 (2.0 s exactly)** — the moonlit water suddenly becomes visible: sine
  normal lines, silver specular glints, a moon path. A gull (180 particles plus a
  few dry strokes) enters from the lower left, wings one sweep, tilts its white
  eye toward the viewer, and exits right. The couplet appears vertically at the
  right, 42–54 px; each character fades in with the water beat. A small red seal
  `[ 少陵 ]`. At u≈4.0 the gull is gone, leaving a single feather / particle.
- **Bar 3 (4–6 s)** — the boat drifts toward a harbour-light / next frame. The
  **water lines at the right edge begin to electrify into green CRT scanlines**
  near u≈5.55, anticipating the 12→13 cross-media transition. Keep the rest of
  the water silver; only a thin leading edge is green. The paper whitespace must
  survive to the end.

## Required visual algorithms
- **Bada minimalism**: no outlines everywhere; 3–7 decisive dry-brush marks,
  visible flying-white, uneven pressure, deliberate imbalance. Negative space is
  the composition.
- **Water shader**: Canvas2D approximation of a sine-normal surface:
  `y = base + Σ A_i sin(k_i x + ω_i t + φ_i)`, compute slopes/normals, draw
  silver highlights only where the slope faces the moon. Use `lighter` blending,
  no bitmap blur. Animate at 60 fps.
- **Moon path**: broken silver flecks/lines, not a white triangle.
- **Gull particles**: sample a simple gull silhouette or use local geometry with
  180+ deterministic particles; animate wing beats; one white eye with black rim
  (Bada's signature). At full beat, a few dry brush strokes define wing tips.
- **Boat and family**: use `KIT.rig.boatPose` for the hull and figures, but simplify
  it to brush marks: hull, canopy, 3–5 seated figures, a standing elder. Don't
  turn it into a detailed wooden boat; it must be a "few strokes" that still reads.
- Add a very faint paper grain and a red seal.

## Type
- Vertical couplet at right x≈1590/1690, top y≈230, size 48–56; mark `s12-poem`.
- Small attribution `八大山人 · 写意` / `大历三年 · 湘江` in 20 px.
- A red seal near the boat or poem; no extra modern sentence (the verse speaks).

## Composition / safe areas
- Upper 55% nearly empty paper; horizon just below center y≈610.
- Boat x≈420–920, y≈620–760. Gull passes x≈900–1650, y≈480–660.
- Poem columns x≈1520–1780, y≈200–760; keep away from HUD.
- Green CRT leak only at the far right edge x>1770 after u=5.55.

## Palette
Paper `#f6f2e8`, ink `#1b1812`, silver `#aebfbe`, moon `#f5eedb`, seal red
`#a52a22`, the tiniest green `#38ff88` in the final second.

## References in repo
`src/scenes/scene_03.js` for particles, `src/kit/paper.js` silk/ricePaper,
`src/kit/ink-engine.js`, `src/rig/dufu-rig.js` boatPose.

## Avoid
Filling the emptiness; a detailed photoreal boat; a blue ocean; the gull becoming
a cartoon seagull; overusing text; water as a flat gradient.
