#!/usr/bin/env node
// Exhaustive German left-navigation browser test: 10 DE pages x 10 menu links = 100 real clicks.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve(process.cwd());
const host = 'http://127.0.0.1:8765';
const pages = [
  'autor-de.html',
  'upute-de.html',
  'podrijetlo-de.html',
  'rodoslovlje-de.html',
  'migracije-de.html',
  'zivot-de.html',
  'zanimljivosti-de.html',
  'kontakti-de.html',
  'knjiga-poruka-de.html',
  'privatnost-de.html'
];
const routes = {
  author: 'autor-de.html',
  instructions: 'https://tandarajure-crypto.github.io/tandara-common/Pdf/WEB-tandara.anleitung.pdf',
  origin: 'podrijetlo-de.html',
  genealogy: 'rodoslovlje-de.html',
  migration: 'migracije-de.html',
  life: 'zivot-de.html',
  facts: 'zanimljivosti-de.html',
  contact: 'kontakti-de.html',
  guestbook: 'knjiga-poruka-de.html',
  privacy: 'privatnost-de.html'
};
const expectedKeys = Object.keys(routes);
const labels = {
  author: 'Über den Autor und das Projekt',
  instructions: 'Anleitung',
  origin: 'Herkunft des Familiennamens',
  genealogy: 'Familienstammbaum',
  migration: 'Migration und Verbreitung',
  life: 'Leben durch drei Jahrhunderte',
  facts: 'Wissenswertes',
  contact: 'Kontakt und Zusammenarbeit',
  guestbook: 'Gästebuch',
  privacy: 'Datenschutzerklärung'
};
const mime = {'.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp',
  '.svg':'image/svg+xml','.gif':'image/gif','.woff2':'font/woff2','.ico':'image/x-icon'};
