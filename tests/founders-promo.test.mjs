import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { importSrc } from './helpers/load-src.mjs';

const { SessionProvider, ProductAction } = await importSrc('session.jsx');
const { FoundersPromo } = await importSrc('FoundersPromo.jsx');

const states = { opsp: 'none', opsfinance: 'none', opsflow: 'none', opswms: 'coming_soon', opshr: 'coming_soon' };
const signedIn = (extra) => ({ signedIn: true, email: 'u@example.test', products: states, lifetime: false, ...extra });

async function mount(respond) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://trusted-preview.vercel.app/' });
  const originals = Object.fromEntries(['window', 'document', 'fetch', 'IS_REACT_ACT_ENVIRONMENT'].map((key) => [key, globalThis[key]]));
  const calls = [];
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    return respond(body);
  };
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(createElement(SessionProvider, { enabled: true }, createElement('div', null,
    createElement(FoundersPromo), createElement('article', { id: 'opsp' }, createElement(ProductAction, { product: { slug: 'opsp' } }))))));
  return { calls, cleanup: async () => { await act(async () => root.unmount()); Object.assign(globalThis, originals); dom.window.close(); } };
}
const buttons = () => [...document.querySelectorAll('#founders a, #founders button:not([disabled])')]
  .filter((node) => !node.closest('#free-trial'))
  .map((node) => node.textContent);
const founders = (remaining) => ({ capacity: 100, allocated: 100 - remaining, remaining, available: remaining > 0 });

test('public pricing shows the approved MYOPS plans and free trial without OpsHub', async () => {
  const { cleanup } = await mount((body) => Response.json(body.action === 'founders' ? founders(63) : { signedIn: false }));
  try {
    const cards = [...document.querySelectorAll('.pricing-cards .price-card')];
    assert.deepEqual(cards.map((card) => card.querySelector('h3').textContent), [
      '7 Days Free', 'Single App', 'Duo', 'Triple', 'All Apps',
    ]);
    assert.deepEqual(cards.map((card) => card.querySelector('.price-amount').textContent), [
      'RM0 / 7 days', 'RM19 / month', 'RM29 / month', 'RM39 / month', 'RM49 / month',
    ]);
    assert.match(document.querySelector('#founders').textContent, /Choose your MYOPS plan/);
    assert.match(document.querySelector('#founders').textContent, /7-day trial/);
    assert.match(document.querySelector('#founders').textContent, /monthly and manual renewal is not yet open/);
    assert.doesNotMatch(document.querySelector('#founders').textContent, /OpsHub|3% \/ 2% \/ 1\.5%|Seller account is free/);
    const monthly = [...document.querySelectorAll('.pricing-cards button')].filter((button) => !button.closest('#free-trial'));
    assert.deepEqual(monthly.map((button) => button.textContent), ['Checkout opening soon', 'Checkout opening soon', 'Checkout opening soon', 'Checkout opening soon']);
    assert.ok(monthly.every((button) => button.disabled));
  } finally { await cleanup(); }
});

test('signed-in visitors see current plans without obsolete Founders checkout controls', async () => {
  const { cleanup } = await mount((body) => Response.json(body.action === 'founders' ? founders(5) : signedIn()));
  try {
    assert.deepEqual(buttons(), []);
    assert.match(document.querySelector('#founders').textContent, /Single App/);
    assert.doesNotMatch(document.querySelector('#founders').textContent, /Claim lifetime access|Founders 100/);
  } finally { await cleanup(); }
});

test('MYOPS pricing excludes OpsHub from the app catalog and pricing notes', async () => {
  const { cleanup } = await mount((body) => Response.json(body.action === 'founders' ? founders(1) : { signedIn: false }));
  try {
    assert.doesNotMatch(document.querySelector('#founders').textContent, /OpsHub|Seller account is free|3% \/ 2% \/ 1\.5%/);
  } finally { await cleanup(); }
});
