#!/usr/bin/env node
/**
 * Encode the final deliverables:
 *   output/v6_pelican_paradigm/dufu_test_1080p.mp4          (master)
 *   output/v6_pelican_paradigm/dufu_test_1080p_share.mp4    (share)
 *   output/v6_pelican_paradigm/dufu_test_720p_preview.mp4   (preview)
 *
 *   node tools/encode.mjs
 *   node tools/encode.mjs --from-frames output/v6_work/frames_draft --draft
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
const framesDir = path.resolve(ROOT, a['from-frames'] || 'output/v6_work/frames');
const wav = path.resolve(ROOT, a.audio || 'output/audio/mix_v6.wav');
const outDir = path.resolve(ROOT, a.out || 'output/v6_pelican_paradigm');
fs.mkdirSync(outDir, { recursive: true });

const ffmpeg = (() => {
  const local = path.join(ROOT, 'tools', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  if (fs.existsSync(local)) return local;
  return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
})();

const frameFiles = fs.readdirSync(framesDir).filter((f) => /^f\d{5}\.(jpg|png)$/.test(f));
if (!frameFiles.length) throw new Error(`no frames in ${framesDir}`);
const hasAudio = fs.existsSync(wav);
if (!hasAudio) console.warn(`WARNING: no audio at ${wav}; encoding a silent master.`);

function run(args, label) {
  console.log(`[encode] ${label}`);
  const r = spawnSync(ffmpeg, args, { stdio: 'inherit', cwd: ROOT });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${label}`);
}

const master = path.join(outDir, 'dufu_test_1080p.mp4');
const share = path.join(outDir, 'dufu_test_1080p_share.mp4');
const preview = path.join(outDir, 'dufu_test_720p_preview.mp4');

const input = [
  '-framerate', '60', '-start_number', '0', '-i', path.join(framesDir, 'f%05d.jpg'),
];
if (hasAudio) input.push('-i', wav);
const maps = hasAudio ? ['-map', '0:v:0', '-map', '1:a:0'] : ['-map', '0:v:0'];
const audioArgs = hasAudio ? ['-c:a', 'aac', '-b:a', '224k', '-shortest'] : ['-an'];

run([
  '-y', '-hide_banner', '-loglevel', 'warning',
  ...input,
  ...maps,
  '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-r', '60',
  '-x264-params', 'keyint=120:min-keyint=60:aq-mode=3',
  '-color_range', 'tv', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  ...audioArgs, '-movflags', '+faststart',
  master,
], '1080p60 master');

run([
  '-y', '-hide_banner', '-loglevel', 'warning',
  '-i', master,
  '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-pix_fmt', 'yuv420p',
  ...(hasAudio ? ['-c:a', 'aac', '-b:a', '160k'] : ['-an']),
  '-movflags', '+faststart', share,
], '1080p share');

run([
  '-y', '-hide_banner', '-loglevel', 'warning',
  '-i', master,
  '-vf', 'scale=1280:720:flags=lanczos',
  '-c:v', 'libx264', '-crf', '26', '-preset', 'medium', '-pix_fmt', 'yuv420p',
  ...(hasAudio ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an']),
  '-movflags', '+faststart', preview,
], '720p preview');

for (const f of [master, share, preview]) {
  const st = fs.statSync(f);
  console.log(`${path.relative(ROOT, f)}  ${(st.size / 1048576).toFixed(1)} MB`);
}
console.log(`audio: ${hasAudio ? path.relative(ROOT, wav) : 'SILENT (no WAV found)'}`);
