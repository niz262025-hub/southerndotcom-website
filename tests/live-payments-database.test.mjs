import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

test('live ledger proposal preserves sandbox orders, returns gateway and retains service-only ACLs', async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  const one = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.value;
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key default gen_random_uuid(),email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated,service_role;
      alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
    for (const path of ['migrations/202610160001_myops_identity_foundation.sql','proposals/phase3_founders_100.sql']) {
      await db.exec(readFileSync(new URL('../supabase/' + path, import.meta.url), 'utf8'));
    }
    const user = await one("insert into auth.users(email,email_confirmed_at) values('old@dummy.invalid',now()) returning id value");
    const other = await one("insert into auth.users(email,email_confirmed_at) values('live@dummy.invalid',now()) returning id value");
    for (const id of [user,other]) await one("select myops_provision_profile($1,'Test','personal') value", [id]);
    const create = (id, ref) => one("select myops_create_payment($1,'founders_lifetime',null,$2) value", [id,ref]);
    await create(user, 'MYOPS-sandboxorder1');
    const migration = readFileSync(new URL('../supabase/proposals/phase_live_toyyibpay.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration); // Safe replay, no order rewriting.
    assert.equal(await one("select gateway value from myops_payments where order_ref='MYOPS-sandboxorder1'"), 'toyyibpay_sandbox');
    assert.equal((await create(user, 'MYOPS-wouldmixorder')).status, 'gateway_mismatch');
    const created = await create(other, 'MYOPS-liveorder001');
    assert.equal(created.gateway, 'toyyibpay_live');
    assert.equal(created.amount_cents, 2900);
    assert.equal((await create(other, 'MYOPS-duplicate001')).gateway, 'toyyibpay_live');
    for (const role of ['anon','authenticated']) {
      assert.equal(await one("select has_function_privilege($1,'public.myops_create_payment(uuid,text,text,text,integer)','EXECUTE') value", [role]), false);
    }
    assert.equal(await one("select has_function_privilege('service_role','public.myops_create_payment(uuid,text,text,text,integer)','EXECUTE') value"), true);
  } finally { await db.close(); }
});
