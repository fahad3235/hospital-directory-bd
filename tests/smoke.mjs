/* Hospital Directory BD \u2014 headless-Chrome smoke tests via raw CDP (no deps).
   Run: node tests/smoke.mjs [width]   (default 1280; pass 390 for mobile)
   Uses the Playwright-cached headless_shell. Serves the app over file:// */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHELL = path.join(process.env.HOME, '.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell');
const WIDTH = parseInt(process.argv[2] || '1280', 10);
const HEIGHT = 900;
const PORT = 9335;

let failures = [];
let checks = 0;
function check(name, cond, extra = '') {
  checks++;
  if (cond) console.log('  PASS ' + name);
  else { failures.push(name + (extra ? ' \u2014 ' + extra : '')); console.log('  FAIL ' + name + (extra ? ' \u2014 ' + extra : '')); }
}

const chrome = spawn(SHELL, [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  `--remote-debugging-port=${PORT}`, `--window-size=${WIDTH},${HEIGHT}`,
  'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const j = await res.json();
      return j.webSocketDebuggerUrl;
    } catch { await sleep(250); }
  }
  throw new Error('CDP did not start');
}

async function main() {
  const browserWs = new WebSocket(await getWsUrl());
  await new Promise((res, rej) => { browserWs.onopen = res; browserWs.onerror = rej; });
  let msgId = 0;
  const pending = new Map();
  const events = [];
  browserWs.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method) events.push(m);
  };
  const send = (method, params = {}) => new Promise((res) => {
    const id = ++msgId;
    pending.set(id, res);
    browserWs.send(JSON.stringify({ id, method, params }));
  });

  const target = await send('Target.createTarget', { url: 'about:blank' });
  const targetId = target.result.targetId;
  const attached = await send('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = attached.result.sessionId;
  const sendS = (method, params = {}) => new Promise((res) => {
    const id = ++msgId;
    pending.set(id, res);
    browserWs.send(JSON.stringify({ id, sessionId, method, params }));
  });

  await sendS('Runtime.enable');
  await sendS('Page.enable');
  await sendS('Network.enable');
  await sendS('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH <= 500 });

  const consoleErrors = [];
  const pageErrors = [];
  const extRequests = [];
  const origOnMessage = browserWs.onmessage;
  browserWs.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.sessionId === sessionId && m.method === 'Runtime.exceptionThrown') {
      pageErrors.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description || ''));
    }
    if (m.sessionId === sessionId && m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push(m.params.args.map((a) => a.value || a.description || '').join(' '));
    }
    if (m.sessionId === sessionId && m.method === 'Network.requestWillBeSent') {
      const url = m.params.request.url;
      if (!url.startsWith('file://') && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('chrome')) {
        extRequests.push(url);
      }
    }
    origOnMessage(ev);
  };

  const evalJs = async (expr) => {
    const r = await sendS('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };

  const fileUrl = 'file://' + path.join(ROOT, 'index.html');
  await sendS('Page.navigate', { url: fileUrl });
  await sleep(1200);

  console.log(`== smoke @ ${WIDTH}px ==`);

  check('page title', (await evalJs('document.title')).includes('Hospital Directory BD'));
  check('h1 renders', (await evalJs(`document.querySelector('h1').textContent`)) === 'Hospital Directory BD');
  check('24 hospital cards render', (await evalJs(`document.querySelectorAll('.card').length`)) === 24,
    'got ' + (await evalJs(`document.querySelectorAll('.card').length`)));
  check('stat total is 24', (await evalJs(`document.getElementById('statTotal').textContent`)) === '24');
  check('stat divisions is 8', (await evalJs(`document.getElementById('statDivisions').textContent`)) === '8');
  check('stat 24h emergency is 18', (await evalJs(`document.getElementById('statEmergency').textContent`)) === '18');
  check('result count text', (await evalJs(`document.getElementById('resultCount').textContent`)) === '24 hospitals found');
  check('8 division chips', (await evalJs(`document.querySelectorAll('#divChips .chip').length`)) === 8);
  check('4 emergency cards', (await evalJs(`document.querySelectorAll('.emg-card').length`)) === 4);
  check('999 tel link present', (await evalJs(`document.querySelector('.emg-card').getAttribute('href')`)) === 'tel:999');
  check('DMCH phone link present', (await evalJs(`[...document.querySelectorAll('.phone')].some(a => a.textContent.includes('02-55165001'))`)) === true);
  check('no horizontal overflow (initial)', (await evalJs('document.documentElement.scrollWidth')) <= WIDTH + 1,
    'scrollWidth=' + (await evalJs('document.documentElement.scrollWidth')));

  // --- search ---
  await evalJs(`(function(){ const i=document.getElementById('fSearch'); i.value='shishu'; i.dispatchEvent(new Event('input')); })()`);
  await sleep(250);
  check('search shishu -> 1 card', (await evalJs(`document.querySelectorAll('.card').length`)) === 1);
  check('search result is Dhaka Shishu', (await evalJs(`document.querySelector('.card h3').textContent`)) === 'Dhaka Shishu Hospital');
  await evalJs(`(function(){ const i=document.getElementById('fSearch'); i.value='zzz-no-match'; i.dispatchEvent(new Event('input')); })()`);
  await sleep(250);
  check('no-match shows empty state', (await evalJs(`document.querySelector('.empty') !== null`)) === true);
  check('no horizontal overflow (empty state)', (await evalJs('document.documentElement.scrollWidth')) <= WIDTH + 1);
  await evalJs(`document.getElementById('clearFilters').click()`);
  await sleep(250);
  check('clear filters restores 24', (await evalJs(`document.querySelectorAll('.card').length`)) === 24);

  // --- filters ---
  await evalJs(`(function(){ const s=document.getElementById('fDivision'); s.value='sylhet'; s.dispatchEvent(new Event('change')); })()`);
  await sleep(250);
  check('division Sylhet -> 1 card', (await evalJs(`document.querySelectorAll('.card').length`)) === 1);
  await evalJs(`document.getElementById('clearFilters').click()`);
  await sleep(200);
  await evalJs(`(function(){ const s=document.getElementById('fType'); s.value='private'; s.dispatchEvent(new Event('change')); })()`);
  await sleep(250);
  check('type private -> 3 cards', (await evalJs(`document.querySelectorAll('.card').length`)) === 3);
  await evalJs(`document.getElementById('clearFilters').click()`);
  await sleep(200);
  await evalJs(`(function(){ const c=document.getElementById('fEmergency'); c.checked=true; c.dispatchEvent(new Event('change')); })()`);
  await sleep(250);
  check('24h emergency only -> 18 cards', (await evalJs(`document.querySelectorAll('.card').length`)) === 18);
  await evalJs(`document.getElementById('clearFilters').click()`);
  await sleep(200);

  // --- division chip ---
  await evalJs(`document.querySelector('[data-div="rangpur"]').click()`);
  await sleep(250);
  check('chip Rangpur -> 1 card', (await evalJs(`document.querySelectorAll('.card').length`)) === 1);
  await evalJs(`document.getElementById('clearFilters').click()`);
  await sleep(200);

  // --- favourite ---
  await evalJs(`document.querySelector('[data-fav="dmch"]').click()`);
  await sleep(250);
  check('favourite star activates', (await evalJs(`document.querySelector('[data-fav="dmch"]').classList.contains('active')`)) === true);
  await evalJs(`(function(){ const c=document.getElementById('fFavOnly'); c.checked=true; c.dispatchEvent(new Event('change')); })()`);
  await sleep(250);
  check('favourites only -> 1 card', (await evalJs(`document.querySelectorAll('.card').length`)) === 1);
  await evalJs(`document.getElementById('clearFilters').click()`);
  await sleep(200);

  // --- language toggle ---
  await evalJs(`document.getElementById('langToggle').click()`);
  await sleep(300);
  check('BN toggle changes h1', (await evalJs(`document.querySelector('h1').textContent`)) === '\u09b9\u09be\u09b8\u09aa\u09be\u09a4\u09be\u09b2 \u09a1\u09bf\u09b0\u09c7\u0995\u09cd\u099f\u09b0\u09bf \u09ac\u09bf\u09a1\u09bf');
  check('BN digits in stats', /[\u09e6-\u09ef]/.test(await evalJs(`document.getElementById('statTotal').textContent`)));
  check('BN card name shown', (await evalJs(`document.querySelector('[data-id="dmch"] h3').textContent`)).includes('\u09a2\u09be\u0995\u09be'));
  await evalJs(`document.getElementById('langToggle').click()`);
  await sleep(250);
  check('toggle back to English', (await evalJs(`document.querySelector('h1').textContent`)) === 'Hospital Directory BD');

  // --- add a custom hospital (validation first, then success) ---
  await evalJs(`document.getElementById('addBtn').click()`);
  await sleep(250);
  check('dialog opens', (await evalJs(`document.getElementById('formDialog').open`)) === true);
  await evalJs(`document.getElementById('saveForm').click()`);
  await sleep(250);
  check('empty form shows name error', (await evalJs(`document.querySelector('[data-err="name"]').textContent`)).length > 0);
  check('invalid add keeps 24 cards', (await evalJs(`document.querySelectorAll('.card').length`)) === 24);
  await evalJs(`(function(){
    document.getElementById('fName').value = 'Test Community Clinic';
    document.getElementById('fDistrict').value = 'Gazipur';
    document.getElementById('fAddress').value = 'Test Road 1, Gazipur';
    document.getElementById('fPhone').value = '02-1234567';
    document.getElementById('fDivisionForm').value = 'dhaka';
    document.getElementById('fTypeForm').value = 'private';
    document.getElementById('fCategoryForm').value = 'general';
    document.getElementById('fServices').value = 'emergency, medicine';
    document.getElementById('saveForm').click();
  })()`);
  await sleep(300);
  check('dialog closes after save', (await evalJs(`document.getElementById('formDialog').open`)) === false);
  check('custom hospital added -> 25 cards', (await evalJs(`document.querySelectorAll('.card').length`)) === 25);
  check('custom badge shown', (await evalJs(`document.querySelector('.badge.custom') !== null`)) === true);
  check('custom persisted', (await evalJs(`JSON.parse(localStorage.getItem('hdb:custom')).length`)) === 1);
  check('custom phone link is tel:', (await evalJs(`[...document.querySelectorAll('.phone')].some(a => a.getAttribute('href') === 'tel:+88021234567')`)) === true);

  // --- edit the custom hospital ---
  await evalJs(`document.querySelector('[data-edit]').click()`);
  await sleep(250);
  check('edit fills name', (await evalJs(`document.getElementById('fName').value`)) === 'Test Community Clinic');
  await evalJs(`(function(){ document.getElementById('fName').value='Test Community Clinic 2'; document.getElementById('saveForm').click(); })()`);
  await sleep(300);
  check('edit renames card', (await evalJs(`[...document.querySelectorAll('.card h3')].some(h => h.textContent === 'Test Community Clinic 2')`)) === true);
  check('still 25 cards after edit', (await evalJs(`document.querySelectorAll('.card').length`)) === 25);

  // --- delete the custom hospital ---
  await evalJs(`(function(){ window.confirm = () => true; document.querySelector('[data-del]').click(); })()`);
  await sleep(300);
  check('delete restores 24 cards', (await evalJs(`document.querySelectorAll('.card').length`)) === 24);
  check('delete clears storage', (await evalJs(`JSON.parse(localStorage.getItem('hdb:custom')).length`)) === 0);

  // --- reload persistence: favourite survives ---
  await sendS('Page.navigate', { url: fileUrl });
  await sleep(1000);
  check('favourite persists after reload', (await evalJs(`document.querySelector('[data-fav="dmch"]').classList.contains('active')`)) === true);
  check('24 cards after reload', (await evalJs(`document.querySelectorAll('.card').length`)) === 24);

  // --- error / network hygiene ---
  check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('zero page exceptions', pageErrors.length === 0, pageErrors.join(' | '));
  check('zero non-file network requests', extRequests.length === 0, extRequests.join(', '));

  console.log(`\n${checks - failures.length}/${checks} checks passed${failures.length ? ', FAILURES:\n- ' + failures.join('\n- ') : ''}`);

  browserWs.close();
  chrome.kill();
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => { console.error('SMOKE CRASH:', e); chrome.kill(); process.exit(1); });
