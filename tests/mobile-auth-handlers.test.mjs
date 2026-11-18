import test from 'node:test';
import assert from 'node:assert/strict';
import { createMobileAuthorizeHandler } from '../api/mobile-auth/authorize.js';
import { createMobileTokenHandler } from '../api/mobile-auth/token.js';
import { createMobileRefreshHandler } from '../api/mobile-auth/refresh.js';

function response() {
 const res={statusCode:200,headers:{},payload:null};
 res.setHeader=(k,v)=>{res.headers[k]=v;return res};
 res.status=n=>{res.statusCode=n;return res};
 res.json=data=>{res.payload=data;return res};
 res.end=()=>res;
 return res;
}
const valid={client_id:'myopsmobile',redirect_uri:'myops://auth/callback',response_type:'code',code_challenge_method:'S256',code_challenge:'A'.repeat(43),state:'B'.repeat(43)};
test('authorization rejects untrusted redirect before session lookup',async()=>{
 let called=false;
 const handler=createMobileAuthorizeHandler({env:{MYOPS_ENABLE_MOBILE_TOKEN_ISSUANCE:'true'},sessionVerifier:async()=>{called=true;return null}});
 const params=new URLSearchParams({...valid,redirect_uri:'https://attacker.example/callback'});
 const res=response();
 await handler({method:'GET',url:'/api/mobile-auth/authorize?'+params,headers:{}},res);
 assert.equal(res.statusCode,400);
 assert.equal(called,false);
 assert.equal(res.headers.Location,undefined);
});
test('authorization stays closed when issuance flag is absent',async()=>{
 const res=response();
 await createMobileAuthorizeHandler({env:{},sessionVerifier:async()=>{throw Error('should not be called')}})({method:'GET',url:'/api/mobile-auth/authorize?'+new URLSearchParams(valid),headers:{}},res);
 assert.equal(res.statusCode,503);
 assert.equal(res.payload.error,'mobile_authorization_disabled');
});
test('authorization refuses unverified central session',async()=>{
 const res=response();
 await createMobileAuthorizeHandler({env:{MYOPS_ENABLE_MOBILE_TOKEN_ISSUANCE:'true'},sessionVerifier:async()=>null})({method:'GET',url:'/api/mobile-auth/authorize?'+new URLSearchParams(valid),headers:{}},res);
 assert.equal(res.statusCode,401);
 assert.equal(res.headers.Location,undefined);
});
test('token endpoint rejects invalid PKCE verifier without contacting storage',async()=>{
 const res=response();
 await createMobileTokenHandler({env:{MYOPS_ENABLE_MOBILE_TOKEN_ISSUANCE:'true'},clientFactory:()=>{throw Error('should not be called')}})({method:'POST',headers:{'content-type':'application/json'},body:{grant_type:'authorization_code',client_id:'myopsmobile',redirect_uri:'myops://auth/callback',code:'A'.repeat(43),code_verifier:'short'}},res);
 assert.equal(res.statusCode,400);
});
test('token issuance stays closed by default',async()=>{
 const res=response();
 await createMobileTokenHandler({env:{}})({method:'POST',headers:{'content-type':'application/json'},body:{grant_type:'authorization_code',client_id:'myopsmobile',redirect_uri:'myops://auth/callback',code:'A'.repeat(43),code_verifier:'B'.repeat(43)}},res);
 assert.equal(res.statusCode,503);
});
test('refresh issuance stays closed by default',async()=>{
 const res=response();
 await createMobileRefreshHandler({env:{}})({method:'POST',headers:{'content-type':'application/json'},body:{grant_type:'refresh_token',client_id:'myopsmobile',refresh_token:'A'.repeat(43)}},res);
 assert.equal(res.statusCode,503);
});
