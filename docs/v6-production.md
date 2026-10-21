# V6 《少陵测试》· Production Notes

> A 2:18 pure-code film. 18 eras, one continuous 4,739 km timeline, 69 bars at
> 120 BPM = 138.0 s = 8,280 frames at 60 fps.
> No external artwork. No recorded voice. No sampled audio. No unseeded randomness.

## 1. Contract

| Section | Bars | Local time | Film time |
|---|---:|---|---|
| Intro | 3 | 6.0 s | 00:00–00:06 |
| 18 eras | 3 each | 6.0 s each | 00:06–01:54 |
| Outro | 12 | 24.0 s | 01:54–02:18 |

Every era is a pure function:

```js
renderAt(ctx, u, beat, env)
```

`u` is clamped to `[0,6]`; the film compositor owns the frame, camera push, gate
transitions, era card, odometer, intro and outro. The same time always produces
the same pixels on the same build: no `Math.random`, `Date.now`, CSS transitions
or timers are allowed in a scene. All random streams come from `mulberry32`,
`hash`, `unit` or a local seeded PRNG.

## 2. Directory

```
preview/index.html           interactive inspection bench
film.html                    clean 1920×1080 render surface
src/beat/clock.js            BPM, scene windows, distance anchors, beatInfo
src/kit/                     math · canvas · paper · ink-engine · type · geometry3d
                             particles · frames · hud · debug
src/rig/dufu-rig.js          one continuous walker / rider / boat puppet
src/scenes/scene_01…18.js    one era per file, pure renderAt
src/main/manifest.js         18 era metadata, palettes, transition grammar
src/main/film.js             compositor, transitions, gallery tiles
src/main/intro.js            preface · stress diagram · seal crack
src/main/outro.js            5×4 wall, empty 19th seat, 1,455-star finale
src/main/app.js              browser API (renderAt / renderFrame / seek)
audio/dsp.js                 seeded synthesis DSP
audio/instruments.js         period instruments
audio/score.js               138 s Web Audio score
audio/synth-score.mjs        offline WAV renderer
audio/preview-audio.js       preview playback bridge
tools/contact-sheet.mjs      era + three-bar contact sheets
tools/qa-gate.mjs            deterministic/render/text/safe-zone quality gate
tools/render.mjs             multi-Chrome 1080p frame renderer
tools/encode.mjs             master / share / 720p H.264 + AAC
tools/prebake-collapse.mjs   Matter.js offline rigid-body pre-bake
tools/shot.mjs               stills / scene stills
briefs/                      one art & algorithm brief per era + SCENE_API.md
```

## 3. Camera and transition grammar

- The frame is rendered into a scene buffer, then composited with a small
  `1.0 → 1.06 → 1.0` push in the first bar and a 2% gate push in the last bar.
- Every era cuts on a bar line at `6 + 6i` seconds. The 0.64 s overlap is a
  material transition chosen per incoming era: stone seal, ink wipe, orbit,
  door slam, ledger slats, constructivist diagonal, glitch bars, gold stamp,
  shadow radial, wind, 15× zoom, water, CRT power, scan, pixel dissolve, Y2K
  window, 9:16 squeeze, code compile, and the final pull-back.
- Outgoing and incoming scenes are both rendered live during the transition;
  the mask is deterministic and seeded.
- The era card switches at the downbeat, not at the start of the overlap.
- The HUD odometer is monotonic by construction:
  `0 → 420 → 705 → 1037 → 1037 → 1150 → 1420 → 1880 → 2600 → 3100 → 3880 →
  4350 → 4739`, then holds through the modern eras and outro.

## 4. Art per era

