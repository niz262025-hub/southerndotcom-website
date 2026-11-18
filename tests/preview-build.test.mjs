import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));

function build(env) {
  execFileSync('npm', ['run', 'build'], {
    cwd: root, env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env }, stdio: 'pipe',
  });
  const file = readdirSync(new URL('../dist/assets/', import.meta.url)).find(name => name.endsWith('.js'));
  return readFileSync(new URL(`../dist/assets/${file}`, import.meta.url), 'utf8');
}

async function page(bundle, path, respond) {
  const dom = new JSDOM('<div id="root"></div>', { url: `https://trusted-preview.vercel.app${path}`, runScripts: 'outside-only' });
  dom.window.fetch = respond;
  dom.window.eval(bundle);
  for (let i = 0; i < 100 && !dom.window.document.querySelector('h1'); i++) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  return dom;
}

test('Vercel uses the environment-aware build and preview exposes the real login flow', async () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.buildCommand, 'npm run build');
  const bundle = build({ VERCEL_ENV: 'preview' });
  const calls = [];
  const respond = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return Response.json(init.body.includes('"session"') ? { signedIn: false } : { message: 'Test response' });
  };
  const home = await page(bundle, '/', respond);
  try {
    for (let i = 0; i < 100 && !home.window.document.querySelector('.nav-auth a[href="/login"]'); i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.ok(home.window.document.querySelector('.nav-auth a[href="/login"]'));
    assert.ok(home.window.document.querySelector('.nav-auth a[href="/register"]'));
  } finally { home.window.close(); }
  const login = await page(bundle, '/login', respond);
  try {
    const form = login.window.document.querySelector('form');
    assert.ok(form, 'preview login must render the real authentication form');
    assert.match(login.window.document.querySelector('h1').textContent, /Welcome back/);
    form.querySelector('[name=email]').value = 'user@example.test';
    form.querySelector('[name=password]').value = 'test-password';
    form.dispatchEvent(new login.window.Event('submit', { bubbles: true, cancelable: true }));
    for (let i = 0; i < 100 && !calls.some(call => call.body.action === 'login'); i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.deepEqual(calls.find(call => call.body.action === 'login'), {
      url: '/api/auth', body: { action: 'login', email: 'user@example.test', password: 'test-password' },
    });
  } finally { login.window.close(); }
  const signedIn = await page(bundle, '/', async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    return body.action === 'session'
      ? Response.json({ signedIn: true, products: { opsp: 'active' } })
      : Response.json({ error: 'Test launch blocked' }, { status: 503 });
  });
  try {
    const appButton = () => [...signedIn.window.document.querySelectorAll('article')]
      .find(article => article.querySelector('h3')?.textContent === 'OpsPS')?.querySelector('button');
    for (let i = 0; i < 100 && !appButton(); i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    const open = appButton();
    assert.ok(open);
    open.click();
    for (let i = 0; i < 100 && !calls.some(call => call.body.action === 'launch'); i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.deepEqual(calls.find(call => call.body.action === 'launch'), {
      url: '/api/auth', body: { action: 'launch', product: 'opsp' },
    });
  } finally { signedIn.window.close(); }
});

test('production build without auth opt-in does not expose preview login', async () => {
  const bundle = build({ VERCEL_ENV: 'production' });
  const dom = await page(bundle, '/', () => assert.fail('disabled auth must not probe a session'));
  try {
    assert.equal(dom.window.document.querySelector('.nav-auth'), null);
  } finally { dom.window.close(); }
});
