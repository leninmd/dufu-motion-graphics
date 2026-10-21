import path from 'node:path';
import { startServer, ROOT } from './server.mjs';
import { launch, openPage } from './browser.mjs';
const srv = await startServer(0);
const { browser, close } = await launch({ width: 1600, height: 1050 });
try {
  const { page } = await openPage(browser, `${srv.url}/preview/`, { quiet: false });
  await page.waitForFunction("!document.getElementById('boot')", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
  const out = path.resolve(ROOT, 'output/v6_smoke/preview.png');
  await page.screenshot({ path: out, fullPage: true, type: 'png' });
  console.log(out);
  await page.click('#btn-play');
  await page.waitForTimeout(2500);
  const state = await page.evaluate(() => ({
    preview: window.__PREVIEW ? {
      section: window.__PREVIEW.state.section,
      t: window.__PREVIEW.state.t,
      playing: window.__PREVIEW.state.playing,
    } : null,
    audio: window.__DFT_AUDIO ? window.__DFT_AUDIO.status() : null,
    frame: window.__DFT_LAST_FRAME,
    sound: document.getElementById('sound-state')?.textContent,
  }));
  console.log(JSON.stringify({ ...state, frame: state.frame && { t: state.frame.t, section: state.frame.section } }, null, 2));
  const out2 = path.resolve(ROOT, 'output/v6_smoke/preview_play.png');
  await page.screenshot({ path: out2, fullPage: true, type: 'png' });
  console.log(out2);
} finally { await close(); await srv.close(); }
