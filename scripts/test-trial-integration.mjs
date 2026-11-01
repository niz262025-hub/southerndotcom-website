import test from 'node:test';
import { resolveProductStates } from '../server/entitlements.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

test('INTEGRATION: activated trial must authorize a central application launch',async()=>{
 const db=new PGlite({extensions:{pgcrypto}});
 const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0]?.value;
 const asService=()=>db.exec('RESET ROLE;SET ROLE service_role');
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
   CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text,email_confirmed_at timestamptz);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;`);
  for(const path of ['migrations/202610160001_myops_identity_foundation.sql','proposals/phase3_founders_100.sql','proposals/202610170001_myops_app_access.sql','proposals/202610170002_myops_login_sessions.sql','migrations/20261101104802_central_trial_7_day_foundation.sql','migrations/20261101164633_central_trial_usage_limits.sql']) await db.exec(readFileSync(new URL('../supabase/'+path,import.meta.url),'utf8'));
  const user=await one("INSERT INTO auth.users(email,email_confirmed_at) VALUES('trial@dummy.invalid',now()) RETURNING id value");
  const other=await one("INSERT INTO auth.users(email,email_confirmed_at) VALUES('other@dummy.invalid',now()) RETURNING id value");
  await asService();await one("SELECT myops_provision_profile($1,'Dummy','personal') value",[user]);await one("SELECT myops_provision_profile($1,'Other','personal') value",[other]);
  const login=await one('SELECT myops_login_start($1) value',[user]);
  await assert.rejects(one('SELECT myops_start_trial($1,$2) value',[other,login]),/Active verified/);
  const before=await one('SELECT last_activity_at value FROM myops_login_sessions WHERE id=$1',[login]);
  const trial=await one('SELECT myops_start_trial($1,$2) value',[user,login]);assert.equal(trial.status,'active');assert.equal(trial.auto_renew,false);assert.equal(trial.card_required,false);assert.equal(trial.amount_cents,0);
  assert.equal(Date.parse(trial.expires_at)-Date.parse(trial.started_at),168*3600*1000);
  const catalog=(await db.query('SELECT slug,launch_status FROM myops_products')).rows;
  const subscriptions=(await db.query('SELECT * FROM myops_subscriptions')).rows;
  const grants=(await db.query('SELECT * FROM myops_app_grants')).rows;
  const states=resolveProductStates({userId:user,catalog,subscriptions,grants,lifetime:[],trial:{...trial,user_id:user},trialApps:['opsflow'],now:Date.now()});
  console.log('INTEGRATION OBSERVED:',JSON.stringify({trial:trial.status,cardRequired:trial.card_required,subscriptionRows:subscriptions.length,grantRows:grants.length,opsflow:states.opsflow}));
  assert.equal(states.opsfinance,'none');
  assert.equal(states.opsp,'none');
  assert.equal(states.opsflow,'active','Active central trial must reach the launch entitlement resolver without a paid subscription or bypass');
 }finally{await db.close();}
});
