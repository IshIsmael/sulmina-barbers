'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const app = require('./preview-server');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

function findChrome() {
  const found = CHROME_CANDIDATES.find(candidate => fs.existsSync(candidate));
  if (!found) throw new Error('Chrome or Edge was not found in the standard Windows install paths.');
  return found;
}

function getPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function listen(expressApp) {
  return new Promise((resolve, reject) => {
    const server = expressApp.listen(0, '127.0.0.1');
    server.once('error', reject);
    server.once('listening', () => resolve(server));
  });
}

async function waitForJson(url, timeoutMs = 8000) {
  const started = Date.now();
  let lastErr;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (err) {
      lastErr = err;
    }
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  throw lastErr || new Error('Timed out waiting for ' + url);
}

function connectCdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();
    const listeners = new Map();
    const subscribers = new Map();

    function send(method, params = {}) {
      const id = nextId++;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((res, rej) => {
        pending.set(id, { res, rej, method });
      });
    }

    function once(method) {
      return new Promise(res => {
        const bucket = listeners.get(method) || [];
        bucket.push(res);
        listeners.set(method, bucket);
      });
    }

    function on(method, fn) {
      const bucket = subscribers.get(method) || [];
      bucket.push(fn);
      subscribers.set(method, bucket);
    }

    ws.addEventListener('open', () => resolve({ ws, send, once, on }));
    ws.addEventListener('error', reject);
    ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej, method } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(`${method}: ${msg.error.message}`));
        else res(msg.result || {});
        return;
      }
      if (msg.method && listeners.has(msg.method)) {
        const bucket = listeners.get(msg.method);
        const listener = bucket.shift();
        if (bucket.length === 0) listeners.delete(msg.method);
        if (listener) listener(msg.params || {});
      }
      if (msg.method && subscribers.has(msg.method)) {
        subscribers.get(msg.method).forEach(fn => fn(msg.params || {}));
      }
    });
  });
}

async function navigate(client, url) {
  const loaded = client.once('Page.loadEventFired');
  await client.send('Page.navigate', { url });
  await loaded;
  await new Promise(resolve => setTimeout(resolve, 350));
}

