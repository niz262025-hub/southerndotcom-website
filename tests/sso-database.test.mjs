import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

// Always-run SQL smoke coverage. Real multi-connection concurrency remains in founders-sql.test.mjs.
test('SSO SQL replay, ticket audience/replay, session revocation and client ACLs', async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  const one = async (query, params = []) => (await db.query(query, params)).rows[0]?.value;
  try {
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key default gen_random_uuid(),email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated,service_role;
      alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
    for (const path of ['migrations/202610160001_myops_identity_foundation.sql', 'proposals/phase3_founders_100.sql',
      'proposals/202610170001_myops_app_access.sql', 'proposals/202610170002_myops_login_sessions.sql']) {
      await db.exec(readFileSync(new URL(`../supabase/${path}`, import.meta.url), 'utf8'));
    }
    const user = await one("insert into auth.users(email,email_confirmed_at) values('sso@test.invalid',now()) returning id as value");
    const publicKey = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
    for (const app of ['opsfinance', 'opsflow']) {
      await db.query('insert into public.myops_app_clients(app_id,product_slug,public_key_current,enabled) values($1,$1,$2,true)', [app,publicKey]);
      await db.query("update public.myops_products set launch_status='live' where slug=$1", [app]);
    }
    await db.exec('set role service_role');
    const login = await one('select public.myops_login_start($1) as value', [user]);
    const hash = randomBytes(32).toString('hex');
    assert.equal((await one('select public.myops_issue_app_ticket($1,$2,$3,$4) as value',[user,'opsfinance',hash,login])).status,'issued');
    assert.equal((await one('select public.myops_redeem_app_ticket($1,$2) as value',['opsflow',hash])).status,'denied');
    const grant = await one('select public.myops_redeem_app_ticket($1,$2) as value',['opsfinance',hash]);
    assert.equal(grant.status,'redeemed');
    assert.equal((await one('select public.myops_redeem_app_ticket($1,$2) as value',['opsfinance',hash])).status,'denied');
    assert.equal((await one('select public.myops_validate_app_session($1,$2,$3) as value',[grant.session_id,'opsfinance','opsfinance'])).active,true);
    const expiredHash = randomBytes(32).toString('hex');
    await one('select public.myops_issue_app_ticket($1,$2,$3,$4) as value',[user,'opsfinance',expiredHash,login]);
    await db.query("update public.myops_app_tickets set created_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute' where ticket_hash=$1",[expiredHash]);
    assert.equal((await one('select public.myops_redeem_app_ticket($1,$2) as value',['opsfinance',expiredHash])).status,'denied');
    const nonce = randomBytes(32).toString('hex');
    assert.equal(await one('select public.myops_record_app_nonce($1,$2) as value',['opsfinance',nonce]),true);
    assert.equal(await one('select public.myops_record_app_nonce($1,$2) as value',['opsfinance',nonce]),false);
    await one('select public.myops_login_end($1,$2,$3) as value',[login,user,'logout']);
    assert.equal((await one('select public.myops_validate_app_session($1,$2,$3) as value',[grant.session_id,'opsfinance','opsfinance'])).active,false);
    assert.equal((await one('select public.myops_issue_app_ticket($1,$2,$3,$4) as value',[user,'opsfinance',randomBytes(32).toString('hex'),login])).status,'unavailable');
    for (const role of ['anon','authenticated']) {
      await db.exec(`reset role; set role ${role}`);
      await assert.rejects(db.query('select public.myops_redeem_app_ticket($1,$2)',['opsfinance',hash]), /permission denied/);
      await assert.rejects(db.query('select * from public.myops_app_tickets'), /permission denied/);
    }
  } finally {
    await db.close();
  }
});
