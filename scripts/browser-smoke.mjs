#!/usr/bin/env node
// Real Chromium smoke checks. Never log genealogy records, names or images.
// Browser network access is restricted to localhost and locally checked-out common assets.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve(process.cwd());
const repo = process.env.GITHUB_REPOSITORY?.split('/').pop() || 'site';
const desktopCases = ['box1', 'box2a', 'box2b', 'box2c', 'box2d']
  .flatMap(base => [base + '.html', base + '-en.html'])
  .map(file => ({file, device:'desktop', viewport:{width:1280,height:850}}));
// Representative phone screens: public and private, HR and EN.
const phoneCases = ['box1', 'box2a']
  .flatMap(base => [base + '.html',base + '-en.html'])
  .map(file => ({file, device:'phone', viewport:{width:390,height:844}}));
// Extra edge cases for narrow and landscape mobile viewports.
const edgePhoneCases = ['box2a.html', 'box2a-en.html'].flatMap(file => [
  {file, device:'narrow-phone', viewport:{width:320,height:568}},
  {file, device:'landscape-phone', viewport:{width:667,height:375}}
]);
const cases = [...desktopCases, ...phoneCases, ...edgePhoneCases];
const host = 'http://127.0.0.1:8765';
const mime = {'.js':'text/javascript','.css':'text/css','.json':'application/json',
 '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp',
 '.svg':'image/svg+xml','.gif':'image/gif','.woff2':'font/woff2','.ico':'image/x-icon'};
