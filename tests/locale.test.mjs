import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { LANGUAGES, TRANSLATIONS, normalizeLanguage, translate } from '../src/locales.js';
import { importSrc } from './helpers/load-src.mjs';
const {LocaleProvider,LanguageSelector}=await importSrc('locale.jsx');
const {AuthPortal}=await importSrc('AuthPortal.jsx');

test('every shipped translation has all four languages and unsupported locales fall back safely',()=>{
 assert.deepEqual(Object.keys(LANGUAGES),['en','ms','zh','ta']);
 for(const row of Object.values(TRANSLATIONS))for(const language of Object.keys(LANGUAGES))assert.ok(typeof row[language]==='string'&&row[language].length);
 for(const value of [null,undefined,'hi','../ta','<script>'])assert.equal(normalizeLanguage(value),'en');
 assert.equal(translate('OpsFinance','ta'),'OpsFinance');
});
test('switching all four languages updates accessible registration labels without losing entered data or changing identifiers',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://preview.example/register'});
 const keys=['window','document','IS_REACT_ACT_ENVIRONMENT'];const originals=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 dom.window.localStorage.setItem('myops.language','invalid');
 const root=createRoot(document.getElementById('root'));
 try{
  await act(async()=>root.render(createElement(LocaleProvider,null,createElement(LanguageSelector),createElement(AuthPortal,{mode:'register'}))));
  const input=document.querySelector('[name="displayName"]');input.value='Unchanged Customer 名';
  for(const language of Object.keys(LANGUAGES)){
   const select=document.querySelector('[aria-label="Language / Bahasa / 语言 / மொழி"]');
   await act(async()=>{select.value=language;select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
   assert.equal(document.documentElement.lang,language);
   assert.equal(dom.window.localStorage.getItem('myops.language'),language);
   assert.equal(document.getElementById('auth-title').textContent,translate('Create your MYOPS account',language));
   assert.ok(input.parentElement.textContent.includes(translate('Full name',language)));
   assert.equal(input.value,'Unchanged Customer 名');
   assert.equal(document.querySelector('[name="accountType"]').value,'personal');
   assert.equal(dom.window.location.pathname,'/register');
  }
 }finally{await act(async()=>root.unmount());dom.window.close();Object.assign(globalThis,originals);}
});
