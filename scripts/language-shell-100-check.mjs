#!/usr/bin/env node
// 100-round language-shell verification for both Tandara web repositories.
// Each round loads every HR, EN and DE page and checks the rendered shared shell.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve(process.cwd());
const host = 'http://127.0.0.1:8765';
const rounds = 100;
const languages = ['hr', 'en', 'de'];
const families = [
  {key:'author', pages:{hr:'autor-hr.html',en:'autor-en.html',de:'autor-de.html'}},
  {key:'instructions', pages:{hr:'upute.html',en:'upute-en.html',de:'upute-de.html'}},
  {key:'origin', pages:{hr:'podrijetlo-hr.html',en:'podrijetlo-en.html',de:'podrijetlo-de.html'}},
  {key:'genealogy', pages:{hr:'rodoslovlje-hr.html',en:'rodoslovlje-en.html',de:'rodoslovlje-de.html'}},
  {key:'migration', pages:{hr:'migracije-hr.html',en:'migracije-en.html',de:'migracije-de.html'}},
  {key:'life', pages:{hr:'zivot.html',en:'zivot-en.html',de:'zivot-de.html'}},
  {key:'facts', pages:{hr:'zanimljivosti.html',en:'zanimljivosti-en.html',de:'zanimljivosti-de.html'}},
  {key:'contact', pages:{hr:'kontakti.html',en:'contacts.html',de:'kontakti-de.html'}},
  {key:'guestbook', pages:{hr:'knjiga-poruka.html',en:'visitors-messages.html',de:'knjiga-poruka-de.html'}},
  {key:'privacy', pages:{hr:'privatnost.html',en:'privacy.html',de:'privatnost-de.html'}},
  {key:'home', pages:{hr:'index.html',en:'index-en.html',de:'index-de.html'}}
];
const navKeys = ['author','instructions','origin','genealogy','migration','life','facts','contact','guestbook','privacy'];
const routeByKey = Object.fromEntries(families.filter(x=>x.key!=='home').map(x=>[x.key,x.pages]));
const sites = [
  {name:'PUBLIC', prefix:'/site'},
  {name:'PRIVATE', prefix:'/private'}
];
const mime = {'.js':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp',
  '.svg':'image/svg+xml','.gif':'image/gif','.woff2':'font/woff2','.ico':'image/x-icon'};
const failures = [];
const versions = {};
let completed = 0;
const expected = rounds * sites.length * families.length * languages.length;
const addFailure = message => { if (failures.length < 200) failures.push(message); };

