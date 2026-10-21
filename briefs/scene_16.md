# 16 · 千禧年复古桌面 · 历史检索系统 / Y2K Retro OS Windows · 2000s

**Global time** 01:36–01:42 → local `u ∈ [0,6]`. **Card/HUD handled by main.**

## The idea
A fictional 2000s desktop operating system searches the archive of history for
Du Fu. Gray bevelled windows pile up; every later reader is a pop-up. Han Yu and
Su Shi issue verdicts:
- 韩愈: 「李杜文章在，光焰万丈长！」
- 苏轼: 「古今诗人众矣，而杜子美为首！」
On the bar-2 beat the classic chat-window shake/jitter hits on the beat, the
taskbar says `对方（后世千年读书人）正在输入...`, and the windows stack/glitch.
In bar 3 everything minimizes into a floppy/CD, and the frame narrows to a
9:16 thumbnail before the short-video era (the main vertical transition does the
outer squeeze).

## Beats
- **Bar 1 (0–2 s)** — a teal gradient desktop with 256-color dither, a fake
  `诗史检索.exe` window, a progress bar `正在检索 1,455 首诗…`, a list of dates.
  Pop-up 1 (Han Yu) appears with a title-bar bevel and a beige body:
  `「李杜文章在，光焰万丈长！」`. A pixel hourglass cursor moves. Other windows
  behind: `杜甫.dat`, `全唐诗索引`, a floppy icon. All window motion is 10 fps
  (quantize) while the cursor can be smooth.
- **Bar 2 (2.0 s exactly)** — pop-up 2 (Su Shi) cascades with a ding. The
  chat window shakes violently on the beat (screen-space displacement 4–8 px
  for 0.15 s), then settles. Taskbar shows `对方（后世千年读书人）正在输入...`.
  Add a fake error window `[ 检索结果：1,455 条记录 ]` and a progress bar filling.
  The two quotations must be fully legible even during the shake.
- **Bar 3 (4–6 s)** — all windows minimize with a zoom animation into a single
  disk icon at the lower right; the screen clears to a desktop with a single
  window `正在打开：2020s...`. The outer 9:16 transition is handled by the film,
  but the desktop can darken and offer a `继续` button.

## Required visual algorithms
- Authentic but fictional Y2K UI: light-gray #d4d0c8, 3D bevels (white top/left,
  dark gray bottom/right, black outer), blue gradient title bars, 11 px pixel-ish
  text, scrollbars, checkboxes, radio buttons, tooltips, hourglass cursor,
  desktop icons, wallpaper gradient with dithering. No real OS logos or brands.
- 256-color dither noise overlay; scanline/CRT subtle; pixel fonts via mono.
- Windows as layered draggable cards with shadows, clipped scroll areas.
- Progress bar, list view, search field, taskbar clock, Start-like button
  (invented label `检索`), tray icons.
- Shake via whole-window offset on beats, quantized to 10 fps. Use a deterministic
  jitter amount from `u` and window id, not random.
- The two historical quotes should be in a refined Song serif *inside* the OS body,
  creating a medium clash: ancient text in a beige dialog box.

## Type
- Window titles 11–13 px mono; quote text 26–34 px serif, black/ink, on cream.
  Han Yu quote in window 1, Su Shi in window 2; mark `s16-hanyu`, `s16-sushi`.
- Taskbar ticker 11–13 px, high contrast. `对方（后世千年读书人）正在输入...`
- Keep top-left card and top-right HUD clear; use x≈80–1800, y≈180–960.

## Composition / safe areas
- Desktop 1920×1080; main Han Yu window x≈380–1240, y≈230–640; Su Shi window
  overlapping x≈660–1580, y≈420–820. Search window behind.
- Taskbar at y≈1010–1080.
- All key text > 24 px for QA; window body quote large.

## Palette
Desktop teal `#2b89a8`/`#0f5b7a`, chrome `#d4d0c8`, title navy `#0a246a`,
title gradient `#4a7fd4`, beige `#ece9d8`, black `#111`, red `#a52a22`,
blue accent `#103e79`.

## References in repo
`scene_17.js` for UI craft, `KIT.paper.desktop`, `KIT.paper.frosted`,
`KIT.drawText`, local pixel UI helpers.

## Avoid
Real Windows/macOS logos or exact icons; flat modern cards; too much text;
a shaky screen that makes the quotes unreadable; using a real app name.
