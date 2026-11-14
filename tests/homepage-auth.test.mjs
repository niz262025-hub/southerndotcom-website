import test from 'node:test';
import assert from 'node:assert/strict';
import { importSrc } from './helpers/load-src.mjs';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

const { SessionProvider, AuthNav, ProductAction, useSession } = await importSrc('session.jsx');
const { MyOpsHomePage } = await importSrc('App.jsx');

const products = [{ slug: 'opsp' }, { slug: 'opsfinance' }, { slug: 'opsflow' }, { slug: 'opswms', comingSoon: true }];
const signedOut = { signedIn: false };
const signedInState = (states) => ({ signedIn: true, email: 'user@example.test', products: {
  opsp: 'active', opsfinance: 'none', opsflow: 'coming_soon', opswms: 'coming_soon', opshr: 'coming_soon', ...states } });

function Refresher() {
  const { refresh } = useSession();
  return createElement('button', { id: 'passive', onClick: () => refresh(false) }, 'probe');
}
function Page({ enabled = true }) {
  return createElement(SessionProvider, { enabled }, createElement('div', null,
    createElement(AuthNav), createElement(Refresher),
    ...products.map((product) => createElement('article', { key: product.slug, id: product.slug },
      createElement(ProductAction, { product })))));
}

async function mount(respond, enabled = true) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://trusted-preview.vercel.app/' });
  const originals = Object.fromEntries(['window', 'document', 'Element', 'HTMLElement', 'fetch', 'IS_REACT_ACT_ENVIRONMENT'].map((key) => [key, globalThis[key]]));
  const calls = [];
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    return respond(body);
  };
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(createElement(Page, { enabled })));
  const cleanup = async () => {
    await act(async () => root.unmount());
    Object.assign(globalThis, originals);
    dom.window.close();
  };
  return { calls, cleanup, dom };
}
async function mountHome(respond) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://www.myops.com.my/' });
  const originals = Object.fromEntries(['window', 'document', 'Element', 'HTMLElement', 'fetch', 'IS_REACT_ACT_ENVIRONMENT'].map((key) => [key, globalThis[key]]));
  globalThis.fetch = async () => respond();
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(createElement(SessionProvider, { enabled: true },
    createElement(MyOpsHomePage, { authEnabled: true, production: true }))));
  const cleanup = async () => {
    await act(async () => root.unmount());
    Object.assign(globalThis, originals);
    dom.window.close();
  };
  return { cleanup, dom };
}
const text = (selector) => document.querySelector(selector)?.textContent ?? '';
const nav = () => [...document.querySelectorAll('.nav-auth a, .nav-auth button')].map((node) => node.textContent);

test('MYOPS root shows the original landing page before and after login', async () => {
  const signedOutPage = await mountHome(() => Response.json(signedOut));
  try {
    assert.ok(document.querySelector('.landing-shell .hero'));
    assert.equal(document.querySelector('#auth-title'), null);
    assert.ok(document.querySelector('img[src="/images/myops-hero-bg.webp"]'));
    assert.ok(document.querySelector('.nav-auth a[href="/login"]'));
    assert.match(document.querySelector('#applications').textContent, /OpsFinance/);
  } finally { await signedOutPage.cleanup(); }

  const signedInPage = await mountHome(() => Response.json(signedInState()));
  try {
    assert.ok(document.querySelector('.landing-shell .hero'));
    assert.equal(document.querySelector('#auth-title'), null);
    assert.deepEqual(nav(), ['My Account', 'Log keluar semua aplikasi']);
  } finally { await signedInPage.cleanup(); }
});

