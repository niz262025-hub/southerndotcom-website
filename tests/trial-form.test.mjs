import test from 'node:test';
import assert from 'node:assert/strict';
import {importSrc} from './helpers/load-src.mjs';
import {JSDOM} from 'jsdom';
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
const {AuthPortal}=await importSrc('AuthPortal.jsx');
test('MYOPS account activates trial through central API and shows expiry/open app without payment fields',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://staging.test/account'});
 const originals=Object.fromEntries(['window','document','FormData','fetch','IS_REACT_ACT_ENVIRONMENT'].map(k=>[k,globalThis[k]]));
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true});
 const root=createRoot(document.getElementById('root'));const calls=[];
 globalThis.fetch=async(url,init)=>{const body=JSON.parse(init.body);calls.push(body);
 if(body.action==='account')return Response.json({email:'dummy@invalid.test',trialAvailable:true,products:{opsflow:'none'}});
 if(body.action==='trial_status')return Response.json({trial:{status:'not_started'},canStart:true,availableApps:['opsflow']});
 if(body.action==='trial_start')return Response.json({trial:{status:'active',expires_at:'2099-01-01T00:00:00Z'},canStart:false,availableApps:['opsflow'],message:'Trial active'});
 throw Error('Unexpected action');};
 try {
  await act(async()=>root.render(createElement(AuthPortal,{mode:'dashboard',production:false})));
  const start=[...document.querySelectorAll('button')].find(b=>b.textContent==='Activate free 7-day trial');assert.ok(start);
  assert.match(document.body.textContent,/No payment card/);assert.equal(document.querySelector('input[type=number]'),null);
  await act(async()=>start.click());assert.deepEqual(calls.find(c=>c.action==='trial_start'),{action:'trial_start',confirm:true});
  assert.match(document.body.textContent,/Trial status: active/);assert.match(document.body.textContent,/Expires:/);assert.ok([...document.querySelectorAll('button')].some(b=>b.textContent==='Open OpsFlow'));
  assert.equal([...document.querySelectorAll('button')].some(b=>b.textContent==='Activate free 7-day trial'),false);
 }finally{await act(async()=>root.unmount());Object.assign(globalThis,originals);dom.window.close();}
});

test('lifetime customers see paid access without trial limits or trial-status requests',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://staging.test/account'});
 const originals=Object.fromEntries(['window','document','FormData','fetch','IS_REACT_ACT_ENVIRONMENT'].map(k=>[k,globalThis[k]]));
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true});
 const root=createRoot(document.getElementById('root'));const calls=[];
 globalThis.fetch=async(url,init)=>{const body=JSON.parse(init.body);calls.push(body.action);
 if(body.action==='account')return Response.json({email:'dummy@invalid.test',lifetime:true,trialAvailable:true,products:{opsflow:'active',opsfinance:'active',opsp:'active',opswms:'coming_soon',opshr:'coming_soon'}});
 if(body.action==='payment_reconcile')return Response.json({message:'No pending sandbox payment found.'});
 throw Error('Unexpected action');};
 try {
  await act(async()=>root.render(createElement(AuthPortal,{mode:'dashboard',production:false})));
  assert.match(document.body.textContent,/Founders 100 lifetime access: active/);
  assert.match(document.body.textContent,/Active subscription/);
  assert.doesNotMatch(document.body.textContent,/Trial status:|Checking trial eligibility|up to 30/);
  const verify=[...document.querySelectorAll('button')].find(b=>b.textContent==='Verify sandbox payment');
  await act(async()=>verify.click());
  assert.match(document.querySelector('[role=status]').textContent,/No pending sandbox payment found/);
  assert.equal(calls.includes('trial_status'),false);
 }finally{await act(async()=>root.unmount());Object.assign(globalThis,originals);dom.window.close();}
});
