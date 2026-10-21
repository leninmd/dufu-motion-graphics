# 09 · 关中镂空皮影戏 · 石壕吏 / Shadow Puppetry @ 10fps · 759 · 2,600 km

**Global time** 00:54–01:00 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
A night shadow-play lit by an oil lamp. Amber leather, carved openwork,
articulated joints, control rods descending from above. Du Fu and the old woman
of Shihao walk through a mountain road. The puppets are deliberately animated at
**10 updates per second**, while the camera pan and the lamp smoke stay at 60 fps.
On the bar-2 beat a giant invisible hand yanks the old woman's control rod up;
she disappears, leaving one empty wire swaying. The line
【夜久语声绝，如闻泣幽咽】 appears.

## Beats
- **Bar 1 (0–2 s)** — a vertical/rectangular shadow screen with a warm amber
  backlight gradient. Carved leather mountain silhouettes, village gate, reeds.
  The puppets walk in profile right-to-left or left-to-right, with visible rods,
  joints and rivets. Du Fu with staff and official's hat; the old woman bent,
  carrying a basket. A small title plaque 「石壕村 · 夜」 in an amber cartouche.
  The camera dollies slowly right (60 fps), so the puppets seem more jerky.
- **Bar 2 (2.0 s exactly)** — a giant rod/grabber enters from above and jerks the
  old woman upward. Her jointed limbs collapse, then the puppet is gone. The
  control wire swings with damped motion. The stage momentarily loses its amber
  saturation (the lamp gutters) and the line appears. Use a discrete 10 fps
  update for the puppet's last pose and the wire's quiver, while the camera and
  the floating dust remain smooth.
- **Bar 3 (4–6 s)** — Du Fu is alone, older, continuing to walk; the empty rod
  still hangs. The screen edge becomes the next frame.
- Quantization: helper `q = Math.floor(u * 10) / 10` for all puppet poses,
  joint angles, rod positions. Keep global camera x/y and smoke at real u.

## Required visual algorithms
- Amber transmissive screen: layered radials + paper/silk texture, slight lamp
  hotspot, grain, a vignette; no flat orange rectangle.
- **Carved leather puppets**: use your own jointed geometry or `KIT.rig` parts
  transformed by quantized phase. Add:
  - openwork patterns (dots, crescents, flower cuts) inside the robe;
  - visible rivets at shoulders/elbows/knees;
  - thin bamboo rods with metallic collars;
  - dark joint shadows and a bright leather edge (backlight bleed).
- Mountain/road cut-outs: carved silhouettes with internal cut-out holes; move at
  a different parallax layer.
- **The giant hand / rod**: keep it abstract — a black iron hook/rod with 3–4
  prongs and a cold metal highlight; it enters from the top and yanks. Do not draw
  a realistic human hand if it breaks the stylization; a shadow hand is scarier.
- Dust motes in the lamp beam, 60 fps.

## Type
- Main line 「夜久语声绝，如闻泣幽咽」 in a warm cream, 42–54 px, vertical or
  horizontal, on the shadow screen. Mark `s09-poem`.
- Small captions on amber plaques, 22–28 px: 「石壕村」「老妇」「差吏」.
- Avoid top-left card and top-right HUD.

## Composition / safe areas
- Screen area x≈150–1770, y≈150–950, dark wooden stage frame around it.
- Puppets at y≈700–930, x≈420–1300. Rods above y≈60–600.
- The line can occupy the upper right x≈1260–1730, y≈260–720 (vertical columns)
  or along the bottom; keep away from HUD.

## Palette
Bamboo-shadow black `#130c07`, amber glass `#e3a94e`, leather `#a95421`,
cream `#f4d49a`, lamp red `#7c2d12`, a little cold metal `#9aa3a1`.

## References in repo
`src/rig/dufu-rig.js`, `src/rig/walkerPose`, `KIT.paper`, `KIT.ink`, scene_07's
carved/rough edges.

## Avoid
A flat orange silhouette; no visible joints/rods; smooth 60fps puppet motion;
an actual photorealistic hand; simplistic cut-out hills.
