import test from 'node:test';
import assert from 'node:assert/strict';
import { appProfileFromMetadata, loadAppProfile } from '../server/app-profile.js';
test('central descriptive profile exposes only valid name and company labels', () => {
  assert.deepEqual(appProfileFromMetadata({display_name:' Owner ',company_name:' Company ',role:'admin',company_id:'victim',email:'private'}),{display_name:'Owner',company_name:'Company'});
  for (const metadata of [null,[],{}, {display_name:'Owner'}, {display_name:'Owner',company_name:' '},{display_name:'X'.repeat(101),company_name:'Y'},{display_name:'X',company_name:'Y'.repeat(201)}]) assert.equal(appProfileFromMetadata(metadata),null);
});
test('profile lookup uses the verified user id and rejects conflicting identity or lookup failure', async () => {
  const admin={auth:{admin:{getUserById:async id=>({data:{user:{id,user_metadata:{display_name:'Owner',company_name:'Company'}}}})}}};
  assert.deepEqual(await loadAppProfile(admin,'verified-user'),{display_name:'Owner',company_name:'Company'});
  admin.auth.admin.getUserById=async()=>({data:{user:{id:'other'}}});
  await assert.rejects(loadAppProfile(admin,'verified-user'));
  admin.auth.admin.getUserById=async()=>({error:new Error('outage')});
  await assert.rejects(loadAppProfile(admin,'verified-user'));
});


test('individual launch labels use the registered name without inventing company membership', () => {
  assert.deepEqual(appProfileFromMetadata({ display_name: ' Person ', account_type: 'personal', role: 'admin', organization_id: 'victim' }),
    { display_name: 'Person', company_name: 'Person' });
  assert.equal(appProfileFromMetadata({ display_name: 'Person', account_type: 'business' }), null);
});
