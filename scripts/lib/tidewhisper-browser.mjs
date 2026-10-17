// Development-only browser bootstrap. Activate the candidate BEFORE Game and save schemas are imported.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
export async function tidewhisperBrowser({ port = 8114, software = true, highPerformance = false,
  viewport = { width: 1280, height: 720 }, quality = 'low', headless = true } = {}) {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore','pipe','pipe'] });
  let browser, stderr = '';
  server.stderr.on('data', d => { stderr += d; });
  const close = async () => {
    server.kill(); server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
    if (!browser) return;
    let timer;
    try {
      await Promise.race([browser.close(), new Promise(resolve => { timer = setTimeout(() => {
        const child = browser.process(); child?.kill(); browser.disconnect();
        for (const stream of child?.stdio ?? []) stream?.destroy?.(); child?.unref(); resolve();
      }, 10000); })]);
    } finally { clearTimeout(timer); }
  };
  try {
    await new Promise((resolve, reject) => {
      server.stdout.once('data', resolve); server.once('error', reject);
      server.once('exit', code => reject(new Error(stderr || `server exited ${code}`)));
    });
    const args = software ? ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] : [];
    if (highPerformance) args.push('--force-high-performance-gpu');
    if (!headless) args.push(`--window-size=${viewport.width},${viewport.height}`, '--start-fullscreen');
    browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      headless, args });
    const page = await browser.newPage(), errors = [];
    page.setDefaultTimeout(90000); await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text())) errors.push(m.text()); });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/main.js' && !url.searchParams.has('candidate-entry')) {
        return request.respond({ status: 200, contentType: 'application/javascript', body:
          "import {installTidewhisperCandidate} from '/tests/sim/lib/tidewhisperCandidate.mjs'; installTidewhisperCandidate(); await import('/src/main.js?candidate-entry');" });
      }
      return request.continue();
    });
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LANTERNMOSS);
    await page.evaluate(async quality => {
      const { setSetting } = await import('/src/core/settings.js'); setSetting('quality', quality); setSetting('pauseOnBlur', false);
    }, quality);
    return { browser, page, errors, close };
  } catch (error) { await close(); throw error; }
}