test('signed-out visitors see Register and Login, and Subscribe on live cards', async () => {
  const { cleanup } = await mount(() => Response.json(signedOut));
  try {
    assert.deepEqual(nav(), ['Register', 'Login']);
    assert.equal(document.querySelector('.nav-auth a[href="/register"]').textContent, 'Register');
    assert.equal(document.querySelector('.nav-auth a[href="/login"]').textContent, 'Login');
    for (const slug of ['opsp', 'opsfinance', 'opsflow']) {
      assert.equal(text(`#${slug} .product-action`), 'Subscribe');
      assert.equal(document.querySelector(`#${slug} a`).getAttribute('href'), '/login');
      assert.equal(document.querySelector(`#${slug} button`), null);
    }
    assert.equal(document.querySelector('#opswms').textContent, '');
  } finally { await cleanup(); }
});

test('signed-in users see My Account and Logout instead of Register and Login', async () => {
  const { cleanup } = await mount(() => Response.json(signedInState()));
  try {
    assert.deepEqual(nav(), ['My Account', 'Log keluar semua aplikasi']);
    assert.equal(document.querySelector('.nav-auth a').getAttribute('href'), '/account');
    assert.ok(!nav().includes('Register') && !nav().includes('Login'));
  } finally { await cleanup(); }
});

test('signed-in subscribe links open the founders offer section instead of doing nothing', async () => {
  const { cleanup, dom } = await mount(() => Response.json(signedInState()));
  const original = Element.prototype.scrollIntoView;
  let scrolled = false;
  Element.prototype.scrollIntoView = function () { scrolled = true; };
  try {
    const link = document.querySelector('#opsfinance a');
    assert.equal(link.getAttribute('href'), '/#founders');
    await act(async () => link.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })));
    assert.ok(scrolled || dom.window.location.hash === '#founders');
  } finally {
    Element.prototype.scrollIntoView = original;
    await cleanup();
  }
});

test('product cards reflect Active, No subscription and Coming Soon states from the server', async () => {
  const { cleanup } = await mount(() => Response.json(signedInState({ opsflow: 'coming_soon' })));
  try {
    assert.equal(text('#opsp .product-action button'), 'Open App');
    assert.equal(text('#opsfinance .product-action'), 'Subscribe');
    assert.equal(document.querySelector('#opsfinance a').getAttribute('href'), '/#founders');
    assert.equal(text('#opsflow .coming-soon-label'), 'Coming Soon');
    assert.equal(document.querySelector('#opsflow button'), null);
  } finally { await cleanup(); }
});

