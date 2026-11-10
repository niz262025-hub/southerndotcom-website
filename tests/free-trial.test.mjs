import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {importSrc} from './helpers/load-src.mjs';
const {SessionProvider}=await importSrc('session.jsx');
const {FreeTrial}=await importSrc('FreeTrial.jsx');
async function mount(signedIn){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://www.myops.com.my/'});
 const keys=['window','document','fetch','IS_REACT_ACT_ENVIRONMENT'];const originals=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
 const calls=[];let active=false;
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true,fetch:async(_url,init)=>{
  const body=JSON.parse(init.body);calls.push(body);
  if(body.action==='session')return Response.json({signedIn,products:{opshr:active?'active':'none'}});
  if(body.action==='trial_start')active=true;
  return Response.json({availableApps:['opshr'],canStart:!active,trial:active?{status:'active',expires_at:'2099-01-01T00:00:00Z'}:{status:'not_started'}});
 }});
 const root=createRoot(document.getElementById('root'));await act(async()=>root.render(createElement(SessionProvider,{enabled:true},createElement(FreeTrial))));
 return {calls,cleanup:async()=>{await act(async()=>root.unmount());dom.window.close();Object.assign(globalThis,originals);}};
}
test('signed-out free trial is visible without starting its clock or asking for a card',async()=>{
 const {calls,cleanup}=await mount(false);try{
  assert.match(document.body.textContent,/Free 7-Day Trial/);assert.match(document.body.textContent,/RM0/);
  assert.equal(document.querySelector('a').getAttribute('href'),'/register');
  assert.equal(calls.some(c=>c.action==='trial_start'),false);assert.equal(document.querySelector('input'),null);
 }finally{await cleanup();}
});
test('trial activation sends explicit consent and displays expiry and app access',async()=>{
 const {calls,cleanup}=await mount(true);try{
  await act(async()=>document.querySelector('button').click());
  assert.deepEqual(calls.find(c=>c.action==='trial_start'),{action:'trial_start',confirm:true});
  assert.match(document.body.textContent,/Active until/);assert.match(document.body.textContent,/Open OpsHR/);
 }finally{await cleanup();}
});
