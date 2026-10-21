# Third-party notices — V6 《少陵测试 / The Du Fu Test》

This film contains **no external image, video or recorded audio assets**. Every
frame and every sample is produced by the code in this repository at render time.
The third-party components below are tools, fonts or technique references.

## Runtime / build tools

| Component | Version | License | Use |
|---|---|---|---|
| [Playwright](https://playwright.dev/) (`playwright-core`) | 1.64.x | Apache-2.0 | headless Chromium frame capture, contact sheets, QA, offline audio export |
| [Matter.js](https://brm.io/matter-js/) | 0.20.0 | MIT | offline pre-baking of era 14's rigid-body collapse (`tools/prebake-collapse.mjs`, `src/generated/collapse.js`) |
| Chromium | bundled/installed Playwright build | BSD-style | Canvas 2D and Web Audio rendering |
| FFmpeg (`tools/ffmpeg.exe`) | local build | LGPL-2.1-or-later / GPL depending on build | H.264/AAC encoding. The binary is not part of the source repository. |

Matter.js is used only as a deterministic physical simulation at build/development
time; the runtime scene reads the baked transforms and never depends on live
random physics. No Matter.js source has been copied into `src/`.

## Typefaces

The `assets/fonts/` directory is not tracked (large binaries; obtained via the
existing font-fetch tooling in this repository). The film requests these fonts,
with local serif fallbacks when absent:

- **Noto Serif SC** — SIL Open Font License 1.1.
- **Source Han Serif SC** — SIL Open Font License 1.1.
- **Ma Shan Zheng** — SIL Open Font License 1.1.
- **LXGW WenKai** — SIL Open Font License 1.1.
- **STKaiti / KaiTi** — a locally installed system font; not redistributed by
  this repository. The film falls back to Noto Serif SC when unavailable.

## Technique and architecture references

The following open-source films were read before building V6. Their **architecture
and working method** informed this project (timeline-first scene module layout,
shared kit, P5/Canvas scene files, contact-sheet QA, offline Web Audio synthesis,
pre-baked physics). No source files, scenes, drawings, compositions, jokes, code
fragments, audio recordings or assets from them are included or copied into V6.

- **The-Pelican-Test** by Royce Bella — MIT License —
  https://github.com/RoyceBella-commits/The-Pelican-Test
  - Techniques studied: a shared time/geometry contract, scene registry, rider as
    a time-parameterised rig, multi-Chrome frame workers, contact sheets, Web Audio
    instrument graph and tape-speed DSP.
- **meme67-art-history** by Tunai-0511 — MIT License —
  https://github.com/Tunai-0511/meme67-art-history
  - Techniques studied: scene API, per-era briefs, deterministic scene drawing,
    shot/sheet/render/encode tool split.

The existing project `leninmd/dufu-motion-graphics` (the same repository's V1–V4)
was also mined for its own reusable ideas (TypeField, ink/brush toolkit, rigid-body
pre-baking, wind fields). It is this project's own prior work.

## Algorithms

All algorithms in `src/kit`, `src/scenes`, `src/rig`, `src/audio` are independently
written for this film. The following are public-domain / standard published
techniques, implemented from first principles:

- Karplus–Strong plucked-string synthesis and fractional delay.
- Schroeder-style decaying-noise convolution impulses.
- Perlin/value-noise, fBm, ridged noise and Catmull–Rom curves.
- Lissajous figures, orthographic/perspective projection and mid/side stereo width.
- Matter.js rigid-body integration (offline pre-bake only).

## No real platform marks

The 9:16 short-video interface in era 17, the Y2K operating system in era 16 and
all editors/dialogs are fictional. No real app icons, logos, trade dress or
trademarks are used.

## Film / source copyright

The code is © the project author. The generated film, music and visuals are
original works. Public-domain poetry by Du Fu is quoted; the fictional report
title and all modern captions are original writing.