const failures = [];
const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
try {
  for (const {file, device, viewport} of cases) {
    const page = await browser.newPage({ viewport, isMobile:device!=='desktop', hasTouch:device!=='desktop', acceptDownloads:false });
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
      if (device !== 'desktop') {
        const mobileLayout = await page.evaluate(() => {
          const svg = document.getElementById('treeSvg');
          const search = document.getElementById('searchCode');
          const rect = svg?.getBoundingClientRect();
          const input = search?.getBoundingClientRect();
          return {diagramVisible:!!rect && rect.width>0 && rect.height>0,
            searchVisible:!!input && input.width>0 && input.height>0,
            viewportMeta:!!document.querySelector('meta[name="viewport"]')};
        });
        if (!mobileLayout.diagramVisible || !mobileLayout.searchVisible || !mobileLayout.viewportMeta)
          throw Error('mobile diagram/search/viewport structure unavailable');
      }
      if (device !== 'desktop') {
        // Read-only geometry audit. SVG canvas may intentionally pan/zoom;
        // report control warnings only, never alter site styles or content.
        const geometry = await page.evaluate(() => {
          const ids = ['findBtn', 'fullscreenDiagram', 'printDiagram', 'zoomIn', 'zoomOut'];
          return ids.map(id => {
            const el = document.getElementById(id);
            if (!el) return {id, state:'missing'};
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            const shown = r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
            return {id, state:shown?'visible':'hidden',
              width:Math.round(r.width),height:Math.round(r.height),
              small:shown && (r.width < 24 || r.height < 24),
              outside:shown && (r.right < 0 || r.left > innerWidth),
              centerCovered: shown && (() => {
                const x = Math.max(0,Math.min(innerWidth-1,r.left+r.width/2));
                const y = Math.max(0,Math.min(innerHeight-1,r.top+r.height/2));
                if (y < 0 || y >= innerHeight) return false; // scrollable controls can be below fold
                const top = document.elementFromPoint(x,y);
                return !!top && top !== el && !el.contains(top);
              })()};
          });
        });
        const warnings = geometry.filter(x => x.state !== 'visible' || x.small || x.outside);
        const overflow = await page.evaluate(() => {
          const d = document.documentElement;
          return Math.max(d.scrollWidth,document.body.scrollWidth)-d.clientWidth;
        });
        const zoom = geometry.filter(x => x.id === 'zoomIn' || x.id === 'zoomOut');
        console.log('MOBILE-AUDIT: '+file+' ('+device+') zoom='+zoom.map(x=>x.id+':'+x.width+'x'+x.height+(x.centerCovered?':covered':'')).join(',')+' overflow='+Math.round(overflow)+'px');
        if (warnings.length) {
          console.log('REVIEW: '+file+' ('+device+') — '+warnings.map(w=>w.id+':'+(w.state!=='visible'?w.state:w.small?'small':'offscreen')).join(',')+' (not proof of defect)');
        }
      }
      if (device !== 'desktop') {
        // Pointer-level check: scroll to the control, then verify its center
        // can receive a real click. Never log page contents or person data.
        for (const id of ['zoomIn', 'zoomOut']) {
          const target = page.locator('#'+id);
          await target.evaluate(el => el.scrollIntoView({block:'center', inline:'nearest'}));
          await page.waitForTimeout(80);
          const hit = await target.evaluate(el => {
            const r=el.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
            if (x<0 || y<0 || x>=innerWidth || y>=innerHeight) return 'outside-viewport';
            const top=document.elementFromPoint(x,y);
            if (!top) return 'no-hit-target';
            return (top===el || el.contains(top)) ? 'target' : 'obstructed';
          });
          await target.evaluate(el => { el.dataset.smokePointerClicked=''; el.addEventListener('click', () => {el.dataset.smokePointerClicked='yes';},{once:true}); });
          let pointer='timeout';
          try {
            await target.click({timeout:2500});
            pointer=await target.evaluate(el=>el.dataset.smokePointerClicked==='yes'?'clicked':'not-received');
          } catch { pointer='not-clickable'; }
          const diagnostic = await target.evaluate(el => {
            const r=el.getBoundingClientRect();
            const x=r.left+r.width/2,y=r.top+r.height/2;
            const top=(x>=0&&x<innerWidth&&y>=0&&y<innerHeight)?document.elementFromPoint(x,y):null;
            const header=document.getElementById('diagramHeader')?.getBoundingClientRect();
            return {x:Math.round(x),y:Math.round(y),vw:innerWidth,vh:innerHeight,
              topTag:top?.tagName||'none',topId:top?.id||'-',topClass:String(top?.className?.baseVal||top?.className||'-').slice(0,55),
              headerBottom:Math.round(header?.bottom||0),scrollY:Math.round(window.scrollY)};
          });
          console.log('HIT-DETAIL: '+file+' ('+device+') '+id+' '+JSON.stringify(diagnostic));
          console.log('TOUCH-CHECK: '+file+' ('+device+') '+id+' center='+hit+' pointer='+pointer);
        }
        // Restore standard fit after testing, without mutating any persisted data.
        await page.locator('#fit').evaluate(el=>el.click());
      }
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
      // Check safe image-card markup only when a portrait is present.
      const photoCheck = await page.evaluate(() => {
        const box = document.getElementById('personDetails');
        const imgs = [...(box?.querySelectorAll('figure.person-details-photo img') || [])];
        return {
          count: imgs.length,
          allAlt: imgs.every(img => !!img.getAttribute('alt')),
          allLinks: imgs.every(img => img.closest('a')?.rel.includes('noopener')),
          allExternal: imgs.every(img => {
            try { const u = new URL(img.src); return u.protocol === 'https:' && u.hostname === 'tandarajure-crypto.github.io'; }
            catch { return false; }
          })
        };
      });
      if (photoCheck.count && (!photoCheck.allAlt || !photoCheck.allLinks || !photoCheck.allExternal))
        throw Error('person card photograph markup invalid');

      // Validate print layout without producing a private PDF or screenshot.
      await page.emulateMedia({media:'print'});
      const printable = await page.locator('#treeSvg').evaluate(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none';
      });
      await page.emulateMedia({media:'screen'});
      if (!printable) throw Error('diagram hidden in print layout');

      // Follow the real language-switch hyperlink; do not log URL or person records.
      const counterpart = file.includes('-en.') ? file.replace('-en.html','.html') : file.replace('.html','-en.html');
      const languageLink = page.locator('a[href="'+counterpart+'"]').first();
      if (await languageLink.count() !== 1) throw Error('language switch hyperlink missing');
      await languageLink.evaluate(el => el.click());
      await page.waitForURL(u => u.pathname.endsWith('/'+counterpart),{timeout:7000});
      const switched = await page.locator('html').getAttribute('lang');
      if (!(switched || '').startsWith(file.includes('-en.')?'hr':'en')) throw Error('language switch destination invalid');
      console.log('PASS: '+file+' ('+device+') — diagram/search/wide/print/layout/language link/photo markup');
    } catch(e) {
      // Do not print JavaScript errors or page content from private data.
      const safe = String(e?.message||'').split('\n')[0].replace(/https?:\S+/g,'[url]').slice(0,140);
      console.log('FAIL: '+file+' ('+device+') — '+safe);
      failures.push(file+' ('+device+')');
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
console.log('Browser smoke: '+(cases.length-failures.length)+'/'+cases.length+' passed');
if (failures.length) process.exitCode=1;
