import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act,createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { importSrc } from './helpers/load-src.mjs';
const {ProfileLogo}=await importSrc('ProfileLogo.jsx');
test('logo UI previews a chosen image, uploads, removes and uses the MYOPS fallback without a logo',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://trusted-preview.vercel.app/account'});
 const originals=Object.fromEntries(['window','document','FileReader','fetch','IS_REACT_ACT_ENVIRONMENT'].map(k=>[k,globalThis[k]]));
 const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
 const calls=[],revoked=[];let refreshed=0;
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,FileReader:dom.window.FileReader,IS_REACT_ACT_ENVIRONMENT:true,
 fetch:async(_url,init)=>{calls.push(JSON.parse(init.body));return Response.json({message:'Saved'});}});
 URL.createObjectURL=()=> 'blob:test-logo';URL.revokeObjectURL=url=>revoked.push(url);
 const root=createRoot(document.getElementById('root'));
 try{
 await act(async()=>root.render(createElement(ProfileLogo,{profile:{has_logo:true,logo_url:'https://storage.example.test/logo'},refresh:async()=>{refreshed++;}})));
 const input=document.querySelector('input[type=file]');
 const file=new dom.window.File(['image'],'logo.png',{type:'image/png'});Object.defineProperty(input,'files',{value:[file],configurable:true});
 await act(async()=>input.dispatchEvent(new dom.window.Event('change',{bubbles:true})));
 assert.equal(document.querySelector('img').getAttribute('src'),'blob:test-logo');
 await act(async()=>{document.querySelector('button').click();await new Promise(resolve=>setTimeout(resolve,40));});
 assert.equal(calls[0].action,'profile-logo');assert.equal(calls[0].operation,'upload');assert.equal(calls[0].contentType,'image/png');assert.equal(refreshed,1);assert.ok(revoked.includes('blob:test-logo'));
 await act(async()=>document.querySelectorAll('button')[1].click());assert.equal(calls[1].operation,'remove');
 await act(async()=>root.render(createElement(ProfileLogo,{profile:null,refresh:async()=>{}})));
 assert.equal(document.querySelector('img').getAttribute('src'),'/images/myops-logo-wordmark.png');
 assert.equal(document.querySelectorAll('button')[1].disabled,true);
 }finally{await act(async()=>root.unmount());Object.assign(globalThis,originals);URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;dom.window.close();}
});
