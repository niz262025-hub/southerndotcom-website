import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { importSrc } from './helpers/load-src.mjs';
const { default: App } = await importSrc('App.jsx');

test('direct visits render the correct app detail including OpsHR without a blank page', async () => {
  const keys=['window','document','Element','HTMLElement','fetch','IS_REACT_ACT_ENVIRONMENT'];
  const original=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
  try {
    for (const [slug,name] of [['opshr','OpsHR'],['opsfinance','OpsFinance'],['opsflow','OpsFlow'],['opsp','OpsPS']]) {
      const dom=new JSDOM('<html><head></head><body><div id="root"></div></body></html>',{url:`https://www.myops.com.my/solutions/${slug}`});
      Object.assign(globalThis,{window:dom.window,document:dom.window.document,Element:dom.window.Element,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,fetch:async()=>({ok:true,json:async()=>({signedIn:false})})});
      const root=createRoot(document.getElementById('root'));
      try {
        await act(async()=>root.render(createElement(App)));
        assert.equal(document.querySelector('main h1')?.textContent,name);
        assert.ok(document.querySelector('main').textContent.length>100);
      } finally { await act(async()=>root.unmount()); dom.window.close(); }
    }
  } finally { Object.assign(globalThis,original); }
});
