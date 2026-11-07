import test from 'node:test';
import assert from 'node:assert/strict';
import { changeProfileLogo, decodeLogo, ownedLogoPath, profileLogoUrl, LOGO_MAX_BYTES } from '../server/profile-logo.js';
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA1sAAAAASUVORK5CYII=';
const id = '11111111-1111-4111-8111-111111111111';
const old = `${id}/22222222-2222-4222-8222-222222222222.png`;
function fixture({ uploadError=false, removeError=false, saveError=false, signError=false }={}) {
 const calls=[]; const metadata={logo_path:old};
 const bucket={upload:async(path,bytes,options)=>{calls.push(['upload',path,bytes.length,options]);return {error:uploadError};},
 remove:async paths=>{calls.push(['remove',paths]);return {error:removeError};},
 createSignedUrl:async(path,seconds)=>{calls.push(['sign',path,seconds]);return {data:{signedUrl:'https://storage.example.test/signed'},error:signError};}};
 const client={storage:{from:name=>{assert.equal(name,'myops-profile-logos');return bucket;}}};
 const user={id,user_metadata:metadata};
 const saveMetadata=async data=>{calls.push(['save',data]);if(saveError)throw Error('upstream');Object.assign(metadata,data);};
 return {calls,client,user,saveMetadata};
}
test('logo input rejects SVG, false MIME, malformed base64, oversize and foreign/traversal paths',()=>{
 assert.equal(decodeLogo('image/png',PNG).extension,'png');
 for(const [mime,data] of [['image/svg+xml',PNG],['image/jpeg',PNG],['image/png','bad!'],['image/png',Buffer.alloc(LOGO_MAX_BYTES+1).toString('base64')]])assert.throws(()=>decodeLogo(mime,data));
 for(const p of ['https://evil.test/logo.png',`${id}/../logo.png`,'other/'+old,old])assert.equal(ownedLogoPath(p,'another-user'),false);
 assert.equal(ownedLogoPath(old,id),true);
});
test('upload commits metadata before deleting the previous owned object and never upserts',async()=>{
 const f=fixture();await changeProfileLogo({...f,operation:'upload',contentType:'image/png',encoded:PNG});
 assert.deepEqual(f.calls.map(c=>c[0]),['upload','save','remove']);
 assert.notEqual(f.user.user_metadata.logo_path,old);
 assert.equal(ownedLogoPath(f.user.user_metadata.logo_path,id),true);
 assert.equal(f.calls[0][3].upsert,false);
 assert.deepEqual(f.calls[2][1],[old]);
});
test('failed upload never changes metadata; failed metadata rolls back only the newly uploaded object',async()=>{
 const f=fixture({uploadError:true});await assert.rejects(changeProfileLogo({...f,operation:'upload',contentType:'image/png',encoded:PNG}));
 assert.equal(f.calls.length,1);assert.equal(f.user.user_metadata.logo_path,old);
 const g=fixture({saveError:true});await assert.rejects(changeProfileLogo({...g,operation:'upload',contentType:'image/png',encoded:PNG}));
 assert.equal(g.user.user_metadata.logo_path,old);assert.deepEqual(g.calls[2][1],[g.calls[0][1]]);
});
test('remove is owned and retryable; foreign metadata never signs or deletes another account object',async()=>{
 const f=fixture();await changeProfileLogo({...f,operation:'remove'});assert.deepEqual(f.calls,[['remove',[old]],['save',{logo_path:null}]]);
 await changeProfileLogo({...f,operation:'remove'});assert.equal(f.calls.length,3);
 const g=fixture();g.user.user_metadata.logo_path='other/'+old;
 assert.equal(await profileLogoUrl(g.client,g.user),null);
 await changeProfileLogo({...g,operation:'remove'});assert.deepEqual(g.calls,[['save',{logo_path:null}]]);
 const h=fixture({removeError:true});await assert.rejects(changeProfileLogo({...h,operation:'remove'}));assert.equal(h.user.user_metadata.logo_path,old);
});
test('private logo URLs expire after five minutes and failures safely use default; failed old-file cleanup is explicit',async()=>{
 const f=fixture();assert.equal(await profileLogoUrl(f.client,f.user),'https://storage.example.test/signed');assert.deepEqual(f.calls[0],['sign',old,300]);
 const g=fixture({signError:true});assert.equal(await profileLogoUrl(g.client,g.user),null);
 const h=fixture({removeError:true});assert.equal((await changeProfileLogo({...h,operation:'upload',contentType:'image/png',encoded:PNG})).cleanupPending,true);
});
