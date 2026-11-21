import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { importSrc } from './helpers/load-src.mjs';

const { AuthPortal } = await importSrc('AuthPortal.jsx');

test('TAC UI submits numeric six/eight-digit codes and unlocks resend after cooldown', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://trusted-preview.vercel.app/verify-email?email=dummy%40example.test' });
  const names = ['window', 'document', 'FormData', 'fetch', 'IS_REACT_ACT_ENVIRONMENT'];
  const original = Object.fromEntries(names.map(name => [name, globalThis[name]]));
  const realNow = Date.now;
  let now = 1_000_000, tick, sent;
  Date.now = () => now;
  dom.window.setInterval = fn => { tick = fn; return 1; };
  dom.window.clearInterval = () => {};
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, FormData: dom.window.FormData, IS_REACT_ACT_ENVIRONMENT: true });
  const root = createRoot(document.getElementById('root'));
  try {
    globalThis.fetch = async (_url, init) => {
      sent = JSON.parse(init.body);
      return sent.action === 'resend_signup_otp'
        ? Response.json({ message: 'If confirmation is pending, a new code has been sent.' })
        : Response.json({ error: 'Invalid or expired verification code.' }, { status: 400 });
    };
    await act(async () => root.render(createElement(AuthPortal, { mode: 'verify' })));
    assert.equal(document.querySelector('[name=email]').value, 'dummy@example.test');
    const code = document.querySelector('[name=token]');
    assert.equal(code.autocomplete, 'one-time-code');
    assert.equal(code.maxLength, 8);
    for (const value of ['123456', '12345678']) {
      code.value = value;
      assert.equal(code.checkValidity(), true);
      await act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
      assert.deepEqual(sent, { action: 'verify_signup_otp', email: 'dummy@example.test', token: value });
      assert.match(document.querySelector('[role=status]').textContent, /Invalid or expired/);
    }
    for (const value of ['12345', '1234567', 'abcdefgh']) {
      code.value = value; assert.equal(code.checkValidity(), false);
    }
    const resend = [...document.querySelectorAll('button')].find(button => button.textContent === 'Resend code');
    await act(async () => resend.click());
    assert.deepEqual(sent, { action: 'resend_signup_otp', email: 'dummy@example.test' });
    assert.equal(resend.disabled, true);
    now += 60_001;
    await act(async () => tick());
    assert.equal(resend.disabled, false);
  } finally {
    await act(async () => root.unmount());
    Date.now = realNow;
    Object.assign(globalThis, original);
    dom.window.close();
  }
});

test('verification deep link exists and is not cached or sent as a referrer', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /'\/verify-email':.*portal\('verify'\)/);
  const route = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url))).routes.find(route => route.src === '/verify-email');
  assert.equal(route.headers['Cache-Control'], 'no-store');
  assert.equal(route.headers['Referrer-Policy'], 'no-referrer');
});
