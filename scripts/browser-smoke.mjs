#!/usr/bin/env node
// Real Chromium smoke checks. Never log genealogy records, names or images.
// Browser network access is restricted to localhost and locally checked-out common assets.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve(process.cwd());
const repo = process.env.GITHUB_REPOSITORY?.split('/').pop() || 'site';
const cases = ['box1', 'box2a', 'box2b', 'box2c', 'box2d']
  .flatMap(base => [base + '.html', base + '-en.html']);
const host = 'http://127.0.0.1:8765';
const mime = {'.js':'text/javascript','.css':'text/css','.json':'application/json',
 '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp',
 '.svg':'image/svg+xml','.gif':'image/gif','.woff2':'font/woff2','.ico':'image/x-icon'};
const failures = [];
const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
try {
  for (const file of cases) {
    const page = await browser.newPage({ viewport:{width:1280,height:850}, acceptDownloads:false });
    const pageErrorKinds = new Set();
    page.on('pageerror', error => pageErrorKinds.add(error.name || 'Error'));
    try {
      page.setDefaultTimeout(7000);
      await page.route('**/*', async route => {
        const u = new URL(route.request().url());
        if (u.hostname === '127.0.0.1' && u.port === '8765') return route.continue();
        if (u.hostname === 'tandarajure-crypto.github.io' && u.pathname.startsWith('/tandara-common/')) {
          const relative = decodeURIComponent(u.pathname.slice('/tandara-common/'.length));
          if (relative.split('/').includes('..') || relative.startsWith('/')) return route.abort();
          const path = resolve(root, 'tandara-common', relative);
          if (!path.startsWith(resolve(root,'tandara-common')+'/')) return route.abort();
          try {
            const body = await readFile(path);
            return route.fulfill({status:200, body, contentType:mime[extname(path).toLowerCase()] || 'application/octet-stream',
              headers:{'access-control-allow-origin':'*'}});
          } catch { return route.fulfill({status:404, body:''}); }
        }
        return route.abort();
      });
      const response = await page.goto(host + '/site/' + file, {waitUntil:'domcontentloaded',timeout:30000});
      if (response?.status() !== 200) throw Error('document not served');
      await page.waitForSelector('#nodesLayer [data-code]', {timeout:18000});
      const ready = await page.locator('#nodesLayer [data-code]').count();
      if (!ready) throw Error('diagram node not rendered');
      const searchCode = page.locator('#searchCode');
      const rootCode = await page.locator('body').getAttribute('data-root-code');
      if (!rootCode) throw Error('missing root-code attribute');
      await page.evaluate(code => { const el = document.getElementById('searchCode'); el.value = code; el.dispatchEvent(new Event('input',{bubbles:true})); }, rootCode);
      await page.locator('#findBtn').evaluate(el => el.click());
      await page.waitForTimeout(200);
      const detailShown = await page.locator('#personDetails').evaluate(el => !el.hidden);
      if (!detailShown) {
        const diag = await page.evaluate(() => ({
          renderedNodes: document.querySelectorAll('#nodesLayer [data-code]').length,
          resultVisible: !document.getElementById('searchResults')?.hidden,
          searchFieldHasValue: !!document.getElementById('searchCode')?.value,
          detailBoxExists: !!document.getElementById('personDetails'),
          lastStatusPresent: !!document.getElementById('diagramStatus')?.textContent?.trim()
        }));
        throw Error('search card did not open; '+JSON.stringify(diag)+'; errors='+[...pageErrorKinds].join(','));
      }
      await page.locator('#fullscreenDiagram').evaluate(el => el.click());
      if (!(await page.locator('body').evaluate(el=>el.classList.contains('diagram-wide'))))
        throw Error('fullscreen toggle failed');
      await page.locator('#fullscreenDiagram').evaluate(el => el.click());
      await page.evaluate(() => { window.__printCalled = false; window.print = () => {window.__printCalled=true;} });
      await page.locator('#printDiagram').evaluate(el => el.click());
      if (!(await page.evaluate(() => window.__printCalled))) throw Error('print handler failed');
      const lang = await page.locator('html').getAttribute('lang');
      if (!(lang || '').startsWith(file.includes('-en.')?'en':'hr')) throw Error('language incorrect');
      console.log('PASS: '+file+' — diagram/search/wide/print controls');
    } catch(e) {
      // Do not print JavaScript errors or page content from private data.
      const safe = String(e?.message||'').split('\n')[0].replace(/https?:\S+/g,'[url]').slice(0,140);
      console.log('FAIL: '+file+' — '+safe);
      failures.push(file);
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
console.log('Browser smoke: '+(cases.length-failures.length)+'/'+cases.length+' passed');
if (failures.length) process.exitCode=1;
