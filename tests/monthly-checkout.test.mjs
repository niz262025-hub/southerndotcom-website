import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {monthlySelection} from '../server/monthly-plans.js';
test('monthly selection rejects duplicate, unavailable, inherited and wrong-size selections',()=>{
 assert.deepEqual(monthlySelection('duo_monthly',['opsp','opsfinance']),['opsfinance','opsp']);
 for(const [plan,apps] of [['starter_monthly',[]],['__proto__',[]],['single_monthly',['opshr']],['duo_monthly',['opsp','opsp']],['complete_monthly',['opsp','opsflow']],['single_monthly',null]]) assert.equal(monthlySelection(plan,apps),null);
});
test('monthly SQL snapshots price and selection, grants once and enforces ACL',async()=>{
 const db=new PGlite({extensions:{pgcrypto}});
 const one=async(sql,args=[])=> (await db.query(sql,args)).rows[0]?.value;
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;create table auth.users(id uuid primary key default gen_random_uuid(),email text,email_confirmed_at timestamptz);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema auth,public to anon,authenticated,service_role;
   alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
  for(const path of ['migrations/202610160001_myops_identity_foundation.sql','proposals/phase3_founders_100.sql','proposals/monthly_sandbox_checkout.sql']) await db.exec(readFileSync(new URL('../supabase/'+path,import.meta.url),'utf8'));
  const user=await one("insert into auth.users(email,email_confirmed_at) values('uat@example.invalid',now()) returning id value");
  const other=await one("insert into auth.users(email,email_confirmed_at) values('other@example.invalid',now()) returning id value");
  await one("select myops_provision_profile($1,'UAT','business') value",[user]);
  const create=(plan,apps,ref)=>one('select myops_create_monthly_payment($1,$2,$3,$4) value',[user,plan,apps,ref]);
  assert.equal((await create('starter_monthly',[],'MYOPS-starter001')).status,'plan_disabled');
  assert.equal((await create('duo_monthly',['opsp','opsp'],'MYOPS-invalid001')).status,'invalid_product');
  assert.equal((await create('single_monthly',['opshr'],'MYOPS-invalid002')).status,'invalid_product');
  assert.equal((await one("select myops_create_monthly_payment($1,'single_monthly',array['opsp'],'MYOPS-unknown001') value",[other])).status,'not_eligible');
  for(const [plan,apps,amount] of [['single_monthly',['opsp'],1990],['duo_monthly',['opsfinance','opsflow'],2990],['complete_monthly',['opsfinance','opsflow','opsp'],3990]]) {
   const ref='MYOPS-'+plan;
   const made=await create(plan,apps,ref);assert.equal(made.amount_cents,amount);assert.equal(made.gateway,'toyyibpay_sandbox');
   assert.equal((await create(plan,[...apps].reverse(),ref+'retry')).status,'existing');
   if(plan==='single_monthly') assert.equal((await create(plan,['opsflow'],ref+'other')).status,'selection_conflict');
   const bill='bill'+plan.replaceAll('_','');
   await one('select myops_attach_bill($1,$2) value',[ref,bill]);
   const settle=(cents,outcome='succeeded')=>one('select myops_settle_monthly_payment($1,$2,$3,$4,$5,$6) value',[ref,bill,'txn-'+plan,cents,outcome,'event-'+plan]);
   assert.equal((await settle(amount-1)).status,'amount_mismatch');
   assert.equal((await settle(amount)).status,'settled');
   const before=await one("select string_agg(current_period_end::text,',' order by product_slug) value from myops_subscriptions where personal_user_id=$1",[user]);
   assert.equal((await settle(amount)).status,'already_settled');
   assert.equal((await settle(0,'failed')).status,'already_settled');
   assert.equal(await one("select string_agg(current_period_end::text,',' order by product_slug) value from myops_subscriptions where personal_user_id=$1",[user]),before);
  }
  const failed=await create('single_monthly',['opsflow'],'MYOPS-failedorder');
  assert.equal(failed.status,'created');
  await one("select myops_attach_bill('MYOPS-failedorder','failedbill') value");
  assert.equal((await one("select myops_settle_monthly_payment('MYOPS-failedorder','failedbill','failedtxn',0,'failed','failed-event') value")).status,'failed');
  assert.equal((await one("select myops_settle_monthly_payment('MYOPS-failedorder','failedbill','failedtxn',1990,'succeeded','late-event') value")).status,'terminal_order');
  assert.equal(await one('select count(*)::int value from myops_subscriptions where personal_user_id=$1',[other]),0);
  assert.equal(await one('select count(*)::int value from myops_founder_allocations'),0);
  for(const role of ['anon','authenticated']) for(const fn of ['myops_create_monthly_payment(uuid,text,text[],text)','myops_settle_monthly_payment(text,text,text,integer,text,text)']) assert.equal(await one('select has_function_privilege($1,$2,\'EXECUTE\') value',[role,'public.'+fn]),false);
 }finally{await db.close();}
});

test('monthly payment adapter remains preview-only and uses server-priced sandbox bills',async()=>{
 const {createPayments}=await import('../server/payments.js');
 const project='uhuukcztdifvpjuopdea';
 const base={VERCEL_ENV:'preview',MYOPS_ENABLE_MONTHLY_SANDBOX:'true',MYOPS_SERVICE_ROLE_KEY:'sb_secret_test_fixture',TOYYIBPAY_SANDBOX_SECRET_KEY:'fixture',TOYYIBPAY_SANDBOX_CATEGORY_CODE:'cat12345'};
 const calls=[];const requests=[];
 const adminFactory=()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:name==='myops_create_monthly_payment'?{status:'created',order_ref:args.p_order_ref,amount_cents:2990,gateway:'toyyibpay_sandbox'}:true,error:null};}});
 const transport=async(url,init)=>{requests.push({url,fields:Object.fromEntries(new URLSearchParams(init.body))});return {ok:true,json:async()=>[{BillCode:'sandbox01'}]};};
 const run=(env)=>createPayments({env,project,adminFactory,transport}).checkout({userId:'user-a',plan:'duo_monthly',products:['opsp','opsflow'],origin:'https://preview.vercel.app'});
 assert.equal((await run({...base,MYOPS_ENABLE_MONTHLY_SANDBOX:'false'})).status,403);
 assert.equal((await run({...base,VERCEL_ENV:'production'})).status,503);
 assert.equal(calls.length,0);
 assert.equal((await run(base)).status,200);
 assert.deepEqual(calls[0].args.p_products,['opsflow','opsp']);
 assert.equal(requests[0].url,'https://dev.toyyibpay.com/index.php/api/createBill');
 assert.equal(requests[0].fields.billAmount,'2990');
});
