import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('private logo policy denies anon, foreign paths and other buckets, while owner can insert/read/delete',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`create role authenticated; create role anon; create schema storage; create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function storage.foldername(text) returns text[] language sql immutable as $$select array[split_part($1,'/',1)]$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id text primary key,bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema auth,storage to authenticated,anon;
 grant select,insert,delete on storage.objects to authenticated,anon;`);
 await db.exec(await readFile(new URL('../supabase/profile-proposals/profile_logos.sql',import.meta.url),'utf8'));
 const bucket=(await db.query("select * from storage.buckets")).rows[0];assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),262144);
 const owner='11111111-1111-4111-8111-111111111111',foreign='22222222-2222-4222-8222-222222222222';
 await db.query("insert into storage.objects values ('foreign','myops-profile-logos',$1),('other','other-bucket',$2)",[foreign+'/logo.png',owner+'/other.png']);
 await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 await assert.rejects(db.query("insert into storage.objects values ('bad','myops-profile-logos',$1)",[foreign+'/bad.png']));
 await assert.rejects(db.query("insert into storage.objects values ('bad','other-bucket',$1)",[owner+'/bad.png']));
 await db.query("insert into storage.objects values ('own','myops-profile-logos',$1)",[owner+'/logo.png']);
 assert.equal((await db.query('select * from storage.objects')).rows.length,1);
 assert.equal((await db.query("delete from storage.objects where id='foreign' returning id")).rows.length,0);
 assert.equal((await db.query("delete from storage.objects where id='own' returning id")).rows.length,1);
 await db.exec('reset role; set role anon');await db.query("select set_config('request.jwt.claim.sub','',false)");
 assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 await assert.rejects(db.query("insert into storage.objects values ('anon','myops-profile-logos',$1)",[owner+'/logo.png']));
 } finally { await db.close(); }
});
