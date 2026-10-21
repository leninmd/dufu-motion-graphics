#!/usr/bin/env node
/**
 * vertical.mjs — the portrait delivery cut (抖音 / 视频号 / 小红书).
 *
 * The film is a locked 16:9 composition: every era card, the odometer, the
 * couplets and the 19-cell wall are all placed against a 1,920 × 1,080 frame.
 * Cropping it to 9:16 would amputate two thirds of the picture, so this tool
 * never crops the film. It fits the whole frame to the width of the phone and
 * floats it in a vertically stretched, blurred bed built from the same footage —
 * the standard cinematic treatment, with zero information lost.
 *
 *   node tools/vertical.mjs                  # 1080×1920 (抖音主投)
 *   node tools/vertical.mjs --h 1280 --crf 21 --out-dir output/v6_1_master
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './server.mjs';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    out[k] = v;
  }
  return out;
}
const a = parseArgs(process.argv.slice(2));
const H = parseInt(a.h ?? '1920', 10);
const W = parseInt(a.w ?? String(Math.round(H * 9 / 16 / 2) * 2), 10);
const crf = parseInt(a.crf ?? '18', 10);
const preset = String(a.preset ?? 'slow');
const src = path.resolve(ROOT, a.in || 'output/v6_1_master/dufu_test_v6_1_1080p.mp4');
const outDir = path.resolve(ROOT, a.out || 'output/v6_1_master');
const suffix = a.name || `${W}x${H}`;
const out = path.join(outDir, a.out_name || `dufu_test_v6_1_${suffix}.mp4`);

const ffmpeg = (() => {
  const local = path.join(ROOT, 'tools', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  return fs.existsSync(local) ? local : (process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
})();

if (!fs.existsSync(src)) throw new Error(`missing source: ${src}`);
fs.mkdirSync(outDir, { recursive: true });

// The film band keeps its exact 16:9 ratio and sits slightly above centre (it
// must stay clear of Douyin's caption bar). The bed is the same footage, blown
// up, blurred and pushed down to a dark ambient wash so the band reads as a lit
// screen in a dark room rather than a stamp floating on a smear.
const filmH = Math.round(W * 1080 / 1920 / 2) * 2;
const bedW = Math.max(64, Math.round(W / 4 / 2) * 2);
const bedH = Math.max(64, Math.round(H / 4 / 2) * 2);
const yOff = a.y != null
  ? Math.round(parseFloat(a.y))
  : Math.round((H - filmH) / 2);

// `scale` preserves the display aspect ratio by rewriting the pixel aspect, so
// every leg of this graph must force a square SAR or the phone plays the file
// as 16:9 inside a 9:16 box.
const filter = [
  `[0:v]setsar=1,scale=${W}:${filmH}:flags=lanczos,setsar=1[fg]`,
  `[0:v]setsar=1,scale=${bedW}:${bedH}:flags=bicubic,gblur=sigma=14,` +
  `scale=${W}:${H}:flags=bicubic,eq=brightness=-0.44:saturation=1.30,vignette=PI/4,setsar=1[bed]`,
  `[bed][fg]overlay=0:${yOff}:shortest=1,setsar=1[comp]`,
  `[comp]drawbox=x=0:y=${yOff}:w=${W}:h=${filmH}:color=0xC8A456@0.34:t=1,format=yuv420p[out]`,
].join(';');

const args = [
  '-y', '-hide_banner', '-loglevel', 'warning',
  '-i', src,
  '-filter_complex', filter,
  '-map', '[out]', '-map', '0:a:0',
  '-c:v', 'libx264', '-crf', String(crf), '-preset', preset,
  '-profile:v', 'high', '-level', '4.2',
  '-r', '60', '-g', '120', '-keyint_min', '60',
  '-color_range', 'tv', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart',
  out,
];

console.log(`[vertical] ${W}×${H} · film band ${W}×${filmH} · crf ${crf}`);
const r = spawnSync(ffmpeg, args, { stdio: 'inherit', cwd: ROOT });
if (r.status !== 0) throw new Error('ffmpeg failed');
const st = fs.statSync(out);
console.log(`${path.relative(ROOT, out)}  ${(st.size / 1048576).toFixed(1)} MB`);