const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('requestfailed', request => {
    const u = new URL(request.url());
    if (u.hostname === 'tandarajure-crypto.github.io' && u.pathname.startsWith('/tandara-common/')) {
      addFailure('COMMON REQUEST FAILED '+request.url()+' '+(request.failure()?.errorText||''));
    }
  });
  page.on('response', response => {
    const u = new URL(response.url());
    if (u.hostname === 'tandarajure-crypto.github.io' && u.pathname.startsWith('/tandara-common/') && response.status() >= 400) {
      addFailure('COMMON HTTP '+response.status()+' '+response.url());
    }
  });
  await page.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1' && u.port === '8765') return route.continue();
    if (u.hostname === 'tandarajure-crypto.github.io' && u.pathname.startsWith('/tandara-common/')) {
      const relative = decodeURIComponent(u.pathname.slice('/tandara-common/'.length));
      if (relative.split('/').includes('..') || relative.startsWith('/')) return route.abort();
      const base = resolve(root,'tandara-common');
      const path = resolve(base,relative);
      if (!path.startsWith(base+'/')) return route.abort();
      try {
        const body = await readFile(path);
        return route.fulfill({status:200,body,contentType:mime[extname(path).toLowerCase()]||'application/octet-stream',
          headers:{'access-control-allow-origin':'*'}});
      } catch {
        return route.fulfill({status:404,body:'Missing shared asset: '+relative});
      }
    }
    return route.abort();
  });

  for (let round=1; round<=rounds; round++) {
    for (const site of sites) {
      for (const family of families) {
        for (const lang of languages) {
          const file = family.pages[lang];
          const url = host + site.prefix + '/' + file;
          try {
            const response = await page.goto(url,{waitUntil:'domcontentloaded'});
            if (!response || response.status() !== 200) throw Error('page HTTP '+(response?.status()??'no response'));
            await page.waitForFunction(() => document.body?.classList.contains('site-shell-ready'),null,{timeout:15000});

            const state = await page.evaluate(() => {
              const get = selector => document.querySelector(selector);
              const links = [...document.querySelectorAll('#site-shell [data-nav-key]')];
              const script = [...document.scripts].find(s => s.src.includes('/tandara-common/js/site-shell.js'));
              const css = [...document.querySelectorAll('link[rel="stylesheet"]')].find(l => l.href.includes('/tandara-common/css/site-shell.css'));
              const languageLinks = {
                hr:get('[data-role="hr-link"]')?.getAttribute('href')||'',
                en:get('[data-role="en-link"]')?.getAttribute('href')||'',
                de:get('[data-role="de-link"]')?.getAttribute('href')||''
              };
              return {
                htmlLang:document.documentElement.lang,
                bodyLang:document.body.dataset.lang,
                authority:window.TandaraLanguage?.current||'',
                ready:document.body.classList.contains('site-shell-ready'),
                nav:links.map(a=>({key:a.dataset.navKey,text:a.textContent.trim(),href:a.getAttribute('href')})),
                switchHidden:get('[data-role="language-switch"]')?.hidden??true,
                languageLinks,
                pageMap:{hr:document.body.dataset.pageHr||'',en:document.body.dataset.pageEn||'',de:document.body.dataset.pageDe||''},
                script:script?.src||'',
                css:css?.href||''
              };
            });

            if (state.htmlLang!==lang || state.bodyLang!==lang || state.authority!==lang) {
              throw Error('language mismatch html/body/authority='+[state.htmlLang,state.bodyLang,state.authority].join('/'));
            }
            if (!state.ready) throw Error('shared shell did not become ready');
            if (state.nav.length!==10 || navKeys.some(k=>!state.nav.some(n=>n.key===k))) {
              throw Error('navigation key set incorrect: '+state.nav.map(n=>n.key).join(','));
            }
            if (state.nav.some(n=>!n.text || !n.href)) throw Error('empty navigation label or href');
            if (state.switchHidden) throw Error('language switch is hidden');

            for (const targetLang of languages) {
              const expectedFile = family.pages[targetLang];
              const href = state.languageLinks[targetLang];
              const actualFile = new URL(href,url).pathname.split('/').pop();
              if (actualFile!==expectedFile) throw Error(targetLang+' language switch expected '+expectedFile+' got '+actualFile);
            }
            for (const nav of state.nav) {
              const expectedFile = routeByKey[nav.key]?.[lang];
              const actualFile = new URL(nav.href,url).pathname.split('/').pop();
              if (!expectedFile || actualFile!==expectedFile) {
                throw Error('menu '+nav.key+' expected '+expectedFile+' got '+actualFile);
              }
            }
            for (const selector of ['[data-role="hr-flag"]','[data-role="en-flag"]','[data-role="de-flag"]']) {
              const src = await page.locator('#site-shell '+selector).getAttribute('src');
              if (!src) throw Error('missing flag image '+selector);
            }

            const scriptVersion = new URL(state.script).searchParams.get('v')||'';
            const cssVersion = new URL(state.css).searchParams.get('v')||'';
            const versionKey = site.name+'/'+family.key;
            versions[versionKey] ||= {};
            versions[versionKey][lang] ||= {script:scriptVersion,css:cssVersion};
            if (versions[versionKey][lang].script!==scriptVersion || versions[versionKey][lang].css!==cssVersion) {
              throw Error('asset version changed during repeated loads');
            }
            completed++;
          } catch (error) {
            addFailure('ROUND '+round+' '+site.name+' '+lang+' '+file+': '+String(error?.message||error).split('\n')[0].slice(0,220));
            if (completed+failures.length>expected+200) break;
          }
        }
      }
    }
    if (round%10===0) console.log('PROGRESS '+round+'/'+rounds+' rounds; '+completed+'/'+expected+' page loads passed');
  }

  for (const site of sites) {
    for (const family of families) {
      const v = versions[site.name+'/'+family.key]||{};
      if (v.en && v.de && (v.en.script!==v.de.script || v.en.css!==v.de.css)) {
        addFailure(site.name+' '+family.key+' DE assets differ from EN: '+JSON.stringify({en:v.en,de:v.de}));
      }
      if (!v.hr || !v.en || !v.de) addFailure(site.name+' '+family.key+' missing language version record: '+JSON.stringify(v));
    }
  }

  console.log('TOTAL PAGE LOAD CHECKS: '+completed+'/'+expected);
  console.log('ROUNDS COMPLETED: '+rounds);
  console.log('LANGUAGE/ASSET VERSION MATRIX: '+JSON.stringify(versions));
  if (failures.length) {
    for (const failure of failures) console.error('FAIL '+failure);
    process.exitCode=1;
  } else {
    console.log('RESULT: ALL '+expected+' PAGE LOAD CHECKS PASSED');
  }
  await context.close();
} finally {
  await browser.close();
}
