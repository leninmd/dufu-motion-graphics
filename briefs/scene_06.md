# 06 · 构成主义双极几何切割 / Russian Constructivism Split · 755 · 1,150 km

**Global time** 00:36–00:42 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
A hard-edged constructivist poster, but the two poles are moral, not political.
A fat, leaking gold block of type 【朱门酒肉臭】 inflates in the upper left and
physically squeezes a thin, frost-cracked white block 【路有冻死骨】 into the
lower-right corner. At the bar-2 downbeat the white block freezes and shatters
into a thousand frost shards; the sentence
「那年冬天，他的小儿子饿死在了盛世里。」 is left in the empty space.
This is about the distance between two lines of a poem, turned into a diagram.

## Beats
- **Bar 1 (0–2 s)** — four-colour constructivist field cut by 45° diagonals;
  red beams, black wedge, gold circle, bone-white field. The gold type block
  expands with an oily sheen and pushes the thin white block down-right. The
  white block has hairline cracks and a cold blue rim. Add mechanical scale
  ticks, arrows, stencil numbers, a diagonal grid.
- **Bar 2 (2.0 s exactly)** — freeze-crack: a white flash, the white block
  fractures into 900–1,400 shards that slide outward with deterministic physics;
  each shard has a frost rim. The vernacular line appears in the newly opened
  space, black on the bone white, 34–42 px, with a small note
  `—— 天宝十四载 · 奉先`. The gold block keeps oozing; its pressure line visibly
  reaches the empty corner.
- **Bar 3 (4–6 s)** — a red diagonal blade sweeps across and the shards are
  pushed off-frame; the camera follows the diagonal to a gate.

## Required visual algorithms
- A real constructivist construction: intersecting diagonal bands, large circle,
  column/rule grids, hard-edged typography, photomontage-like paper flecks.
  Palette: red, black, gold/cream, bone white, a cold cyan only for the frozen
  block.
- **Type as bodies**: the gold block and white block are extruded slabs with a
  thickness edge; the type is clipped inside the slab. The gold slab has a
  moving specular smear / oily fluid layer; the white slab has frost crystal
  growth, blue shadows, crack paths.
- **Frost shards**: deterministic Voronoi-ish split of the white block into
  polygons. Use a seeded fracture tree rather than random confetti. Each shard
  keeps its piece of the character and casts a hard shadow.
- **Pressure**: draw tension lines, compressed arrows, and the physical
  indentation of the white block. Add small tick marks that show the collapsing
  gap.
- The giant text must be readable: 朱门酒肉臭 150 px, 路有冻死骨 76 px, thin
  cream-sans/frosted serif. Gold slab can be 150 px; white block 72–86 px.

## Type
- Mark `s06-gold`, `s06-white`, `s06-caption`.
- Vernacular caption in Noto Serif, 38 px, on bone paper, high contrast.
- Keep top-left card and top-right HUD clear; the main conflict is in the
  centre diagonal.

## Composition / safe areas
- Gold slab x≈120–1180, y≈150–500; white block x≈760–1740, y≈540–920.
- A diagonal red blade from (0,1080) to (1500,0) separating them.
- The vernacular caption can occupy x≈520–1540, y≈640–780 after the fracture.

## Palette
Red `#d03428`, black `#12100d`, gold `#d2a14d`, bone `#ddd4c4`,
ice blue `#9ec7d4`, ink `#201a13`.

## References in repo
`scene_07.js` for print texture, `KIT.ink.hatch`, `KIT.geometry3d` for projected
slabs, `KIT.paper` for paper tooth.

## Avoid
A flat red/cream background with two text boxes; a cliché sickle/hammer motif;
type that is clipped without a visible slab; shards that look like random triangles
without the character fragments embedded.
