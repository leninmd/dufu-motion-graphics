#!/usr/bin/env node
/**
 * Render the complete Web Audio score to a deterministic 48 kHz stereo WAV.
 *
 *   node audio/synth-score.mjs
 *   node audio/synth-score.mjs --duration 12 --out output/audio/test.wav
 *
 * The actual synthesis runs in Chromium's OfflineAudioContext; this Node file
 * only starts the static server, opens a blank audio surface and writes the WAV.
 */
import fs from 'node:fs';
import path from 'node:path';
import { startServer, ROOT } from '../tools/server.mjs';
import { launch, openPage } from '../tools/browser.mjs';
import { DURATION } from './score-meta.mjs';

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
const duration = a.duration ? Math.max(1, Math.min(DURATION, parseFloat(a.duration))) : DURATION;
const out = path.resolve(ROOT, a.out || 'output/audio/mix_v6.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
const srv = await startServer(0);
const { browser, close } = await launch({ width: 800, height: 600 });
const t0 = Date.now();
let wav = null;
try {
  const { page } = await openPage(browser, `${srv.url}/audio/offline.html`, { quiet: true, timeout: 120000 });
  const result = await page.evaluate(async (duration) => {
    const score = await import('/audio/score.js');
    const dsp = await import('/audio/dsp.js');
    const started = performance.now();
    const buffer = await score.renderScore({ duration });
    const analysis = dsp.analyse(buffer);
    const bytes = dsp.wavBytes(buffer);
    const dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(new Blob([bytes], { type: 'audio/wav' }));
    });
    return {
      b64: dataUrl.slice(dataUrl.indexOf(',') + 1),
      analysis,
      renderMs: Math.round(performance.now() - started),
      frames: buffer.length,
      sampleRate: buffer.sampleRate,
      duration: buffer.duration,
    };
  }, duration);
  wav = Buffer.from(result.b64, 'base64');
  fs.writeFileSync(out, wav);
  console.log(`[audio] ${path.relative(ROOT, out)}  ${(wav.length / 1048576).toFixed(1)} MB`);
  console.log(`[audio] ${result.duration.toFixed(3)}s · ${result.sampleRate} Hz · ${result.frames} frames/ch`);
  console.log(`[audio] peak ${result.analysis.peakDb} dBFS · RMS ${result.analysis.rmsDb} dBFS · synth ${(result.renderMs / 1000).toFixed(1)}s · wall ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  fs.writeFileSync(path.join(path.dirname(out), 'mix_v6.analysis.json'), JSON.stringify({
    ...result, b64: undefined, generatedBy: 'audio/synth-score.mjs',
  }, null, 2));
} finally {
  await close();
  await srv.close();
}
