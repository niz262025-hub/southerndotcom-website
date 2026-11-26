import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('administrator registry records changes, revokes access immediately and denies ordinary roles', async () => {
 const db=new PGlite();
 const user='00000000-0000-4000-8000-000000000001', actor='00000000-0000-4000-8000-000000000002';
 try {
  await db.exec('create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key)');
  await db.exec(await readFile(new URL('../supabase/proposals/opsrental_revocable_admin.sql',import.meta.url),'utf8'));
  await db.query('insert into auth.users values ($1),($2)',[user,actor]);
  await db.query("insert into public.myops_platform_administrators(user_id,status,changed_by) values ($1,'active',$2)",[user,actor]);
  assert.equal((await db.query('select status from public.myops_platform_administrators where user_id=$1',[user])).rows[0].status,'active');
  await db.query("update public.myops_platform_administrators set status='revoked' where user_id=$1",[user]);
  assert.equal((await db.query('select status from public.myops_platform_administrators where user_id=$1',[user])).rows[0].status,'revoked');
  assert.deepEqual((await db.query('select old_status,new_status from public.myops_platform_administrator_audit order by id')).rows,[{old_status:null,new_status:'active'},{old_status:'active',new_status:'revoked'}]);
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select * from public.myops_platform_administrators'),/permission denied/);
  await assert.rejects(db.query("update public.myops_platform_administrators set status='active'"),/permission denied/);
 } finally { await db.close(); }
});