| # | Era | Algorithm signature |
|---:|---|---|
| 01 | 汉唐石刻拓片 | threshold-eroded rubbing, granite tooth, white-line Han procession |
| 02 | 吴道子白描 | turbulent Bezier ribbons, variable-width ink, one-stroke calligraphy |
| 03 | 三维水墨点云 | 35,000 point cloud, orthographic 90° collapse into a single peak |
| 04 | 盛唐泥金界画 | ruled-perspective palace, gold/mineral palette, 1,600 block typefield, gate slam |
| 05 | 宋代尺页账簿 | album leaf, insect erosion, counting rods, ten-character physical pressure |
| 06 | 构成主义切割 | extruded type slabs, 45° compression, 1,200 frost shards |
| 07 | 表现主义木刻 | carved hatching, tape-strip glitch loop, split abyss |
| 08 | 金属球体挤压 | 260 cached PBR gold spheres, precomputed packing, letter compression |
| 09 | 关中镂空皮影 | 10 fps articulated leather puppets, rods, lamp, empty wire |
| 10 | 离屏粒子草堂 | 8,000 glyph roof particles, γ(t) bullet time, 0.012× rain beads, canopy |
| 11 | 北宋巨碑山水 | fractal cunfa monolith, 15× micro-scale reveal, falling leaves |
| 12 | 八大山人写意 | 85% negative space, sine-normal water shader, 180-particle gull |
| 13 | 绿色示波器 | round CRT, phosphor persistence, ECG → Lissajous → text |
| 14 | 刚体坍塌 | Matter.js pre-baked 64-body word collapse, red circles, question |
| 15 | 像素烂牌局 | 10 fps pixel HP band, perspective card flips, gold particles |
| 16 | 千禧年桌面 | fictional Y2K OS, 256-colour dither, beat-synced window shake |
| 17 | 竖屏短视频 | 9:16 phone, fictional UI, danmaku storm, like counter |
| 18 | 现代代码美学 | dark IDE typing on 16ths, live preview compile, 1,455-star river |

## 5. Audio

- One original pentatonic leitmotif: `A4 C5 D5 E5 G5 E5 D5 C5 A4`.
- 120 BPM; every crossing and spectacle is scheduled on the same bar grid as
  the picture.
- Era-specific synthesized voices: cello/guqin (intro), bianzhong/pipa/dizi
  (Tang), sub/gate/xiao (Chang'an), tape DSP (era 07), metal and wind (757–761),
  guqin/water (Bada), sine/60 Hz (oscilloscope), chiptune (pixel), MIDI popups
  (Y2K), lo-fi (shorts), piano/keyboard (code), full ensemble (outro).
- Era 07 is a real tape-style treatment: a bright 151.2 BPM, +4-semitone Tang
  buffer is pre-rendered, then played at a sliding `playbackRate → 0.7937` with
  a 0.6 Hz wow and four locked-groove slices on the bar-2 downbeat.
- Output: 48 kHz stereo 16-bit WAV, peak-normalized and M/S widened. No samples,
  no recorded voice, no external music.

## 6. Build

```powershell
pnpm install
node tools/server.mjs 5180              # open /preview/
node tools/prebake-collapse.mjs         # era 14 data (deterministic Matter.js)
node audio/synth-score.mjs              # output/audio/mix_v6.wav
node tools/render.mjs --workers 4 --resume
node tools/encode.mjs
node tools/contact-sheet.mjs --eras --out output/v6_pelican_paradigm/contact_sheet_18_eras.png
node tools/qa-gate.mjs
```

`npm run build` chains the whole pipeline.

## 7. QA gates

`node tools/qa-gate.mjs` verifies:

- 18 scene modules, timing constants, 8,280 frames and the distance anchors;
- monotone HUD distance over all 138 s;
- non-blank, non-uniform frames for every era at three bars;
- marked text within the 1920×1080 frame and title/HUD metadata present;
- double-render hashes identical for every era (determinism);
- every one of the 18 crossings renders without errors;
- intro, outro, wall, empty seat and final seal render;
- gallery tiles ready and 18 in number.

Contact sheet gates:

```powershell
node tools/contact-sheet.mjs --scenes 1,2,3,4,5
node tools/contact-sheet.mjs                 # all eras × three bars (54 frames)
node tools/contact-sheet.mjs --eras          # final 18-era sheet
```

## 8. Delivery

- `output/v6_pelican_paradigm/dufu_test_1080p.mp4`
- `output/v6_pelican_paradigm/dufu_test_1080p_share.mp4`
- `output/v6_pelican_paradigm/dufu_test_720p_preview.mp4`
- `output/v6_pelican_paradigm/contact_sheet_18_eras.png`
- `output/v6_qa/qa_report.json`
- `preview/index.html`

Large frame folders, WAV masters, and MP4 masters are intentionally git-ignored;
the source and deterministic tools rebuild them.
