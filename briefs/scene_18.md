# 18 · 现代代码美学 · 大模型时代 / Dark IDE & Live SVG/Shader Coding · 2026

**Global time** 01:48–01:54 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
The film ends in a clean dark code editor. On the left, syntax-highlighted
JavaScript/GLSL is typed at a 16th-note rhythm; on the right, a live preview
renders the Xiang river boat as a mathematical star river. On the bar-2 downbeat
the Enter key lands and the code compiles: the boat dissolves into 1,600 gold
stars. The final line of the film appears:
【他没能致君尧舜上，却把整个时代，写成了诗。】
In bar 3 the camera pushes into the preview and the stars become the bridge to
the Outro's history wall.

## Beats
- **Bar 1 (0–2 s)** — a dark editor window split 58/42. Left: tabs, line numbers,
  minimap hairline, syntax colours (blue keywords, gold strings, green numbers,
  grey comments), a blinking cursor. Typing runs on 16ths at 120 BPM:
  0.125 s per character (or 2–4 chars per 16th for speed). Header:
  `const poet = new Immortal("Du Fu", {` etc. Right: a live preview panel with
  a dark teal river, a small boat, and a SVG-like circle/constellation that
  reacts to the typed numbers. Status bar: `UTF-8  LF  JavaScript  deterministic`.
- **Bar 2 (2.0 s exactly)** — the final `});` line is typed, Enter is hit with a
  physical key-travel animation, line highlight, and a compile flash. The preview
  bursts: the boat becomes a constellation of 1,600 gold stars, a river of
  vector bezier curves, and a slow camera pull. The code panel shows
  `for (const star of stars)` / `shader.stars(...)`. The final quote appears at
  the center/right, 44–56 px cream/gold, two lines. Mark `s18-quote`.
- **Bar 3 (4–6 s)** — the editor UI dims to 20%; the camera pushes into the
  preview. The star river flows toward a large gate frame on the right (the Outro
  wall). At u≈5.6 the code panel collapses to a narrow strip; the star field
  remains for the global pullback transition into the wall.

## Required visual algorithms
- **IDE**: authentic modern editor, not a fake terminal. Window chrome, tabs,
  gutter, current line highlight, cursor, selection, bracket matching, scroll
  shadow, command palette sliver, status bar. Use a clean mono (Cascadia Mono).
  No neon-on-black cliché; use restrained colours on a blue-black.
- **Code text**: custom syntax-highlighted line renderer, 16–20 px mono. Typing
  reveal computed from `u` deterministically. Code should actually be plausible:
  ```
  import { Immortal } from "poetry/core";
  const poet = new Immortal("Du Fu", {
    distanceKm: 4739, poems: 1455, forSelf: 0,
    era: "Tang", medium: "language"
  });
  shader.stars(count=1455).over(xiangRiver);
  ```
  Include the exact required line:
  `const poet = new Immortal("Du Fu", { distanceKm: 4739, poems: 1455, forSelf: 0 });`
  across one or two wrapped rows. Data values visible.
- **Live preview**: a procedural star river / boat. Use the boatPose up to
  u≈2.2, then dissolve it into stars via sampled points and shader-like vector
  glows. Use 1,455 or 1,600 particles, gold/cream; dark teal background; river
  bezier lines. No external image.
- **Compile flash**: a scanline sweep across the code panel and preview, a
  cursor block, and a "✓ 0 errors" in green. Not a generic white flash.
- **Camera**: right preview expands as the editor fades in bar 3; push toward the
  stars; use clip/scale. The final quote remains pinned outside the camera push.

## Type
- Code 14–17 px, line height 24, gutter 12 px mono. Need enough code to fill.
- Final quote at x≈1120? The preview is on the right, but the quote can float
  over the star river center/right, size 48–56; mark `s18-quote`.
- Add small `results: 1,455 poems · 0 for self` status.
- Avoid the top-left card & top-right HUD.

## Composition / safe areas
- Editor panel x≈70–1080, y≈170–940; preview x≈1100–1850, y≈170–940.
- At bar 3 the preview expands to x≈300–1850 and the editor fades to a 80 px strip.
- Final quote x≈1000–1800, y≈440–700 (or center over preview).

## Palette
Editor `#0b1016`/`#131a23`, code blue `#7ec8ff`, gold `#f1d58a`, green
`#7bdc9a`, muted `#6b7b8c`, star `#e9c56d`, river teal `#0b2a2d`.

## References in repo
`scene_03.js` for the star/particle river, `scene_17.js` for UI, `KIT.paper.darkGrid`,
`src/rig/dufu-rig.js` boatPose.

## Avoid
A fake terminal with green-on-black; code that is lorem ipsum; a code editor that
is just a dark rectangle; a final quote competing with too much UI; using the
real logo of any IDE.