async function capture(client, baseUrl, route, options) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: options.width,
    height: options.height,
    deviceScaleFactor: 1,
    mobile: options.mobile
  });
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: options.mobile });
  await navigate(client, baseUrl + route);

  const metrics = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const clipped = Array.from(document.querySelectorAll('h1,h2,h3,p,a,button,strong,span'))
        .filter(el => {
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          return el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0;
        })
        .slice(0, 8)
        .map(el => ({
          tag: el.tagName,
          className: el.className,
          text: (el.innerText || el.textContent || '').trim().slice(0, 80),
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth
        }));
      const cta = document.querySelector('.site-header__cta');
      const toggle = document.querySelector('.menu-toggle');
      const selectedDate = document.querySelector('.date-pill.is-selected');
      const pageHead = document.querySelector('.page-head');
      const map = document.querySelector('.contact-grid__map');
      const mapRect = map ? map.getBoundingClientRect() : null;
      const hairCuts = document.querySelector('#group-haircuts')
        ? document.querySelector('#group-haircuts').closest('.booking-cat')
        : null;
      return {
        title: document.title,
        path: location.pathname,
        innerWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        h1: document.querySelector('h1')?.innerText,
        pageHeadHeight: pageHead ? Math.round(pageHead.getBoundingClientRect().height) : null,
        headerCtaDisplay: cta ? getComputedStyle(cta).display : null,
        menuToggleDisplay: toggle ? getComputedStyle(toggle).display : null,
        mobileMenuCloseExists: Boolean(document.querySelector('[data-menu-close]')),
        hasBookingPage: Boolean(document.querySelector('[data-booking-page]')),
        bookingSectionCount: document.querySelectorAll('.booking-section').length,
        dateLinkCount: document.querySelectorAll('.date-pill[href*="date="]').length,
        selectedDateHref: selectedDate ? selectedDate.href : null,
        selectedDateText: selectedDate ? selectedDate.innerText : null,
        serviceCategoryCount: document.querySelectorAll('.booking-cat').length,
        serviceJumpCount: document.querySelectorAll('.service-jump a').length,
        hairCutsText: hairCuts ? hairCuts.innerText : '',
        mapRect: mapRect ? {
          left: Math.round(mapRect.left),
          right: Math.round(mapRect.right),
          width: Math.round(mapRect.width)
        } : null,
        clipped
      };
    })()`
  });

  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false
  });
  const file = path.join(os.tmpdir(), `sulmina-${options.name}.png`);
  fs.writeFileSync(file, Buffer.from(screenshot.data, 'base64'));
  return { file, metrics: metrics.result.value };
}

(async function run() {
  const server = await listen(app);
  const serverPort = server.address().port;
  const debugPort = await getPort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sulmina-chrome-'));
  const chrome = spawn(findChrome(), [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    const tab = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
    const client = await connectCdp(tab.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    const browserIssues = [];
    client.on('Runtime.exceptionThrown', params => {
      browserIssues.push(params.exceptionDetails?.text || 'Runtime exception');
    });
    client.on('Log.entryAdded', params => {
      if (params.entry?.level === 'error') {
        const text = params.entry.text || '';
        const isDevtoolsProbe = text.includes('/.well-known/appspecific/com.chrome.devtools.json');
        const isExternalMapNoise = text.includes('maps.google.com') || text.includes('googleapis.com');
        if (!isDevtoolsProbe && !isExternalMapNoise) browserIssues.push(text);
      }
    });

    const baseUrl = `http://127.0.0.1:${serverPort}`;
    const desktop = await capture(client, baseUrl, '/', {
      name: 'home-desktop-cdp',
      width: 1440,
      height: 1200,
      mobile: false
    });
    const mobileHome = await capture(client, baseUrl, '/', {
      name: 'home-mobile-cdp',
      width: 390,
      height: 1200,
      mobile: true
    });
    const desktopBooking = await capture(client, baseUrl, '/book?service=skin-fade', {
      name: 'booking-desktop-cdp',
      width: 1280,
      height: 1200,
      mobile: false
    });
    const mobileBooking = await capture(client, baseUrl, '/book?service=skin-fade', {
      name: 'booking-mobile-cdp',
      width: 390,
      height: 1200,
      mobile: true
    });
    const mobileServices = await capture(client, baseUrl, '/services', {
      name: 'services-mobile-cdp',
      width: 390,
      height: 1200,
      mobile: true
    });
    const mobileAbout = await capture(client, baseUrl, '/about', {
      name: 'about-mobile-cdp',
      width: 390,
      height: 1200,
      mobile: true
    });
    const mobileGallery = await capture(client, baseUrl, '/gallery', {
      name: 'gallery-mobile-cdp',
      width: 390,
      height: 1200,
      mobile: true
    });
    const mobileContact = await capture(client, baseUrl, '/contact', {
      name: 'contact-mobile-cdp',
      width: 390,
      height: 1200,
      mobile: true
    });
    await navigate(client, baseUrl + '/book?service=skin-fade');
    const dateInteraction = await client.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `new Promise(resolve => {
        const before = document.querySelector('.date-pill.is-selected')?.href || '';
        const target = Array.from(document.querySelectorAll('.date-pill'))
          .find(link => !link.classList.contains('is-selected'));
        if (!target) {
          resolve({ ok: false, reason: 'no alternate date', before, after: before, url: location.href });
          return;
        }
        target.click();
        setTimeout(() => {
          const selected = document.querySelector('.date-pill.is-selected');
          resolve({
            ok: Boolean(selected),
            before,
            clicked: target.href,
            after: selected ? selected.href : '',
            selectedText: selected ? selected.innerText : '',
            url: location.href,
            dateLong: document.querySelector('.slots-head')?.innerText || ''
          });
        }, 700);
      })`
    });
    await navigate(client, baseUrl + '/');
    const menuInteraction = await client.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `new Promise(resolve => {
        const toggle = document.querySelector('.menu-toggle');
        const close = document.querySelector('[data-menu-close]');
        if (!toggle || !close) {
          resolve({ ok: false, reason: 'menu controls missing', hasToggle: Boolean(toggle), hasClose: Boolean(close) });
          return;
        }
        toggle.click();
        setTimeout(() => {
          const opened = document.body.classList.contains('menu-open');
          const closeDisplay = getComputedStyle(close).display;
          close.click();
          setTimeout(() => {
            resolve({
              ok: opened && !document.body.classList.contains('menu-open'),
              opened,
              closed: !document.body.classList.contains('menu-open'),
              closeDisplay,
              toggleLabel: toggle.getAttribute('aria-label'),
              menuHidden: document.querySelector('#mobile-menu')?.getAttribute('aria-hidden')
            });
          }, 180);
        }, 180);
      })`
    });

    assert.notStrictEqual(desktop.metrics.headerCtaDisplay, 'none');
    assert.match(desktop.metrics.h1, /Southgate\s+cuts\s+with character/i);
    assert.strictEqual(mobileHome.metrics.innerWidth, 390);
    assert.strictEqual(mobileHome.metrics.headerCtaDisplay, 'none');
    assert.notStrictEqual(mobileHome.metrics.menuToggleDisplay, 'none');
    assert.ok(mobileHome.metrics.scrollWidth <= 391, 'home mobile has horizontal overflow');
    assert.ok(mobileHome.metrics.bodyScrollWidth <= 391, 'home mobile body has horizontal overflow');
    assert.ok(mobileBooking.metrics.scrollWidth <= 391, 'booking mobile has horizontal overflow');
    assert.ok(mobileBooking.metrics.bodyScrollWidth <= 391, 'booking mobile body has horizontal overflow');
    for (const page of [mobileServices, mobileAbout, mobileGallery, mobileContact]) {
      assert.ok(page.metrics.scrollWidth <= 391, `${page.metrics.path} mobile has horizontal overflow`);
      assert.ok(page.metrics.bodyScrollWidth <= 391, `${page.metrics.path} mobile body has horizontal overflow`);
      assert.ok(page.metrics.pageHeadHeight === null || page.metrics.pageHeadHeight <= 430, `${page.metrics.path} page head is too tall`);
    }
    assert.ok(mobileServices.metrics.serviceJumpCount >= 4, 'services category jump links missing');
    assert.match(mobileServices.metrics.hairCutsText, /Skin Fade/i, 'skin fade is not visible in hair cuts');
    assert.match(mobileServices.metrics.hairCutsText, /Taper Fade/i, 'taper fade is not visible in hair cuts');
    assert.ok(mobileContact.metrics.mapRect, 'contact map missing on mobile');
    assert.ok(mobileContact.metrics.mapRect.left >= 0, 'contact map is shifted left');
    assert.ok(mobileContact.metrics.mapRect.right <= mobileContact.metrics.innerWidth + 1, 'contact map is shifted right');
    assert.ok(desktopBooking.metrics.hasBookingPage, 'desktop booking page marker missing');
    assert.ok(mobileBooking.metrics.hasBookingPage, 'mobile booking page marker missing');
    assert.ok(mobileBooking.metrics.bookingSectionCount >= 3, 'single-page booking sections missing');
    assert.ok(mobileBooking.metrics.dateLinkCount >= 7, 'visible booking dates are not selectable links');
    assert.ok(dateInteraction.result.value.ok, dateInteraction.result.value.reason || 'date interaction failed');
    assert.notStrictEqual(dateInteraction.result.value.before, dateInteraction.result.value.after, 'date selection did not change');
    assert.match(dateInteraction.result.value.url, /\/book\?[^#]*date=/, 'date click did not keep /book URL in sync');
    assert.ok(menuInteraction.result.value.ok, menuInteraction.result.value.reason || 'mobile menu close interaction failed');
    assert.deepStrictEqual(browserIssues, []);

    const result = {
      desktop,
      mobileHome,
      desktopBooking,
      mobileBooking,
      mobileServices,
      mobileAbout,
      mobileGallery,
      mobileContact,
      dateInteraction: dateInteraction.result.value,
      menuInteraction: menuInteraction.result.value
    };
    console.log(JSON.stringify(result, null, 2));
    client.ws.close();
  } finally {
    chrome.kill();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(err => {
  console.error(err.stack || err.message);
  process.exit(1);
});