test('Open App asks the server and shows the denial; frontend state never unlocks access', async () => {
  const { calls, cleanup, dom } = await mount((body) => body.action === 'launch'
    ? Response.json({ error: 'An active subscription is required for this application.' }, { status: 403 })
    : Response.json(signedInState()));
  try {
    await act(async () => document.querySelector('#opsp button').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    assert.deepEqual(calls.at(-1), { action: 'launch', product: 'opsp' });
    assert.match(text('#opsp [role=status]'), /active subscription is required/);
    assert.equal(dom.window.location.href, 'https://trusted-preview.vercel.app/');
  } finally { await cleanup(); }
});

test('a passive probe after server-side inactivity logout returns the nav to signed-out', async () => {
  let signedIn = true;
  const { calls, cleanup, dom } = await mount(() => Response.json(signedIn ? signedInState() : signedOut));
  try {
    assert.deepEqual(nav(), ['My Account', 'Log keluar semua aplikasi']);
    signedIn = false;
    await act(async () => document.querySelector('#passive').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    assert.deepEqual(calls.at(-1), { action: 'session', activity: false });
    assert.deepEqual(nav(), ['Register', 'Login']);
    assert.equal(text('#opsp .product-action'), 'Subscribe');
  } finally { await cleanup(); }
});

test('network or server failure shows a retry state, never an unlocked app', async () => {
  const { cleanup } = await mount(() => { throw new TypeError('Failed to fetch'); });
  try {
    assert.deepEqual(nav(), ['Retry']);
    assert.equal(document.querySelector('.product-action .btn-primary'), null);
    assert.equal(document.querySelector('#opsp a').getAttribute('href'), '/login');
    assert.equal(text('#opsp .access-retry'), 'Retry access check');
  } finally { await cleanup(); }
});
test('temporary session failure can recover without presenting a confirmed logout',async()=>{
 let unavailable=false;
 const {cleanup}=await mount(()=>{if(unavailable)throw new TypeError('Failed to fetch');return Response.json(signedInState());});
 try{
  assert.ok(nav().includes('My Account'));
  unavailable=true;await act(async()=>document.querySelector('#passive').click());
  assert.deepEqual(nav(),['Retry']);
  unavailable=false;await act(async()=>document.querySelector('.nav-auth button').click());
  assert.ok(nav().includes('My Account'));
 }finally{await cleanup();}
});

test('public marketing builds keep Subscribe visible without making auth requests', async () => {
  const { calls, cleanup } = await mount(() => Response.json(signedInState()), false);
  try {
    assert.equal(calls.length, 0);
    assert.equal(document.querySelector('.nav-auth'), null);
    assert.equal(text('#opsp .product-action'), 'Subscribe');
    assert.equal(document.querySelector('#opsp a').getAttribute('href'), '/login');
  } finally { await cleanup(); }
});

test('logout failure stays visible and retryable, including after a signed-out probe', async () => {
  let signedIn = true;
  let finishLogout;
  const { calls, cleanup, dom } = await mount((body) => body.action === 'logout'
    ? new Promise((resolve) => { finishLogout = resolve; })
    : Response.json(signedIn ? signedInState() : signedOut));
  const click = (selector) => document.querySelector(selector).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  try {
    await act(async () => { click('.nav-auth button'); click('.nav-auth button'); });
    assert.equal(calls.filter((body) => body.action === 'logout').length, 1);
    assert.equal(document.querySelector('.nav-auth button').disabled, true);
    await act(async () => finishLogout(Response.json({ error: 'Session revocation unavailable.' }, { status: 503 })));
    assert.match(text('[role=alert]'), /Sign out could not be confirmed/);
    assert.equal(document.querySelector('.nav-auth button').disabled, false);
    signedIn = false;
    await act(async () => click('#passive'));
    assert.equal(text('.nav-auth button'), 'Log keluar semua aplikasi');
    assert.equal(document.querySelector('#opsp button'), null);
    await act(async () => click('.nav-auth button'));
    assert.equal(calls.filter((body) => body.action === 'logout').length, 2);
    await act(async () => finishLogout(Response.json({ error: 'Retry later.' }, { status: 503 })));
    assert.match(text('[role=alert]'), /Retry later/);
    assert.equal(dom.window.location.href, 'https://trusted-preview.vercel.app/');
  } finally { await cleanup(); }
});

 test('all nine approved cards retain their order, PNG assets and five Coming Soon statuses during an outage', async () => {
  const { cleanup } = await mountHome(() => Response.json({error: 'Unavailable'}, {status: 503}));
  try {
    const cards = [...document.querySelectorAll('#applications article')];
    assert.deepEqual(cards.map(card => card.querySelector('h3').textContent), ['OpsFinance','OpsFlow','OpsPS','OpsHR','OpsWMS','OpsSmartHome','OpsClinic','OpsRental','OpsLife']);
    assert.equal(cards.filter(card => card.querySelector('.coming-soon-label')).length, 5);
    assert.equal(cards.flatMap(card => [...card.querySelectorAll('a')]).filter(a => a.textContent === 'Subscribe' && a.getAttribute('href') === '/login').length, 4);
    const { existsSync } = await import('node:fs');
    for (const img of document.querySelectorAll('#applications img')) {
      assert.match(img.getAttribute('src'), /^\/images\/approved\/.+\.png$/);
      assert.ok(existsSync(new URL('../public' + img.getAttribute('src'), import.meta.url)));
    }
    assert.ok(!/\bNEW\b|\bLIVE\b/.test(document.querySelector('#applications').textContent));
  } finally { await cleanup(); }
});