const failures = [];
const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(2500);
  const runtimeErrors = [];
  page.on('pageerror', e => runtimeErrors.push(e.name || 'Error'));
  page.on('requestfailed', r => console.error('REQUEST FAILED '+r.url()+' '+(r.failure()?.errorText || '')));
  await page.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.hostname === 'tandarajure-crypto.github.io' && u.pathname === '/tandara-common/Pdf/WEB-tandara.anleitung.pdf') {
      const pdfPath = resolve(root, 'tandara-common', 'Pdf/WEB-tandara.anleitung.pdf');
      try {
        const body = await readFile(pdfPath);
        return route.fulfill({status:200, body, contentType:'application/pdf'});
      } catch {
        return route.fulfill({status:404, body:'German PDF guide missing'});
      }
    }
    if (u.hostname === '127.0.0.1' && u.port === '8765') return route.continue();
    if (u.hostname === 'tandarajure-crypto.github.io' && u.pathname.startsWith('/tandara-common/')) {
      const relative = decodeURIComponent(u.pathname.slice('/tandara-common/'.length));
      if (relative.split('/').includes('..') || relative.startsWith('/')) return route.abort();
      const path = resolve(root, 'tandara-common', relative);
      if (!path.startsWith(resolve(root,'tandara-common')+'/')) return route.abort();
      try {
        const body = await readFile(path);
        return route.fulfill({status:200,body,contentType:mime[extname(path).toLowerCase()] || 'application/octet-stream',
          headers:{'access-control-allow-origin':'*'}});
      } catch { return route.fulfill({status:404,body:''}); }
    }
    return route.abort();
  });

  for (const source of pages) {
    const sourceResponse = await page.goto(host + '/site/' + source,{waitUntil:'domcontentloaded'});
    if (sourceResponse?.status() !== 200) {
      failures.push(source+' cannot be loaded');
      continue;
    }
    await page.waitForSelector('#site-shell [data-nav-key]',{state:'attached'});
    const sourceLang = await page.locator('html').getAttribute('lang');
    if (sourceLang !== 'de') failures.push(source+' has html lang='+sourceLang);

    const foundKeys = await page.locator('#site-shell [data-nav-key]').evaluateAll(els=>els.map(e=>e.dataset.navKey));
    if (foundKeys.length !== 10 || expectedKeys.some(k=>!foundKeys.includes(k)))
      failures.push(source+' menu key set incorrect: '+foundKeys.join(','));

    for (const key of expectedKeys) {
      try {
        const link = page.locator('#site-shell [data-nav-key="'+key+'"]');
        const href = await link.getAttribute('href');
        const visibleLabel = (await link.innerText()).trim();
        if (visibleLabel !== labels[key]) {
          failures.push(source+' -> '+key+' label expected '+labels[key]+' got '+visibleLabel);
          continue;
        }
        const expectedRoute = routes[key];
        const actualRoute = key === 'instructions' ? new URL(href,host+'/site/').href : new URL(href,host+'/site/').pathname.split('/').pop();
        if (actualRoute !== expectedRoute) {
          failures.push(source+' -> '+key+' href expected '+routes[key]+' got '+actualRoute);
          continue;
        }
        const currentFile = new URL(page.url()).pathname.split('/').pop();
        if (key === 'instructions') {
          const targetUrl = expectedRoute;
          const responsePromise = page.waitForResponse(response => response.url() === targetUrl && response.status() === 200, {timeout:10000});
          const [pdfResponse] = await Promise.all([responsePromise, link.click({noWaitAfter:true})]);
          const contentType = pdfResponse.headers()['content-type'] || '';
          if (!contentType.toLowerCase().includes('application/pdf')) {
            throw Error('German guide response has content type '+contentType);
          }
          console.log('PASS '+source+' -> instructions -> German PDF');
          await page.goto(host+'/site/'+source,{waitUntil:'domcontentloaded'});
          await page.waitForSelector('#site-shell [data-nav-key]',{state:'attached'});
          continue;
        }
        if (currentFile === routes[key]) {
          // The current-page menu item is a real click, but may not trigger a reload.
          await link.click({noWaitAfter:true});
          if (new URL(page.url()).pathname.split('/').pop() !== currentFile)
            throw Error('current-page link changed URL unexpectedly');
        } else {
          const targetUrl = new URL(href, page.url()).href;
          console.log('CLICK '+source+' -> '+key+' href='+targetUrl+' from='+page.url());
          await Promise.all([
            page.waitForURL(url => url.href === targetUrl, {timeout:1500}),
            link.click({noWaitAfter:true})
          ]);
          const targetResponse = await page.request.get(targetUrl);
          if (targetResponse.status() !== 200) throw Error('HTTP '+targetResponse.status());
        }
        const landedFile = new URL(page.url()).pathname.split('/').pop();
        if (landedFile !== routes[key]) throw Error('landed on '+landedFile);
        const lang = await page.locator('html').getAttribute('lang');
        if (lang !== 'de') throw Error('destination lang='+lang);
        const heading = (await page.locator('h1').first().textContent().catch(()=>''))?.trim();
        if (!heading) throw Error('German destination has no H1');
        console.log('PASS '+source+' -> '+key+' -> '+landedFile);
      } catch (e) {
        failures.push(source+' -> '+key+' click failed: '+String(e?.message||e).split('\n')[0].slice(0,180));
        await page.goto(host+'/site/'+source,{waitUntil:'domcontentloaded'}).catch(()=>{});
        await page.waitForSelector('#site-shell [data-nav-key]',{state:'attached'}).catch(()=>{});
      }
    }
  }
  if (runtimeErrors.length) failures.push('browser runtime errors: '+[...new Set(runtimeErrors)].join(','));
  console.log('GERMAN NAVIGATION: '+(100-failures.length)+'/100 clicks passed');
  if (failures.length) {
    for (const failure of failures) console.error('FAIL '+failure);
    process.exitCode=1;
  }
} finally {
  await browser.close();
}
