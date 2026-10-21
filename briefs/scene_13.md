# 13 · 绿色荧光示波器 · 潭州绝笔 / 1960s Oscilloscope Vector CRT · 770 · 4,739 km

**Global time** 01:18–01:24 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
The camera is now inside a 1960s laboratory: a round P7 phosphor CRT in a dark
crinkle-paint instrument. The only light is the green beam. The beam draws Du Fu's
4,739 km altitude profile and a failing ECG; at the bar-2 downbeat an unseen hand
turns the wrong knob and the waveform twists into a Lissajous knot in the middle
of the screen, spelling
【1,455 首诗 · 没有一首是写给自己看的】.
At the next beat it snaps back into the boat waveform, which exits the right frame.
The CRT should feel like a physical object, not a green vector drawing.

## Beats
- **Bar 1 (0–2 s)** — power-on flicker, then a bright green trace. Graticule:
  10 × 8 divisions, fine lines, small tick labels, a chrome/bezel edge. The beam
  draws a terrain profile that rises/falls like Du Fu's journey, overlaid with
  an ECG whose rate is slowing. Use phosphor persistence trails (older poses at
  lower alpha) and a scanning highlight. Small scope readouts: `CH1 · 20ms/DIV`,
  `4739 KM`, `59 YRS`. Add a boat vector as a small waveform glyph.
- **Bar 2 (2.0 s exactly)** — a hand turns an off-screen knob. The ECG distorts
  over 0.3 s into a 3:2 Lissajous curve centered on the tube, then the curve's
  many threads arrange into the legible line
  【1,455 首诗 · 没有一首是写给自己看的】. This line must be crisp glowing green,
  not a blurry artifact. A knob click sparks. The background hum/scanline jitter
  increases.
- **Bar 3 (4–6 s)** — the beam snaps back into a boat-shaped wave / small boat
  silhouette; the beam and boat slide toward the right, leaving the CRT. The
  phosphor decays with a long green afterglow.

## Required visual algorithms
- Black opaque CRT screen with a curved glass reflection, chrome ring, moulded
  bezel, screws, silkscreen labels, jewel lamp, knobs. Build a detailed static
  cached layer for the instrument; animate only the beam/hand/knobs.
- **Beam**: draw three passes (wide glow, tight glow, hot core) into an offscreen
  canvas with `lighter`; add dwell dots at sharp turns/ends; persistence trails
  from previous waveform samples. No `shadowBlur` on hundreds of segments if slow,
  but cached glows can be drawn.
- **ECG**: realistic PQRST beats with slowing rate; coupled to the scene time.
- **Lissajous**: x = A sin(3θ+φ), y = B sin(2θ), morph from the ECG to the curve
  with a spring/overshoot. Then map/assemble the text with a green mask.
- **Scanlines / hum**: 60 Hz subtle jitter, 2 px horizontal scanlines, a rolling
  brighter band, green spill on the bezel. Use seeded noise.
- **Hand/knob**: if you show a hand, make it a white cuff and wrist, lit green,
  turning a knob at the top right. It can be a simplified silhouette; it is a
  story detail, not the main art.
- Keep the screen round, with a vignette and glass reflections.

## Type
- The key line at center, 34–40 px monospace/tech green, with glow but readable.
  Mark `s13-readout`.
- Small readout labels 9–12 px in monospace; no more than 7 labels.
- Do not overlap the top-left card or top-right HUD with the CRT; place the scope
  face x≈300–1620, y≈190–1000.

## Palette
Black `#010703`, phosphor `#00ff66`, hot core `#d6ffe4`, dim green `#1b6a3d`,
bezel dark grey `#181a17`, chrome `#8e9186`, warm lamp `#ffb35c`.

## References in repo
`scene_17.js` for layered UI, `KIT.layer` for static CRT, `KIT.paper` for grain.

## Avoid
A flat green line on black; a circle with no instrument around it; a blurry
Lissajous mess; modern UI font; a text line that is unreadable; using real brand
names.
