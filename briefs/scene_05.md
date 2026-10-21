# 05 · 宋代尺页账簿 · 困守长安 / Song Album Leaf & Counting Rods · 751 · 1,037 km

**Global time** 00:30–00:36 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
A Song album leaf is used as a cold accounting ledger of failure. Du Fu rides a
thin donkey through rain in Chang'an. Behind him, counting rods and brush entries
tick up his days of rejection: Day 0001 → Day 3650. On the bar-2 beat a vernacular
caption appears and ten characters literally press the donkey's back into a
concave curve. The tone is quiet, bureaucratic and devastating.

## Beats
- **Bar 1 (0–2 s)** — ruled album leaf with red columns and a grid; faint insect
  holes at the edges. Rain crosses the page. A thin donkey moves right with Du Fu
  on its back (use `KIT.rig.pose({mode:'ride', mount:'donkey'})`). In the
  background/left, ledger columns fill with counting rods and brush numerals.
  A day counter increments `Day 0001 → Day 3650` over bars 1–2. Refusal stamps
  fall at each beat: 「落第」「干谒」「不报」.
- **Bar 2 (2.0 s exactly)** — the key vernacular card slams in:
  「困守长安十年，他在权贵的酒席边写讨好诗」. The ten characters
  「朝扣富儿门，残杯与冷炙」 fall onto the donkey in a row, visibly depressing
  its spine and the rider. Use a deformation of the donkey body/legs, not just
  a text overlay.
- **Bar 3 (4–6 s)** — the page's edge burns/scorches and insect holes multiply;
  the donkey struggles forward and exits toward the next frame. A small red date
  seal 「天宝十载」.

## Required visual algorithms
- Song ruled paper: `KIT.paper.ruledPaper` is a good base, but add water stains,
  foxing, silk border, red column rules, a pale ledger grid, and an album-leaf
  frame. Make it feel handled.
- Rain: short slanted strokes with depth; wet paper darkening; puddle spatter.
- **Counting rods**: real rod configurations (units/hundreds/thousands) in ink;
  animate additions and carries. Add brush-written entries and rejection stamps.
- **Donkey**: slender body, long ears, thin legs, loaded back; use the rig mount
  or a custom hatch-drawn animal. It must have weight. Deform the spine and legs
  under the ten characters, and shift Du Fu's pose accordingly.
- 10 characters as physical blocks: each character has ink stroke texture, a
  small cast shadow, and compresses the donkey at the beat. Avoid letting them
  float.

## Type
- Vernacular card: 34–40 px, black on a clean paper slip. Mark `s05-caption`.
- Ten-character line in a heavy serif, 42–54 px, placed along the donkey's back.
  Mark `s05-weights`.
- Ledger numbers in a narrow mono/serif; day counter large enough to read:
  `Day 2451` etc. Keep it away from the HUD.

## Composition / safe areas
- Main action lower half y≈580–930; ledger columns left x≈80–520; donkey and
  rider x≈640–1400. Top y≈180–500 for the large vernacular press and red rules.
- Avoid covering the card (top-left) and HUD (top-right).

## Palette
Paper `#e9dfc4`, ink `#33281a`, red `#9d3024`, rain grey `#8e958c`, a little
warm ochre `#a7834f`.

## References in repo
`src/kit/paper.js` ruledPaper/silk, `src/kit/ink-engine.js`, `src/rig/dufu-rig.js`
`mount:'donkey'`.

## Avoid
A clean spreadsheet; a cartoon donkey; rain as straight white lines; making the
ten characters a floating caption without physical effect.
