import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {importSrc} from './helpers/load-src.mjs';
const {SessionProvider,useSession}=await importSrc('session.jsx');
const {AuthPortal}=await importSrc('AuthPortal.jsx');
function Probe(){const session=useSession();return createElement('button',{id:'passive-probe',onClick:()=>session.refresh(false)},'Refresh access');}

test('account launcher follows verified access, keeps paid/trial labels distinct, and clears on central logout',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://www.myops.com.my/account'});
 const keys=['window','document','FormData','fetch','IS_REACT_ACT_ENVIRONMENT'];
 const original=Object.fromEntries(keys.map(key=>[key,globalThis[key]]));
 const redirects=[],launches=[],calls=[];
 const browser=Object.create(dom.window);
 Object.defineProperties(browser,{
  location:{value:{search:'',replace:path=>redirects.push(path),assign:url=>launches.push(url)}},
  addEventListener:{value:dom.window.addEventListener.bind(dom.window)},
  removeEventListener:{value:dom.window.removeEventListener.bind(dom.window)},
 });
 let signedIn=true;
 let products={opsfinance:'active',opsflow:'active',opsp:'none',opshr:'none',opswms:'coming_soon'};
 Object.assign(globalThis,{window:browser,document:dom.window.document,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true,fetch:async(_url,init)=>{
  const body=JSON.parse(init.body);calls.push(body);
  if(body.action==='session')return Response.json({signedIn,products});
  if(body.action==='account')return Response.json({email:'fixture@invalid.test',products,accessModes:{opsfinance:'paid',opsflow:'trial'}});
  if(body.action==='launch'&&body.product==='opsfinance')return Response.json({error:'Access changed. Retry from MYOPS.'},{status:403});
  if(body.action==='launch')return Response.json({next:`https://app.example.test/${body.product}/launch`});
  throw Error('Unexpected operation');
 }});
 const root=createRoot(document.getElementById('root'));
 try{
  await act(async()=>root.render(createElement(SessionProvider,{enabled:true},createElement('div',null,createElement(AuthPortal,{mode:'dashboard',production:true}),createElement(Probe)))));
  assert.match(document.querySelector('#subscription-opsfinance').textContent,/Active subscription/);
  assert.match(document.querySelector('#subscription-opsflow').textContent,/Free trial active/);
  assert.equal(document.querySelector('#subscription-opshr button'),null);
  assert.equal(document.querySelector('#subscription-opswms button'),null);
  await act(async()=>document.querySelector('#subscription-opsfinance button').click());
  assert.match(document.querySelector('[role=status]').textContent,/Access changed/);
  await act(async()=>document.querySelector('#subscription-opsflow button').click());
  assert.deepEqual(calls.filter(c=>c.action==='launch').map(c=>c.product),['opsfinance','opsflow']);
  assert.deepEqual(launches,['https://app.example.test/opsflow/launch']);
  products={...products,opsflow:'none'};
  await act(async()=>document.querySelector('#passive-probe').click());
  assert.equal(document.querySelector('#subscription-opsflow button'),null);
  assert.match(document.querySelector('#subscription-opsflow').textContent,/No subscription/);
  signedIn=false;
  await act(async()=>document.querySelector('#passive-probe').click());
  assert.deepEqual(redirects,['/login']);
  assert.equal(document.querySelector('#subscription'),null);
  assert.equal(document.querySelector('form'),null);
  assert.equal(calls.filter(c=>c.action==='session').at(-1).activity,false);
 }finally{await act(async()=>root.unmount());Object.assign(globalThis,original);dom.window.close();}
});
