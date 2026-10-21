# 15 · 像素闯关与 3D 翻牌 · 人生烂牌局 / Retro Pixel & 3D Card Flip · modern

**Global time** 01:30–01:36 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
Split the screen into two eras in one frame:
- **Upper band**: a 10 fps retro pixel game HUD. The life bar is at 1%, flashing
  red. Pixel landscape / cards / dither overlays at 10 fps while the global camera
  still moves at 60 fps.
- **Lower band**: a high-resolution 3D perspective card table on black felt.

Fate deals four black-backed cards with red characters: 落第, 陷贼, 破屋, 孤舟.
On the bar-2 downbeat all four flip 180° in sequence with gold particle columns,
revealing four white/gold cards: 《春望》《三吏三别》《茅屋》《登高》. A gold
critical hit `[ +9999 诗史不朽！ ]` and the line
「杜甫把最苦的一手烂牌，熬成了大唐的诗史！」 appear.

## Beats
- **Bar 1 (0–2 s)** — upper pixel scene: a dark cyan/magenta night sky, pixel
  mountains, a tiny pixel boat; HP bar at 1% with a red flicker at 10 fps; a
  pixel timer `LIFE 59`; small `STAGE 08`. Lower card table: green/black felt,
  four cards dealt face-down with a perspective projection, soft shadow, a gold
  trim. Cards have a black back with a red seal (not real brands). The traveler
  / rig is at the edge of the table, reduced to a small silhouette.
- **Bar 2 (2.0 s exactly)** — the four bad cards are named in red as they rise
  (or the names are printed on the card backs at the top). Then they flip 180°
  in 0.18 s each, staggered on 16th notes, from u≈2.1 to u≈2.8. Use real 3D
  projection: scaleX = cos(θ), switch face at θ=π/2, with perspective, gold
  particles rising from the table, and a specular sweep across the gold face.
  Each turn reveals a classic title (春望 / 三吏三别 / 茅屋 / 登高) in a beautiful
  serif on a bone-white card with gold foil edges.
  - At u≈2.85, a gold `+9999` hit and the big line. Mark `s15-line`.
- **Bar 3 (4–6 s)** — the four cards slide into a fan / stack and fly toward the
  right frame; the pixel HP bar refills to 100% for one beat, then the scene
  transitions. A small gold seal.
- **10 fps**: use `qp = Math.floor(u * 10) / 10` for HP flicker, pixel animations,
  and any object positions in the upper band. The card flips must use real `u`
  (they are a 60 fps flourish, not pixel-quantized). The cards should be rendered
  at 60 fps.

## Visual language
- **Pixel band**: nearest-neighbor geometry, hard 4–6 px blocks, a limited palette
  (cyan, magenta, red, gold, black), scanline/dither. HP bar is a high-quality
  pixel UI, not a flat rectangle: frame, tick marks, glitch flicker at 10 fps.
- **Card table**: cinematic perspective, black varnished wood/felt, volumetric
  gold dust, card edges with thickness, specular paper. Cards should be
  convincingly 3D: perspective quad, scaling, occlusion, shadow.
- **Card faces**: bone paper with red/gold title; four different micro-layouts
  (not four identical boxes): a gold border for 春望, a seal-grid for 三吏三别,
  a thatched texture for 茅屋, a mountain line for 登高.
- Gold particles: 300 deterministic sparks; no photos.
- Keep top-left card and top-right HUD clear; the upper pixel band can be y≈170–520.

## Type
- Bad cards: red characters on black, size 32–40 in perspective; readable.
- Good cards: 《春望》 etc in 34–46 display serif, white/gold.
- Big line at y≈850: 40–48 px, cream with gold highlights. Mark `s15-line`.
- `+9999 诗史不朽！` gold, 36 px, pop.
- Pixel text in a pixel/mono font (Cascadia Mono is okay), all-caps labels.

## Palette
Black `#0b0b12`, felt dark green `#12352b`, gold `#e9c86a`, bone
`#f4eee1`, red `#e8413a`, cyan `#5ac8fa`, magenta `#d75bc4`.

## References in repo
`scene_07.js` for carved/printed type, `scene_17.js` for UI precision,
`KIT.geometry3d` for card projection, `KIT.rig` for small silhouettes.

## Avoid
Four identical white cards; a flat CSS-looking HP bar; cards that scale without
perspective; pixel art that is just rectangles; a modern gradient background.
