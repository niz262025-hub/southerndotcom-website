import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const targets = [
  ['MYOPS staging', 'https://southerndotcom-website-n8mbkbwf3-mohd-syaiful-nizam1.vercel.app/'],
  ['OpsFinance staging', 'https://opsfinance-ecior985q-mohd-syaiful-nizam1.vercel.app/'],
  ['OpsFlow staging', 'https://opsflow-staging-gzofesy26-mohd-syaiful-nizam1.vercel.app/'],
  ['OpsPS staging', 'https://opsp-mobile-r1-kegpw4g34-mohd-syaiful-nizam1.vercel.app/'],
  ['OpsHR staging', 'https://opshr-b5p8ig20m-mohd-syaiful-nizam1.vercel.app/'],
  ['OpsHub standalone', 'https://opshub.myops.com.my/'],
];
const browser = await chromium.launch({ headless: true });
let failed = 0;
try {
  for (const [name, url] of targets) {
    const context = await browser.newContext({ ignoreHTTPSErrors: false });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1800);
      const status = response?.status() ?? 0;
      const title = await page.title();
      const text = (await page.locator('body').innerText({ timeout: 10000 })).slice(0, 300);
      const visible = text.trim().length > 0;
      const protection = /Authentication Required|Vercel Authentication|Deployment Protection/i.test(title + ' ' + text);
      console.log(JSON.stringify({ name, status, title, visible, protection, pageErrors: errors.slice(0, 5), finalUrl: page.url() }));
      assert.ok(status >= 200 && status < 400, name + ' HTTP ' + status);
      assert.ok(visible, name + ' rendered empty body');
      assert.ok(!protection, name + ' requires Vercel protection bypass for UAT');
      assert.deepEqual(errors, [], name + ' browser JavaScript exceptions');
    } catch (error) {
      failed++;
      console.error('FAIL ' + name + ': ' + error.message);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
if (failed) process.exitCode = 1;
